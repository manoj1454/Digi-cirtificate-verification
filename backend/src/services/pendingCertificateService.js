const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/database');

const dataDir = path.resolve(__dirname, '../../data');
const fallbackFile = path.join(dataDir, 'pending_certificates.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readFallback() {
  ensureDataDir();
  if (!fs.existsSync(fallbackFile)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(fallbackFile, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function writeFallback(records) {
  ensureDataDir();
  fs.writeFileSync(fallbackFile, JSON.stringify(records, null, 2), 'utf-8');
}

/**
 * Inserts a new pending certificate into Neon PostgreSQL.
 * If running in a development environment without DATABASE_URL, uses explicit fallback.
 * In production, Neon is strictly authoritative and failures are NOT masked.
 */
async function createPendingCertificate(data) {
  const id = data.id || crypto.randomUUID();
  const issueDate = data.issue_date || new Date().toISOString().split('T')[0];

  if (db.isConfigured) {
    try {
      const result = await db.query(
        `INSERT INTO pending_certificates (
          id, institution_id, student_id, credential_id, ipfs_cid, sha256_hash,
          degree_name, issue_date, created_by, approved_by, status, on_chain_tx_hash,
          error_reason, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, 'pending_approval', NULL, NULL, NOW()
        ) RETURNING *`,
        [
          id,
          data.institution_id,
          data.student_id,
          data.credential_id,
          data.ipfs_cid,
          data.sha256_hash,
          data.degree_name,
          issueDate,
          data.created_by,
        ]
      );
      return result.rows[0];
    } catch (err) {
      // PostgreSQL unique constraint violation
      if (err.code === '23505') {
        const dupErr = new Error(`Credential ID '${data.credential_id}' already exists.`);
        dupErr.status = 400;
        throw dupErr;
      }
      if (process.env.NODE_ENV === 'production') {
        throw err;
      }
      console.warn('[PendingCertService] Neon insert warning in non-production:', err.message);
    }
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is not configured in production environment.');
  }

  // Development Fallback storage
  const record = {
    id,
    institution_id: data.institution_id,
    student_id: data.student_id,
    credential_id: data.credential_id,
    ipfs_cid: data.ipfs_cid,
    sha256_hash: data.sha256_hash,
    degree_name: data.degree_name,
    issue_date: issueDate,
    created_by: data.created_by,
    approved_by: null,
    status: 'pending_approval',
    on_chain_tx_hash: null,
    error_reason: null,
    created_at: new Date().toISOString(),
  };

  const records = readFallback();
  if (records.some((r) => r.credential_id === record.credential_id)) {
    const dupErr = new Error(`Credential ID '${record.credential_id}' already exists.`);
    dupErr.status = 400;
    throw dupErr;
  }
  records.push(record);
  writeFallback(records);
  return record;
}

/**
 * Retrieves a pending certificate by its UUID or credential_id.
 */
async function getPendingCertificate(idOrCredentialId) {
  if (db.isConfigured) {
    try {
      const result = await db.query(
        `SELECT * FROM pending_certificates
         WHERE id::text = $1 OR credential_id = $1
         LIMIT 1`,
        [idOrCredentialId]
      );
      if (result.rows.length > 0) {
        return result.rows[0];
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        throw err;
      }
    }
  }

  // Non-production fallback check
  const records = readFallback();
  return (
    records.find((r) => r.id === idOrCredentialId || r.credential_id === idOrCredentialId) || null
  );
}

/**
 * Updates a pending certificate record.
 */
async function updatePendingCertificate(id, updates) {
  let updatedRecord = null;

  if (db.isConfigured) {
    try {
      // Build dynamic parameterized update
      const fields = [];
      const values = [id];
      let paramIndex = 2;

      for (const [key, val] of Object.entries(updates)) {
        if (['status', 'approved_by', 'on_chain_tx_hash', 'error_reason'].includes(key)) {
          fields.push(`${key} = $${paramIndex}`);
          values.push(val);
          paramIndex++;
        }
      }

      if (fields.length > 0) {
        const queryText = `UPDATE pending_certificates
          SET ${fields.join(', ')}
          WHERE id::text = $1 OR credential_id = $1
          RETURNING *`;
        const result = await db.query(queryText, values);
        if (result.rows.length > 0) {
          updatedRecord = result.rows[0];
          return updatedRecord;
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        throw err;
      }
      console.warn('[PendingCertService] Error updating pending certificate in Neon:', err.message);
    }
  }

  // Development Fallback storage
  const records = readFallback();
  const index = records.findIndex((r) => r.id === id || r.credential_id === id);
  if (index !== -1) {
    records[index] = { ...records[index], ...updates };
    writeFallback(records);
    if (!updatedRecord) {
      updatedRecord = records[index];
    }
  }

  return updatedRecord;
}

/**
 * Inserts the finalized certificate into the main certificates table in Neon.
 * Handles duplicate credential ID gracefully via ON CONFLICT to prevent duplicates on retry.
 */
async function saveFinalizedCertificate(pendingCert, txHash) {
  if (db.isConfigured) {
    try {
      const result = await db.query(
        `INSERT INTO certificates (
          credential_id, student_id, institution_id, ipfs_hash,
          on_chain_tx_hash, degree_name, issue_date, revoked, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, false, NOW()
        )
        ON CONFLICT (credential_id) DO UPDATE SET
          on_chain_tx_hash = EXCLUDED.on_chain_tx_hash,
          ipfs_hash = EXCLUDED.ipfs_hash
        RETURNING *`,
        [
          pendingCert.credential_id,
          pendingCert.student_id,
          pendingCert.institution_id,
          pendingCert.ipfs_cid,
          txHash,
          pendingCert.degree_name,
          pendingCert.issue_date,
        ]
      );
      return result.rows[0];
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        throw err;
      }
      console.warn('[PendingCertService] Neon insert warning in non-production:', err.message);
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is not configured for certificate finalization.');
  }

  return {
    credential_id: pendingCert.credential_id,
    student_id: pendingCert.student_id,
    institution_id: pendingCert.institution_id,
    ipfs_hash: pendingCert.ipfs_cid,
    on_chain_tx_hash: txHash,
    degree_name: pendingCert.degree_name,
    issue_date: pendingCert.issue_date,
    revoked: false,
  };
}

module.exports = {
  createPendingCertificate,
  getPendingCertificate,
  updatePendingCertificate,
  saveFinalizedCertificate,
};
