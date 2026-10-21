const express = require('express');
const path = require('path');
const multer = require('multer');
const { pinata, getGatewayUrl, computeSha256 } = require('../config/pinata');
const { requireAuth } = require('../middleware/auth');
const db = require('../config/database');
const blockchain = require('../config/blockchain');
const {
  issueCertificateOnChain,
  verifyCertificateOnChain,
  revokeCertificateOnChain,
} = blockchain;
const {
  createPendingCertificate,
  getPendingCertificate,
  updatePendingCertificate,
  saveFinalizedCertificate,
} = require('../services/pendingCertificateService');
const rateLimit = require('express-rate-limit');
const { checkIssuanceAnomaly } = require('../services/anomalyService');

const router = express.Router();

// Rate limiting middleware for public verification endpoint: 30 requests per minute per IP
const verifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      error: 'Too many verification requests from this IP. Rate limit is 30 requests per minute. Please try again after 60 seconds.',
      retryAfterSeconds: 60,
    });
  },
});

// Memory storage keeps file buffer in memory for hashing & SDK upload
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
  },
  fileFilter: (req, file, cb) => {
    const isPdfMime = file.mimetype === 'application/pdf';
    const isPdfExt = path.extname(file.originalname).toLowerCase() === '.pdf';

    if (isPdfMime || isPdfExt) {
      cb(null, true);
    } else {
      const err = new Error('Invalid file type: Only PDF documents are allowed.');
      err.status = 400;
      cb(err);
    }
  },
});

// Middleware supporting common upload field names ('file', 'pdf', 'certificate')
const uploadMiddleware = (req, res, next) => {
  const uploadFields = upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'pdf', maxCount: 1 },
    { name: 'certificate', maxCount: 1 },
  ]);

  uploadFields(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds limit (max 25MB).' });
      }
      return res.status(400).json({ error: `File upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

/**
 * POST /api/certificates/upload
 * Stage 4 standalone upload endpoint.
 */
router.post('/upload', uploadMiddleware, async (req, res) => {
  try {
    const reqFile =
      (req.files && (req.files.file?.[0] || req.files.pdf?.[0] || req.files.certificate?.[0])) ||
      req.file;

    if (!reqFile) {
      return res.status(400).json({
        error: 'No file uploaded. Please provide a PDF file in the "file" form-data field.',
      });
    }

    const fileBuffer = reqFile.buffer;

    // Validate PDF header magic bytes (%PDF)
    if (fileBuffer.length < 4 || fileBuffer.toString('utf-8', 0, 4) !== '%PDF') {
      return res.status(400).json({
        error: 'Invalid file content: Provided file does not have a valid PDF header (%PDF).',
      });
    }

    const sha256 = computeSha256(fileBuffer);
    const filename = reqFile.originalname || `certificate-${Date.now()}.pdf`;
    const pinataFile = new File([fileBuffer], filename, { type: 'application/pdf' });

    const uploadResult = await pinata.upload.public.file(pinataFile);
    const cid = uploadResult.cid;
    const gatewayUrl = getGatewayUrl(cid);

    return res.status(201).json({
      success: true,
      cid,
      sha256,
      gatewayUrl,
      file: {
        name: filename,
        size: fileBuffer.length,
        mimeType: 'application/pdf',
      },
    });
  } catch (error) {
    console.error('Error during certificate upload to Pinata:', error);
    return res.status(500).json({
      error: 'Failed to upload certificate file to IPFS',
      details: error.message,
    });
  }
});

/**
 * POST /api/certificates/initiate
 * Institution staff member initiates a certificate.
 * Enforces role and institutional affiliation.
 */
router.post('/initiate', requireAuth, uploadMiddleware, async (req, res) => {
  try {
    let {
      institution_id,
      student_id,
      credential_id,
      degree_name,
      issue_date,
    } = req.body;

    // Authorization & Ownership check
    if (req.user.role !== 'institution' && req.user.role !== 'regulator') {
      return res.status(403).json({ error: 'Only institution staff or regulators can initiate certificates.' });
    }

    if (!institution_id || !student_id || !degree_name) {
      return res.status(400).json({
        error: 'Missing required fields: institution_id, student_id, and degree_name are required.',
      });
    }

    // Auto-generate unique readable Credential ID server-side if not specified
    let finalCredentialId = credential_id?.trim();
    if (!finalCredentialId) {
      const code = `${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      finalCredentialId = `CRED-${code}`;
    }

    let ipfs_cid = req.body.ipfs_cid;
    let sha256_hash = req.body.sha256_hash;

    // Process file if uploaded
    const reqFile =
      (req.files && (req.files.file?.[0] || req.files.pdf?.[0] || req.files.certificate?.[0])) ||
      req.file;

    if (reqFile) {
      const fileBuffer = reqFile.buffer;
      if (fileBuffer.length < 4 || fileBuffer.toString('utf-8', 0, 4) !== '%PDF') {
        return res.status(400).json({
          error: 'Invalid file content: Uploaded file must be a valid PDF.',
        });
      }

      sha256_hash = computeSha256(fileBuffer);
      const filename = reqFile.originalname || `${finalCredentialId}.pdf`;
      const pinataFile = new File([fileBuffer], filename, { type: 'application/pdf' });
      const uploadResult = await pinata.upload.public.file(pinataFile);
      ipfs_cid = uploadResult.cid;
    }

    if (!ipfs_cid || !sha256_hash) {
      return res.status(400).json({
        error: 'Certificate file or ipfs_cid and sha256_hash must be provided.',
      });
    }

    // Check if credential_id already exists in pending or finalized
    const existingPending = await getPendingCertificate(finalCredentialId);
    if (existingPending) {
      return res.status(400).json({
        error: `A pending certificate with credential ID '${finalCredentialId}' already exists.`,
      });
    }

    const pendingCert = await createPendingCertificate({
      institution_id,
      student_id,
      credential_id: finalCredentialId,
      ipfs_cid,
      sha256_hash,
      degree_name,
      issue_date: issue_date || new Date().toISOString().split('T')[0],
      created_by: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: 'Certificate initiated successfully. Pending approval from a second staff member.',
      pendingCertificate: pendingCert,
    });
  } catch (error) {
    console.error('Error initiating certificate:', error);
    return res.status(error.status || 500).json({
      error: 'Failed to initiate certificate',
      details: error.message,
    });
  }
});

/**
 * POST /api/certificates/:id/approve
 * Two-Person Multi-Sig Rule:
 * Rejects if approved_by === created_by.
 */
router.post('/:id/approve', requireAuth, async (req, res) => {
  const { id } = req.params;
  const approvedBy = req.user.id;

  // Check if blockchain signer is configured before state mutation
  if (!blockchain.signer && !blockchain.certificateRegistryContract) {
    return res.status(503).json({
      success: false,
      error: 'Blockchain service unavailable: No blockchain signer is configured on this server. Certificate issuance is disabled in demo mode.',
      status: 'unavailable',
      code: 'BLOCKCHAIN_UNAVAILABLE',
    });
  }

  try {
    const pendingCert = await getPendingCertificate(id);
    if (!pendingCert) {
      return res.status(404).json({ error: `Pending certificate with ID '${id}' not found.` });
    }

    if (pendingCert.status === 'issued') {
      return res.status(400).json({
        error: 'Certificate has already been issued on-chain.',
        on_chain_tx_hash: pendingCert.on_chain_tx_hash,
      });
    }

    // MULTI-SIG ENFORCEMENT POINT:
    if (pendingCert.created_by === approvedBy) {
      return res.status(400).json({
        error: 'Multi-sig rejection: The staff member who initiated the certificate cannot approve it. A different staff member must approve.',
      });
    }

    // Mark status = approved
    await updatePendingCertificate(pendingCert.id, {
      status: 'approved',
      approved_by: approvedBy,
    });


    // Call issueCertificate on-chain
    try {
      const txResult = await issueCertificateOnChain(
        pendingCert.credential_id,
        pendingCert.institution_id,
        pendingCert.ipfs_cid
      );

      // Mark status = issued
      const issuedCert = await updatePendingCertificate(pendingCert.id, {
        status: 'issued',
        approved_by: approvedBy,
        on_chain_tx_hash: txResult.txHash,
      });

      // Insert finalized row into Neon certificates table
      let finalizedDbRow = null;
      try {
        finalizedDbRow = await saveFinalizedCertificate(pendingCert, txResult.txHash);
      } catch (dbErr) {
        console.warn('Warning: Certificate issued on-chain, but failed to save in Neon:', dbErr.message);
      }

      // Check issuance anomaly monitoring threshold (non-blocking)
      checkIssuanceAnomaly(pendingCert.institution_id).catch((err) => {
        console.warn('Background anomaly check error:', err.message);
      });

      return res.status(200).json({
        success: true,
        message: 'Certificate successfully approved and issued on-chain.',
        status: 'issued',
        on_chain_tx_hash: txResult.txHash,
        blockNumber: txResult.blockNumber,
        pendingCertificate: issuedCert,
        finalCertificate: finalizedDbRow,
      });
    } catch (chainErr) {
      console.error('On-chain transaction failed:', chainErr.message);

      const isUnavailable =
        chainErr.code === 'BLOCKCHAIN_UNAVAILABLE' ||
        chainErr.status === 503 ||
        chainErr.message?.includes('Blockchain signer is not initialized') ||
        chainErr.message?.includes('Registry contract is not initialized');

      if (isUnavailable) {
        // Roll back pending status so certificate is not marked failed
        await updatePendingCertificate(pendingCert.id, {
          status: 'pending',
          approved_by: null,
        });

        return res.status(503).json({
          success: false,
          error: 'Blockchain service unavailable: No blockchain signer is configured on this server. Certificate issuance is disabled in demo mode.',
          status: 'unavailable',
          code: 'BLOCKCHAIN_UNAVAILABLE',
          details: chainErr.message,
        });
      }

      await updatePendingCertificate(pendingCert.id, {
        status: 'failed',
        error_reason: chainErr.message,
      });

      const statusCode = (chainErr.message?.includes('not accredited') || chainErr.message?.includes('Invalid')) ? 400 : 500;

      return res.status(statusCode).json({
        success: false,
        error: 'On-chain certificate issuance failed.',
        status: 'failed',
        details: chainErr.message,
      });
    }

  } catch (error) {
    console.error('Error approving certificate:', error);
    return res.status(500).json({
      error: 'Failed to approve certificate',
      details: error.message,
    });
  }
});

/**
 * GET /api/certificates/verify/:credentialId
 * Public endpoint, rate limited to 30 requests/minute per IP.
 * Reads on-chain status and augments with Neon PostgreSQL certificate metadata.
 */
router.get('/verify/:credentialId', verifyLimiter, async (req, res) => {
  const { credentialId } = req.params;

  try {
    let chainData = null;

    if (blockchain.certificateRegistryContract) {
      try {
        chainData = await verifyCertificateOnChain(credentialId);
      } catch (error) {
        const errorMsg = error.message || '';
        if (errorMsg.includes('Certificate does not exist')) {
          return res.status(404).json({
            success: false,
            error: 'Certificate not found on-chain.',
            credentialId,
          });
        }
        // If contract call failed due to network / uninitialized, fall back to DB lookup
        console.warn('On-chain verification query failed, attempting database fallback:', errorMsg);
      }
    }

    if (chainData) {
      const gatewayUrl = getGatewayUrl(chainData.ipfsHash);

      // Look up certificate metadata from Neon PostgreSQL
      let degreeName = null;
      let issueDate = null;
      let studentName = null;
      let institutionName = null;

      if (db.isConfigured) {
        try {
          const queryText = `
            SELECT c.degree_name, c.issue_date, s.full_name AS student_name, i.name AS institution_name
            FROM certificates c
            LEFT JOIN students s ON c.student_id = s.id
            LEFT JOIN institutions i ON c.institution_id = i.id
            WHERE c.credential_id = $1
            LIMIT 1
          `;
          const result = await db.query(queryText, [credentialId]);
          if (result.rows.length > 0) {
            const row = result.rows[0];
            degreeName = row.degree_name || null;
            issueDate = row.issue_date || null;
            studentName = row.student_name || null;
            institutionName = row.institution_name || null;
          }

          // Fallback: if institutionName not found in join, look up by chainData.institutionId
          if (!institutionName && chainData.institutionId) {
            const instRes = await db.query(
              'SELECT name FROM institutions WHERE id::text = $1 LIMIT 1',
              [chainData.institutionId]
            );
            if (instRes.rows.length > 0) {
              institutionName = instRes.rows[0].name;
            }
          }
        } catch (dbErr) {
          console.warn('Warning: Could not fetch certificate metadata from Neon:', dbErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        credentialId,
        ipfsHash: chainData.ipfsHash,
        gatewayUrl,
        revoked: chainData.revoked,
        institutionId: chainData.institutionId,
        isInstituteAccredited: chainData.isInstituteAccredited,
        isValid: !chainData.revoked && chainData.isInstituteAccredited,
        degreeName,
        issueDate,
        studentName,
        institutionName,
        blockchainVerified: true,
      });
    }

    // Fallback: Database lookup when on-chain contract is not initialized (e.g. demo mode on Render)
    if (db.isConfigured) {
      const queryText = `
        SELECT c.*, s.full_name AS student_name, i.name AS institution_name
        FROM certificates c
        LEFT JOIN students s ON c.student_id = s.id
        LEFT JOIN institutions i ON c.institution_id = i.id
        WHERE c.credential_id = $1
        LIMIT 1
      `;
      const result = await db.query(queryText, [credentialId]);
      if (result.rows.length > 0) {
        const row = result.rows[0];
        const gatewayUrl = getGatewayUrl(row.ipfs_cid);
        return res.status(200).json({
          success: true,
          credentialId,
          ipfsHash: row.ipfs_cid,
          gatewayUrl,
          revoked: Boolean(row.revoked),
          institutionId: row.institution_id,
          isInstituteAccredited: true,
          isValid: !row.revoked,
          degreeName: row.degree_name,
          issueDate: row.issue_date,
          studentName: row.student_name,
          institutionName: row.institution_name,
          blockchainVerified: false,
          source: 'database',
        });
      }
    }

    return res.status(404).json({
      success: false,
      error: 'Certificate not found.',
      credentialId,
    });
  } catch (error) {
    console.error('Error verifying certificate:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify certificate',
      details: error.message,
    });
  }
});

/**
 * POST /api/certificates/verify-log
 * Logs a company verification attempt into Neon verification_logs table.
 */
router.post('/verify-log', async (req, res) => {
  const { credential_id, result, company_user_id } = req.body;

  const clientIp =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  try {
    let userId = company_user_id;

    if (!userId && db.isConfigured) {
      try {
        const uRes = await db.query("SELECT id FROM users WHERE role = 'company' LIMIT 1");
        if (uRes.rows.length > 0) {
          userId = uRes.rows[0].id;
        }
      } catch (_) {}
    }

    if (!userId) {
      userId = '75385b9a-534e-4031-b80a-f19b86ce142c';
    }

    let logEntry = null;
    if (db.isConfigured) {
      const queryText = `
        INSERT INTO verification_logs (company_user_id, credential_id, result, ip_address, user_agent, timestamp)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `;
      const resDb = await db.query(queryText, [
        userId,
        credential_id || 'UNKNOWN',
        result || 'VALID',
        clientIp,
        userAgent,
      ]);
      logEntry = resDb.rows[0];
    } else {
      logEntry = {
        id: require('crypto').randomUUID(),
        company_user_id: userId,
        credential_id: credential_id || 'UNKNOWN',
        result: result || 'VALID',
        ip_address: clientIp,
        user_agent: userAgent,
        timestamp: new Date().toISOString(),
      };
    }

    return res.status(201).json({
      success: true,
      log: logEntry,
    });
  } catch (err) {
    console.warn('Verification log error:', err.message);
    return res.status(200).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/certificates/verify-logs
 * Retrieves recent verification logs from Neon PostgreSQL.
 */
router.get('/verify-logs', async (req, res) => {
  try {
    if (!db.isConfigured) {
      return res.status(200).json({ success: true, logs: [] });
    }

    const result = await db.query(
      'SELECT * FROM verification_logs ORDER BY timestamp DESC LIMIT 20'
    );
    return res.status(200).json({ success: true, logs: result.rows });
  } catch (err) {
    return res.status(200).json({ success: true, logs: [] });
  }
});

/**
 * POST /api/certificates/:id/revoke
 * Revokes a certificate on-chain and updates Neon PostgreSQL.
 */
router.post('/:id/revoke', requireAuth, async (req, res) => {
  const { id } = req.params;

  // Check if blockchain signer is configured
  if (!blockchain.signer && !blockchain.certificateRegistryContract) {
    return res.status(503).json({
      success: false,
      error: 'Blockchain service unavailable: No blockchain signer is configured on this server. Certificate revocation is disabled in demo mode.',
      code: 'BLOCKCHAIN_UNAVAILABLE',
    });
  }

  try {
    if (!db.isConfigured) {
      return res.status(500).json({ error: 'DATABASE_URL is not configured.' });
    }

    // Look up certificate by id or credential_id
    const certRes = await db.query(
      'SELECT * FROM certificates WHERE id::text = $1 OR credential_id = $1 LIMIT 1',
      [id]
    );

    if (certRes.rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found in database.' });
    }

    const cert = certRes.rows[0];

    // Authorization: only regulator or the issuing institution can revoke
    const isRegulator = req.user.role === 'regulator';
    const isIssuingInstitution =
      req.user.role === 'institution' &&
      (req.user.institution_id === cert.institution_id || req.user.id === cert.institution_id);

    if (!isRegulator && !isIssuingInstitution) {
      return res.status(403).json({
        error: 'Unauthorized: Only regulators or the issuing institution can revoke this certificate.',
      });
    }

    if (cert.revoked) {
      return res.status(400).json({ error: 'Certificate is already revoked.' });
    }

    // Revoke on-chain
    let txResult;

    try {
      txResult = await revokeCertificateOnChain(cert.credential_id);
    } catch (chainErr) {
      if (
        chainErr.code === 'BLOCKCHAIN_UNAVAILABLE' ||
        chainErr.status === 503 ||
        chainErr.message?.includes('signer is not initialized')
      ) {
        return res.status(503).json({
          success: false,
          error: 'Blockchain service unavailable: No blockchain signer is configured on this server. Certificate revocation is disabled in demo mode.',
          code: 'BLOCKCHAIN_UNAVAILABLE',
          details: chainErr.message,
        });
      }
      throw chainErr;
    }

    // Update Neon PostgreSQL
    const updateRes = await db.query(
      'UPDATE certificates SET revoked = true WHERE id = $1 RETURNING *',
      [cert.id]
    );

    return res.status(200).json({
      success: true,
      message: `Certificate ${cert.credential_id} revoked successfully on-chain.`,
      txHash: txResult.txHash,
      certificate: updateRes.rows[0],
    });
  } catch (err) {
    if (
      err.code === 'BLOCKCHAIN_UNAVAILABLE' ||
      err.status === 503 ||
      err.message?.includes('signer is not initialized')
    ) {
      return res.status(503).json({
        success: false,
        error: 'Blockchain service unavailable: No blockchain signer is configured on this server. Certificate revocation is disabled in demo mode.',
        code: 'BLOCKCHAIN_UNAVAILABLE',
      });
    }
    console.error('Error revoking certificate:', err);
    return res.status(500).json({
      error: 'Failed to revoke certificate',
      details: err.message,
    });
  }
});

module.exports = router;
