const express = require('express');
const path = require('path');
const multer = require('multer');
const { pinata, getGatewayUrl, computeSha256 } = require('../config/pinata');
const { requireAuth } = require('../middleware/auth');
const {
  issueCertificateOnChain,
  verifyCertificateOnChain,
  revokeCertificateOnChain,
} = require('../config/blockchain');
const {
  createPendingCertificate,
  getPendingCertificate,
  updatePendingCertificate,
  saveFinalizedCertificate,
} = require('../services/pendingCertificateService');
const { supabase } = require('../config/supabase');
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
 * Institution staff member uploads a certificate, fills in student + degree details,
 * and creates a pending_certificates row with status = 'pending_approval'.
 * Enforces created_by = req.user.id.
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

    // Required fields check
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

    // If a file was uploaded in this request, process and upload to Pinata
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

    // Create pending_certificates row with status = pending_approval
    // Enforce that created_by is the authenticated user
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
 * A different staff member at the same institution approves the pending certificate.
 * Multi-sig enforcement: Reject if approved_by === created_by.
 * On approval:
 *  1. Mark status = 'approved'
 *  2. Call issueCertificate on CertificateRegistry via backend Ethers.js signer
 *  3. On success: status = 'issued', save on_chain_tx_hash, insert into public.certificates
 *  4. On failure: status = 'failed', save error_reason
 */
router.post('/:id/approve', requireAuth, async (req, res) => {
  const { id } = req.params;
  const approvedBy = req.user.id;

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
    // Reject if approved_by would equal created_by
    if (pendingCert.created_by === approvedBy) {
      return res.status(400).json({
        error: 'Multi-sig rejection: The staff member who initiated the certificate cannot approve it. A different staff member must approve.',
      });
    }

    // Step 1: Mark status = approved before sending on-chain transaction
    await updatePendingCertificate(pendingCert.id, {
      status: 'approved',
      approved_by: approvedBy,
    });

    // Step 2: Call issueCertificate on-chain using backend's Ethers.js signer
    try {
      const txResult = await issueCertificateOnChain(
        pendingCert.credential_id,
        pendingCert.institution_id,
        pendingCert.ipfs_cid
      );

      // Step 3: Transaction confirmed -> update status = issued
      const issuedCert = await updatePendingCertificate(pendingCert.id, {
        status: 'issued',
        approved_by: approvedBy,
        on_chain_tx_hash: txResult.txHash,
      });

      // Step 4: Insert finalized row into the main certificates table
      let finalizedDbRow = null;
      try {
        finalizedDbRow = await saveFinalizedCertificate(pendingCert, txResult.txHash);
      } catch (dbErr) {
        console.warn('Warning: Finalized certificate inserted on-chain, but failed to mirror into DB:', dbErr.message);
      }

      // Step 5: Check issuance anomaly monitoring threshold (non-blocking)
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
      console.error('On-chain transaction failed:', chainErr);

      // Mark row as failed with error reason
      await updatePendingCertificate(pendingCert.id, {
        status: 'failed',
        error_reason: chainErr.message,
      });

      return res.status(500).json({
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
 * Public endpoint, no login required.
 * Rate limited to 30 requests/minute per IP.
 * Calls verifyCertificate() on-chain (read-only, free).
 * Returns IPFS hash, revoked status, institution ID, and live current accreditation status.
 */
router.get('/verify/:credentialId', verifyLimiter, async (req, res) => {
  const { credentialId } = req.params;

  try {
    const chainData = await verifyCertificateOnChain(credentialId);
    const gatewayUrl = getGatewayUrl(chainData.ipfsHash);

    // Look up certificate metadata from Supabase
    let degreeName = null;
    let issueDate = null;
    let studentName = null;
    let institutionName = null;

    try {
      const { data: dbCert } = await supabase
        .from('certificates')
        .select('degree_name, issue_date, students(full_name), institutions(name)')
        .eq('credential_id', credentialId)
        .maybeSingle();

      if (dbCert) {
        degreeName = dbCert.degree_name || null;
        issueDate = dbCert.issue_date || null;
        studentName = dbCert.students?.full_name || null;
        institutionName = dbCert.institutions?.name || null;
      }
    } catch (dbErr) {
      console.warn('Warning: Could not fetch certificate metadata from DB:', dbErr.message);
    }

    // Fallback: if institutionName not found in join, query institutions by chainData.institutionId
    if (!institutionName && chainData.institutionId) {
      try {
        const { data: inst } = await supabase
          .from('institutions')
          .select('name')
          .eq('id', chainData.institutionId)
          .maybeSingle();
        if (inst?.name) institutionName = inst.name;
      } catch (e) {}
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
    });
  } catch (error) {
    const errorMsg = error.message || '';
    if (errorMsg.includes('Certificate does not exist')) {
      return res.status(404).json({
        success: false,
        error: 'Certificate not found on-chain.',
        credentialId,
      });
    }

    console.error('Error verifying certificate on-chain:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify certificate on-chain',
      details: error.message,
    });
  }
});

/**
 * POST /api/certificates/verify-log
 * Logs a company verification attempt into the verification_logs table.
 * Captures verifier, credential, result, timestamp, client IP, and user-agent.
 */
router.post('/verify-log', async (req, res) => {
  const { credential_id, result, company_user_id } = req.body;
  const { supabase } = require('../config/supabase');

  const clientIp =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  try {
    let userId = company_user_id;
    if (!userId) {
      // Find or fallback to company user
      const { data: companyUser } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'company')
        .limit(1)
        .maybeSingle();

      userId = companyUser?.id || '75385b9a-534e-4031-b80a-f19b86ce142c';
    }

    // Attempt insert with complete audit trail telemetry
    let logPayload = {
      company_user_id: userId,
      credential_id: credential_id || 'UNKNOWN',
      result: result || 'VALID',
      timestamp: new Date().toISOString(),
      ip_address: clientIp,
      user_agent: userAgent,
    };

    let { data: logEntry, error } = await supabase
      .from('verification_logs')
      .insert(logPayload)
      .select()
      .maybeSingle();

    if (error && error.message && error.message.includes('column')) {
      // Fallback if schema migration hasn't added ip_address / user_agent yet
      delete logPayload.ip_address;
      delete logPayload.user_agent;
      const fallback = await supabase
        .from('verification_logs')
        .insert(logPayload)
        .select()
        .maybeSingle();
      logEntry = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.warn('Could not insert into verification_logs:', error.message);
      return res.status(200).json({ success: false, error: error.message });
    }

    return res.status(201).json({
      success: true,
      log: {
        ...logEntry,
        ip_address: logEntry?.ip_address || clientIp,
        user_agent: logEntry?.user_agent || userAgent,
      },
    });
  } catch (err) {
    console.warn('Verification log error:', err.message);
    return res.status(200).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/certificates/verify-logs
 * Retrieves recent verification logs for company audit trail.
 */
router.get('/verify-logs', async (req, res) => {
  const { supabase } = require('../config/supabase');
  try {
    const { data: logs, error } = await supabase
      .from('verification_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(20);

    if (error) {
      return res.status(200).json({ success: true, logs: [] });
    }

    return res.status(200).json({ success: true, logs: logs || [] });
  } catch (err) {
    return res.status(200).json({ success: true, logs: [] });
  }
});

/**
 * POST /api/certificates/:id/revoke
 * Revokes a certificate on-chain and updates Supabase.
 */
router.post('/:id/revoke', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    // Look up certificate by id or credential_id
    let { data: cert, error: certErr } = await supabase
      .from('certificates')
      .select('*')
      .or(`id.eq.${id},credential_id.eq.${id}`)
      .maybeSingle();

    if (certErr || !cert) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    if (cert.revoked) {
      return res.status(400).json({ error: 'Certificate is already revoked' });
    }

    // Revoke on-chain
    const txResult = await revokeCertificateOnChain(cert.credential_id);

    // Update Supabase
    let updatedCert = null;
    try {
      const { data: uCert, error: updateErr } = await supabase
        .from('certificates')
        .update({
          revoked: true,
        })
        .eq('id', cert.id)
        .select()
        .single();

      if (updateErr) {
        console.warn('Warning updating Supabase revoked state:', updateErr.message);
      } else {
        updatedCert = uCert;
      }
    } catch (e) {
      console.warn('Exception updating Supabase revoked state:', e.message);
    }

    return res.status(200).json({
      success: true,
      message: `Certificate ${cert.credential_id} revoked successfully on-chain.`,
      txHash: txResult.txHash,
      certificate: updatedCert || { ...cert, revoked: true },
    });
  } catch (err) {
    console.error('Error revoking certificate:', err);
    return res.status(500).json({
      error: 'Failed to revoke certificate',
      details: err.message,
    });
  }
});

module.exports = router;
