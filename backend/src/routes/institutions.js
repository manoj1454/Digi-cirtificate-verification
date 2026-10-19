const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const db = require('../config/database');
const { supabase } = require('../config/supabase');
const {
  addInstitutionOnChain,
  updateAccreditationStatusOnChain,
  isInstitutionAccreditedOnChain,
  verifyCertificateOnChain,
} = require('../config/blockchain');
const { getGatewayUrl } = require('../config/pinata');
const { getAnomalyFlags } = require('../services/anomalyService');

const router = express.Router();

/**
 * GET /api/institutions
 * List all institutions from Neon PostgreSQL, augmented with live on-chain accreditation status.
 */
router.get('/', async (req, res) => {
  try {
    let institutions = [];

    if (db.isConfigured) {
      const result = await db.query('SELECT * FROM institutions ORDER BY name ASC');
      institutions = result.rows;
    }

    // Augment with on-chain accreditation status
    const augmented = await Promise.all(
      institutions.map(async (inst) => {
        let isAccredited = false;
        try {
          isAccredited = await isInstitutionAccreditedOnChain(inst.id);
        } catch (_) {}
        return {
          ...inst,
          isAccreditedOnChain: isAccredited,
        };
      })
    );

    return res.status(200).json({ success: true, institutions: augmented });
  } catch (err) {
    console.error('Error in GET /api/institutions:', err);
    return res.status(500).json({ error: 'Failed to fetch institutions from database', details: err.message });
  }
});

/**
 * GET /api/institutions/my-institution
 * Fetches the institution record linked to the authenticated user from Neon PostgreSQL.
 */
router.get('/my-institution', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userInstitutionId = req.user.institution_id;

    if (!db.isConfigured) {
      return res.status(404).json({ error: 'DATABASE_URL not configured.' });
    }

    // 1. Check if user is the primary owner or an associated staff member
    const result = await db.query(
      `SELECT * FROM institutions
       WHERE user_id = $1 OR id = $2
       LIMIT 1`,
      [userId, userInstitutionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No institution record linked to this user account.' });
    }

    const inst = result.rows[0];

    let isAccredited = false;
    try {
      isAccredited = await isInstitutionAccreditedOnChain(inst.id);
    } catch (_) {}

    return res.status(200).json({
      success: true,
      institution: {
        ...inst,
        isAccreditedOnChain: isAccredited,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/institutions/:id/approve
 * Regulator approves an institution:
 * 1. Validates that the caller is a regulator.
 * 2. Calls Registry.addInstitute(institutionId, name) on-chain
 * 3. Updates Neon PostgreSQL row: status = 'approved', approved_at = NOW()
 */
router.post('/:id/approve', requireAuth, requireRole('regulator'), async (req, res) => {
  const { id } = req.params;

  try {
    if (!db.isConfigured) {
      return res.status(500).json({ error: 'DATABASE_URL is not configured.' });
    }

    const instResult = await db.query('SELECT * FROM institutions WHERE id::text = $1 LIMIT 1', [id]);
    if (instResult.rows.length === 0) {
      return res.status(404).json({ error: `Institution with ID ${id} not found.` });
    }
    const inst = instResult.rows[0];

    // 1. Add to on-chain Registry
    let chainResult = null;
    try {
      chainResult = await addInstitutionOnChain(inst.id, inst.name);
    } catch (chainErr) {
      if (!chainErr.message?.includes('already exists')) {
        console.error('On-chain institution addition error:', chainErr);
        return res.status(500).json({
          error: 'Failed to register institution on-chain',
          details: chainErr.message,
        });
      }
    }

    // 2. Update Neon PostgreSQL
    const updateResult = await db.query(
      `UPDATE institutions
       SET status = 'approved', approved_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [inst.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Institution successfully approved and registered on-chain.',
      institution: {
        ...updateResult.rows[0],
        isAccreditedOnChain: true,
        on_chain_tx: chainResult?.txHash,
      },
    });
  } catch (err) {
    console.error('Error approving institution:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/institutions/:id/reject
 * Regulator rejects an institution.
 */
router.post('/:id/reject', requireAuth, requireRole('regulator'), async (req, res) => {
  const { id } = req.params;

  try {
    if (!db.isConfigured) {
      return res.status(500).json({ error: 'DATABASE_URL is not configured.' });
    }

    const updateResult = await db.query(
      `UPDATE institutions
       SET status = 'rejected'
       WHERE id::text = $1
       RETURNING *`,
      [id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: `Institution with ID ${id} not found.` });
    }

    return res.status(200).json({
      success: true,
      message: 'Institution application rejected.',
      institution: updateResult.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/institutions/:id/accreditation
 * Regulator toggles accreditation status on-chain.
 */
router.post('/:id/accreditation', requireAuth, requireRole('regulator'), async (req, res) => {
  const { id } = req.params;
  const { accredited } = req.body;

  if (typeof accredited !== 'boolean') {
    return res.status(400).json({ error: 'accredited (boolean) is required in request body.' });
  }

  try {
    const tx = await updateAccreditationStatusOnChain(id, accredited);
    return res.status(200).json({
      success: true,
      message: `Institution accreditation successfully updated to ${accredited}.`,
      accredited,
      txHash: tx.txHash,
    });
  } catch (err) {
    console.error('Error updating accreditation status:', err);
    return res.status(500).json({
      error: 'Failed to update accreditation status on-chain',
      details: err.message,
    });
  }
});

/**
 * GET /api/institutions/:id/students
 * Lists students registered under this institution from Neon PostgreSQL.
 */
router.get('/:id/students', requireAuth, async (req, res) => {
  const { id } = req.params;

  // Authorization check
  const isRegulator = req.user.role === 'regulator';
  const isMember = req.user.institution_id === id;
  if (!isRegulator && !isMember) {
    return res.status(403).json({ error: 'Access denied: You do not have permission to view students of this institution.' });
  }

  try {
    if (!db.isConfigured) {
      return res.status(200).json({ success: true, students: [] });
    }

    const result = await db.query(
      `SELECT * FROM students
       WHERE institution_id::text = $1
       ORDER BY full_name ASC`,
      [id]
    );

    return res.status(200).json({ success: true, students: result.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/institutions/:id/students
 * Adds a new student under this institution.
 * Uses Supabase Admin Auth to create or locate student auth account,
 * then stores student profile and institutional affiliation in Neon PostgreSQL.
 */
router.post('/:id/students', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { full_name, roll_number, email } = req.body;

  // Authorization check
  const isRegulator = req.user.role === 'regulator';
  const isMember = req.user.institution_id === id;
  if (!isRegulator && !isMember) {
    return res.status(403).json({ error: 'Access denied: You cannot add students to this institution.' });
  }

  if (!full_name || !roll_number) {
    return res.status(400).json({ error: 'full_name and roll_number are required.' });
  }

  const studentEmail = email || `student.${roll_number.toLowerCase().replace(/[^a-z0-9]/g, '')}@institution.edu`;
  let studentUserId = null;
  let authUserCreated = false;

  try {
    // 1. Check if user already exists in Neon
    if (db.isConfigured) {
      const userRes = await db.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [studentEmail]);
      if (userRes.rows.length > 0) {
        studentUserId = userRes.rows[0].id;
      }
    }

    // 2. If not found in Neon, create in Supabase Auth via Admin API
    if (!studentUserId) {
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: studentEmail,
        password: 'Password123!',
        email_confirm: true,
        user_metadata: { role: 'student', fullName: full_name, rollNumber: roll_number },
      });

      if (authErr) {
        if (authErr.message?.toLowerCase().includes('already registered')) {
          const { data: userList } = await supabase.auth.admin.listUsers();
          const found = userList?.users?.find((u) => u.email.toLowerCase() === studentEmail.toLowerCase());
          if (found) {
            studentUserId = found.id;
          }
        }
        if (!studentUserId) {
          studentUserId = require('crypto').randomUUID();
        }
      } else {
        studentUserId = authUser.user.id;
        authUserCreated = true;
      }
    }

    // 3. Atomically persist student profile and record in Neon PostgreSQL
    if (db.isConfigured) {
      try {
        const newStudent = await db.transaction(async (client) => {
          // Upsert users table
          await client.query(
            `INSERT INTO users (id, email, role, full_name, updated_at)
             VALUES ($1, $2, 'student', $3, NOW())
             ON CONFLICT (id) DO UPDATE SET
               email = EXCLUDED.email,
               full_name = EXCLUDED.full_name,
               updated_at = NOW()`,
            [studentUserId, studentEmail, full_name]
          );

          // Insert into students table
          const studentRes = await client.query(
            `INSERT INTO students (user_id, institution_id, full_name, roll_number)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [studentUserId, id, full_name, roll_number]
          );

          return studentRes.rows[0];
        });

        return res.status(201).json({
          success: true,
          message: 'Student added successfully.',
          student: newStudent,
        });
      } catch (dbErr) {
        // Compensation: If auth user was freshly created and DB insert fails, cleanup
        if (authUserCreated) {
          try {
            await supabase.auth.admin.deleteUser(studentUserId);
          } catch (_) {}
        }
        throw dbErr;
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Student created (offline mode).',
      student: {
        id: require('crypto').randomUUID(),
        user_id: studentUserId,
        institution_id: id,
        full_name,
        roll_number,
      },
    });
  } catch (err) {
    console.error('Error adding student:', err);
    return res.status(500).json({ error: 'Failed to add student', details: err.message });
  }
});

/**
 * GET /api/institutions/:id/certificates/pending
 * Lists all pending certificates for this institution from Neon PostgreSQL.
 */
router.get('/:id/certificates/pending', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    if (!db.isConfigured) {
      return res.status(200).json({ success: true, pendingCertificates: [] });
    }

    const queryText = `
      SELECT p.*, s.full_name AS student_name, s.roll_number
      FROM pending_certificates p
      LEFT JOIN students s ON p.student_id = s.id
      WHERE p.institution_id::text = $1 AND p.status = 'pending_approval'
      ORDER BY p.created_at DESC
    `;
    const result = await db.query(queryText, [id]);

    const formatted = result.rows.map((r) => ({
      ...r,
      students: {
        full_name: r.student_name,
        roll_number: r.roll_number,
      },
    }));

    return res.status(200).json({ success: true, pendingCertificates: formatted });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/institutions/:id/certificates/issued
 * Lists all issued certificates for this institution from Neon PostgreSQL.
 */
router.get('/:id/certificates/issued', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    if (!db.isConfigured) {
      return res.status(200).json({ success: true, certificates: [] });
    }

    const queryText = `
      SELECT c.*, s.full_name AS student_name, s.roll_number
      FROM certificates c
      LEFT JOIN students s ON c.student_id = s.id
      WHERE c.institution_id::text = $1
      ORDER BY c.created_at DESC
    `;
    const result = await db.query(queryText, [id]);

    const augmented = await Promise.all(
      result.rows.map(async (c) => {
        let isRevoked = Boolean(c.revoked);
        if (!isRevoked && c.credential_id) {
          try {
            const chainCert = await verifyCertificateOnChain(c.credential_id);
            if (chainCert.revoked) isRevoked = true;
          } catch (_) {}
        }
        return {
          ...c,
          students: {
            full_name: c.student_name,
            roll_number: c.roll_number,
          },
          revoked: isRevoked,
          gatewayUrl: c.ipfs_hash ? getGatewayUrl(c.ipfs_hash) : null,
        };
      })
    );

    return res.status(200).json({ success: true, certificates: augmented });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/institutions/:id/invite-staff
 * Invites a new staff member to this institution with role = 'institution'.
 * Auth account managed via Supabase Auth Admin API;
 * Staff profile and relationship persisted in Neon PostgreSQL.
 */
router.post('/:id/invite-staff', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { email, password, full_name } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required to invite a staff member.' });
  }

  const staffPassword = password || 'StaffPassword123!';

  try {
    // 1. Verify caller has permission for this institution
    const callerId = req.user.id;
    const isDirectStaff = req.user.institution_id === id;
    const isRegulator = req.user.role === 'regulator';

    let inst = null;
    if (db.isConfigured) {
      const instRes = await db.query('SELECT * FROM institutions WHERE id::text = $1 LIMIT 1', [id]);
      if (instRes.rows.length === 0) {
        return res.status(404).json({ error: 'Institution not found.' });
      }
      inst = instRes.rows[0];
    }

    const isOwner = inst?.user_id === callerId;
    if (!isOwner && !isDirectStaff && !isRegulator) {
      return res.status(403).json({ error: 'You do not have permission to invite staff to this institution.' });
    }

    if (!db.isConfigured) {
      return res.status(500).json({ error: 'DATABASE_URL is not configured.' });
    }

    // 2. Create the auth user in Supabase Auth via admin API
    let authUser = null;
    let createdNewAuth = false;
    const { data: createdAuth, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: staffPassword,
      email_confirm: true,
      user_metadata: {
        role: 'institution',
        institution_id: id,
        fullName: full_name || email.split('@')[0],
      },
    });

    if (authError) {
      if (authError.message?.toLowerCase().includes('already registered')) {
        const { data: userList } = await supabase.auth.admin.listUsers();
        authUser = userList?.users?.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (authUser) {
          await supabase.auth.admin.updateUserById(authUser.id, {
            password: staffPassword,
            user_metadata: {
              role: 'institution',
              institution_id: id,
              fullName: full_name || authUser.user_metadata?.fullName || email.split('@')[0],
            },
          });
        } else {
          return res.status(400).json({ error: authError.message });
        }
      } else {
        return res.status(400).json({ error: `Failed to create staff account: ${authError.message}` });
      }
    } else {
      authUser = createdAuth.user;
      createdNewAuth = true;
    }

    // 3. Atomically persist user and staff association in Neon PostgreSQL
    try {
      await db.transaction(async (client) => {
        await client.query(
          `INSERT INTO users (id, email, role, full_name, institution_id, updated_at)
           VALUES ($1, $2, 'institution', $3, $4, NOW())
           ON CONFLICT (id) DO UPDATE SET
             role = 'institution',
             institution_id = EXCLUDED.institution_id,
             full_name = COALESCE(EXCLUDED.full_name, users.full_name),
             updated_at = NOW()`,
          [authUser.id, authUser.email, full_name || email.split('@')[0], id]
        );

        await client.query(
          `INSERT INTO institution_staff (institution_id, user_id, role)
           VALUES ($1, $2, 'staff')
           ON CONFLICT (institution_id, user_id) DO NOTHING`,
          [id, authUser.id]
        );
      });
    } catch (dbErr) {
      if (createdNewAuth) {
        try {
          await supabase.auth.admin.deleteUser(authUser.id);
        } catch (_) {}
      }
      throw dbErr;
    }

    return res.status(201).json({
      success: true,
      message: `Staff member ${email} invited successfully with password "${staffPassword}".`,
      staff: {
        id: authUser.id,
        email: authUser.email,
        role: 'institution',
        institution_id: id,
        fullName: full_name || email.split('@')[0],
      },
    });
  } catch (err) {
    console.error('Error inviting staff member:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/institutions/:id/staff
 * Lists all staff members for an institution from Neon PostgreSQL.
 */
router.get('/:id/staff', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    if (!db.isConfigured) {
      return res.status(200).json({ success: true, staff: [] });
    }

    const instRes = await db.query('SELECT * FROM institutions WHERE id::text = $1 LIMIT 1', [id]);
    if (instRes.rows.length === 0) {
      return res.status(404).json({ error: 'Institution not found.' });
    }
    const inst = instRes.rows[0];

    // Query Neon for owner and all affiliated staff members
    const staffQuery = `
      SELECT u.id, u.email, u.full_name, u.role, u.created_at,
             (u.id = $2) AS is_owner
      FROM users u
      WHERE u.id = $2
         OR u.institution_id::text = $1
         OR u.id IN (SELECT user_id FROM institution_staff WHERE institution_id::text = $1)
      ORDER BY (u.id = $2) DESC, u.created_at ASC
    `;
    const staffRes = await db.query(staffQuery, [id, inst.user_id]);

    const staffList = staffRes.rows.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      isOwner: Boolean(row.is_owner),
      fullName: row.full_name || row.email.split('@')[0],
      created_at: row.created_at,
    }));

    return res.status(200).json({ success: true, staff: staffList });
  } catch (err) {
    console.error('Error fetching staff list:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/institutions/:id/stats
 * Pure Neon PostgreSQL aggregation queries:
 * - total certificates issued
 * - total revoked
 * - total verification requests received
 * - issuance over time count (grouped by YYYY-MM)
 */
router.get('/:id/stats', async (req, res) => {
  const { id } = req.params;

  try {
    if (!db.isConfigured) {
      return res.status(200).json({
        success: true,
        stats: {
          total_issued: 0,
          total_revoked: 0,
          total_verifications: 0,
          issuance_over_time: [],
        },
      });
    }

    // 1. Certificate counts
    const certStats = await db.query(
      `SELECT
         COUNT(*)::int AS total_issued,
         COUNT(*) FILTER (WHERE revoked = true)::int AS total_revoked
       FROM certificates
       WHERE institution_id::text = $1`,
      [id]
    );

    const total_issued = certStats.rows[0]?.total_issued || 0;
    const total_revoked = certStats.rows[0]?.total_revoked || 0;

    // 2. Verification logs for this institution's certificates
    const verifStats = await db.query(
      `SELECT COUNT(*)::int AS total_verifications
       FROM verification_logs vl
       JOIN certificates c ON vl.credential_id = c.credential_id
       WHERE c.institution_id::text = $1`,
      [id]
    );
    const total_verifications = verifStats.rows[0]?.total_verifications || 0;

    // 3. Issuance over time (grouped by YYYY-MM)
    const timelineRes = await db.query(
      `SELECT TO_CHAR(issue_date, 'YYYY-MM') AS period, COUNT(*)::int AS count
       FROM certificates
       WHERE institution_id::text = $1
       GROUP BY TO_CHAR(issue_date, 'YYYY-MM')
       ORDER BY period ASC`,
      [id]
    );

    const issuance_over_time = timelineRes.rows;

    return res.status(200).json({
      success: true,
      stats: {
        total_issued,
        total_revoked,
        total_verifications,
        issuance_over_time,
      },
    });
  } catch (err) {
    console.error('Error calculating institution stats:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

/**
 * GET /api/institutions/anomalies/all
 * Query all recorded anomaly flags across the system from Neon PostgreSQL.
 */
router.get('/anomalies/all', async (req, res) => {
  try {
    const flags = await getAnomalyFlags();
    return res.status(200).json({ success: true, anomalies: flags });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to query anomalies', details: err.message });
  }
});

/**
 * GET /api/institutions/:id/anomalies
 * Query recorded anomaly flags for a specific institution from Neon PostgreSQL.
 */
router.get('/:id/anomalies', async (req, res) => {
  try {
    const { id } = req.params;
    const flags = await getAnomalyFlags(id);
    return res.status(200).json({ success: true, institution_id: id, anomalies: flags });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to query anomalies', details: err.message });
  }
});

module.exports = router;
