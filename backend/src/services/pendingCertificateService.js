const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { supabase } = require('../config/supabase');

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
 * Inserts a new pending certificate into Supabase, falling back to local storage
 * if public.pending_certificates has not been created yet in the SQL editor.
 */
async function createPendingCertificate(data) {
  const id = data.id || crypto.randomUUID();
  const record = {
    id,
    institution_id: data.institution_id,
    student_id: data.student_id,
    credential_id: data.credential_id,
    ipfs_cid: data.ipfs_cid,
    sha256_hash: data.sha256_hash,
    degree_name: data.degree_name,
    issue_date: data.issue_date || new Date().toISOString().split('T')[0],
    created_by: data.created_by,
    approved_by: null,
    status: 'pending_approval',
    on_chain_tx_hash: null,
    error_reason: null,
    created_at: new Date().toISOString(),
  };

  try {
    const { data: dbData, error } = await supabase
      .from('pending_certificates')
      .insert(record)
      .select()
      .single();

    if (!error && dbData) {
      return dbData;
    }

    if (error && error.code === 'PGRST205') {
      console.warn(
        '[PendingCertService] Table public.pending_certificates not found in Supabase schema cache. Using fallback storage.'
      );
    } else if (error) {
      console.warn('[PendingCertService] Supabase insert warning:', error.message);
    }
  } catch (err) {
    console.warn('[PendingCertService] Supabase connection error:', err.message);
  }

  // Local fallback storage
  const records = readFallback();
  // Ensure credential_id uniqueness
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
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrCredentialId
    );

    const query = supabase.from('pending_certificates').select('*');
    if (isUuid) {
      query.or(`id.eq.${idOrCredentialId},credential_id.eq.${idOrCredentialId}`);
    } else {
      query.eq('credential_id', idOrCredentialId);
    }

    const { data, error } = await query.maybeSingle();
    if (!error && data) {
      return data;
    }
  } catch (err) {
    // Ignore and check fallback
  }

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

  try {
    const { data, error } = await supabase
      .from('pending_certificates')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (!error && data) {
      updatedRecord = data;
    }
  } catch (err) {
    // Ignore and update fallback
  }

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
 * Inserts the finalized certificate into the main public.certificates table.
 */
async function saveFinalizedCertificate(pendingCert, txHash) {
  const certRow = {
    credential_id: pendingCert.credential_id,
    student_id: pendingCert.student_id,
    institution_id: pendingCert.institution_id,
    ipfs_hash: pendingCert.ipfs_cid,
    on_chain_tx_hash: txHash,
    degree_name: pendingCert.degree_name,
    issue_date: pendingCert.issue_date,
    revoked: false,
  };

  const { data, error } = await supabase.from('certificates').insert(certRow).select().maybeSingle();

  if (error) {
    console.error('[PendingCertService] Error inserting finalized certificate into public.certificates:', error);
    throw error;
  }

  return data;
}

module.exports = {
  createPendingCertificate,
  getPendingCertificate,
  updatePendingCertificate,
  saveFinalizedCertificate,
};
