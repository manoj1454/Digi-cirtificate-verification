const express = require('express');
const { supabase } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const {
  addInstitutionOnChain,
  updateAccreditationStatusOnChain,
  isInstitutionAccreditedOnChain,
  verifyCertificateOnChain,
} = require('../config/blockchain');
const { getGatewayUrl } = require('../config/pinata');
const fs = require('fs');
const path = require('path');

const router = express.Router();

/**
 * GET /api/institutions
 * List all institutions, augmented with live on-chain accreditation status.
 */
router.get('/', async (req, res) => {
  try {
    const { data: institutions, error } = await supabase
      .from('institutions')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error querying institutions:', error);
      return res.status(500).json({ error: 'Failed to fetch institutions from database.' });
    }

    // Augment with on-chain accreditation status
    const augmented = await Promise.all(
      (institutions || []).map(async (inst) => {
        let isAccredited = false;
        try {
          isAccredited = await isInstitutionAccreditedOnChain(inst.id);
        } catch (e) {
          // ignore error if contract call fails
        }
        return {
          ...inst,
          isAccreditedOnChain: isAccredited,
        };
      })
    );

    return res.status(200).json({ success: true, institutions: augmented });
  } catch (err) {
    console.error('Error in GET /api/institutions:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

/**
 * GET /api/institutions/my-institution
 * Fetches the institution record linked to the logged-in user.
 */
router.get('/my-institution', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    let inst = null;

    // 1. Check if user is the primary institution owner
    const { data: ownerInst, error: ownerErr } = await supabase
      .from('institutions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!ownerErr && ownerInst) {
      inst = ownerInst;
    } else {
      // 2. Check if user has an associated institution_id (invited staff member)
      let instId = req.user.institution_id;
      if (!instId) {
        try {
          const { data: u } = await supabase
            .from('users')
            .select('institution_id')
            .eq('id', userId)
            .maybeSingle();
          if (u?.institution_id) instId = u.institution_id;
        } catch (e) {}
      }

      if (instId) {
        const { data: memberInst } = await supabase
          .from('institutions')
          .select('*')
          .eq('id', instId)
          .maybeSingle();
        if (memberInst) inst = memberInst;
      }
    }

    if (!inst) {
      return res.status(404).json({ error: 'No institution record linked to this user account.' });
    }

    let isAccredited = false;
    try {
      isAccredited = await isInstitutionAccreditedOnChain(inst.id);
    } catch (e) {}

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
 * 1. Calls Registry.addInstitute(institutionId, name) on-chain
 * 2. Updates Supabase row to status = 'approved', approved_at = NOW()
 */
router.post('/:id/approve', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: inst, error } = await supabase
      .from('institutions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !inst) {
      return res.status(404).json({ error: `Institution with ID ${id} not found.` });
    }

    // 1. Add to on-chain Registry
    let chainResult = null;
    try {
      chainResult = await addInstitutionOnChain(inst.id, inst.name);
    } catch (chainErr) {
      // If already added on chain, continue
      if (!chainErr.message?.includes('already exists')) {
        console.error('On-chain institution addition error:', chainErr);
        return res.status(500).json({
          error: 'Failed to register institution on-chain',
          details: chainErr.message,
        });
      }
    }

    // 2. Update Supabase
    const { data: updated, error: updateErr } = await supabase
      .from('institutions')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      return res.status(500).json({ error: 'Failed to update institution in database', details: updateErr.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Institution successfully approved and registered on-chain.',
      institution: {
        ...updated,
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
 * Regulator rejects an institution. No on-chain call needed.
 */
router.post('/:id/reject', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: updated, error } = await supabase
      .from('institutions')
      .update({ status: 'rejected' })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: 'Failed to update institution in database', details: error.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Institution application rejected.',
      institution: updated,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/institutions/:id/accreditation
 * Regulator toggles accreditation status on-chain.
 */
router.post('/:id/accreditation', async (req, res) => {
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
 * Lists students registered under this institution.
 */
router.get('/:id/students', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .eq('institution_id', id)
      .order('full_name', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch students', details: error.message });
    }

    return res.status(200).json({ success: true, students: students || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/institutions/:id/students
 * Adds a new student under this institution.
 */
router.post('/:id/students', async (req, res) => {
  const { id } = req.params;
  const { full_name, roll_number, email } = req.body;

  if (!full_name || !roll_number) {
    return res.status(400).json({ error: 'full_name and roll_number are required.' });
  }

  try {
    const studentEmail = email || `student.${roll_number.toLowerCase().replace(/[^a-z0-9]/g, '')}@institution.edu`;

    // 1. Create or find student user
    let studentUserId = null;
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', studentEmail)
      .maybeSingle();

    if (existingUser) {
      studentUserId = existingUser.id;
    } else {
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: studentEmail,
        password: 'Password123!',
        email_confirm: true,
        user_metadata: { role: 'student', fullName: full_name, rollNumber: roll_number },
      });

      if (authErr) {
        if (authErr.message?.toLowerCase().includes('already registered')) {
          try {
            const { data: userList } = await supabase.auth.admin.listUsers();
            const found = userList?.users?.find((u) => u.email.toLowerCase() === studentEmail.toLowerCase());
            if (found) {
              studentUserId = found.id;
              await supabase.auth.admin.updateUserById(found.id, {
                password: 'Password123!',
                user_metadata: { role: 'student', fullName: full_name, rollNumber: roll_number },
              });
            }
          } catch (e) {}
        }
        if (!studentUserId) {
          studentUserId = require('crypto').randomUUID();
          await supabase.from('users').upsert({ id: studentUserId, email: studentEmail, role: 'student' });
        }
      } else {
        studentUserId = authUser.user.id;
      }
    }

    // 2. Insert into students table
    const { data: newStudent, error: sErr } = await supabase
      .from('students')
      .insert({
        user_id: studentUserId,
        institution_id: id,
        full_name,
        roll_number,
      })
      .select()
      .single();

    if (sErr) {
      return res.status(500).json({ error: 'Failed to add student to database', details: sErr.message });
    }

    return res.status(201).json({
      success: true,
      message: 'Student added successfully.',
      student: newStudent,
    });
  } catch (err) {
    console.error('Error adding student:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/institutions/:id/certificates/pending
 * Lists all pending certificates for this institution.
 */
router.get('/:id/certificates/pending', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Check Supabase
    let records = [];
    const { data, error } = await supabase
      .from('pending_certificates')
      .select('*, students(full_name, roll_number)')
      .eq('institution_id', id)
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: false });

    if (!error && data) {
      records = data;
    } else {
      // Check fallback storage
      const fallbackFile = path.resolve(__dirname, '../../data/pending_certificates.json');
      if (fs.existsSync(fallbackFile)) {
        try {
          const all = JSON.parse(fs.readFileSync(fallbackFile, 'utf-8'));
          records = all.filter((r) => r.institution_id === id && r.status === 'pending_approval');
        } catch (e) {}
      }
    }

    return res.status(200).json({ success: true, pendingCertificates: records });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/institutions/:id/certificates/issued
 * Lists all issued certificates for this institution.
 */
router.get('/:id/certificates/issued', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: certs, error } = await supabase
      .from('certificates')
      .select('*, students(full_name, roll_number)')
      .eq('institution_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch issued certificates', details: error.message });
    }

    const augmented = await Promise.all(
      (certs || []).map(async (c) => {
        let isRevoked = Boolean(c.revoked);
        if (!isRevoked && c.credential_id) {
          try {
            const chainCert = await verifyCertificateOnChain(c.credential_id);
            if (chainCert.revoked) isRevoked = true;
          } catch (e) {}
        }
        return {
          ...c,
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
 * Invites a new staff member to this institution with role = 'institution' and matching institution_id.
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
    const { data: inst, error: instErr } = await supabase
      .from('institutions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (instErr || !inst) {
      return res.status(404).json({ error: 'Institution not found.' });
    }

    // Caller must be the owner or belong to the same institution
    const isOwner = inst.user_id === callerId;
    const isStaff = req.user.institution_id === id;
    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: 'You do not have permission to invite staff to this institution.' });
    }

    // 2. Create the real auth user in Supabase Auth via admin API
    let authUser = null;
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
      // If user already exists in auth, check if they can be updated/linked
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
    }

    // 3. Upsert into public.users table
    try {
      await supabase.from('users').upsert({
        id: authUser.id,
        email: authUser.email,
        role: 'institution',
        institution_id: id,
      });
    } catch (dbErr) {
      // If column is not migrated yet in Postgres, insert without institution_id
      try {
        await supabase.from('users').upsert({
          id: authUser.id,
          email: authUser.email,
          role: 'institution',
        });
      } catch (e) {}
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
 * Lists all staff members for an institution.
 */
router.get('/:id/staff', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: inst } = await supabase
      .from('institutions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!inst) {
      return res.status(404).json({ error: 'Institution not found.' });
    }

    const staffList = [];

    // 1. Add owner
    const { data: ownerUser } = await supabase.auth.admin.getUserById(inst.user_id);
    if (ownerUser?.user) {
      staffList.push({
        id: ownerUser.user.id,
        email: ownerUser.user.email,
        role: 'institution',
        isOwner: true,
        fullName: ownerUser.user.user_metadata?.fullName || ownerUser.user.email.split('@')[0],
        created_at: ownerUser.user.created_at,
      });
    }

    // 2. Add invited staff
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    (authUsers?.users || []).forEach((u) => {
      if (
        u.id !== inst.user_id &&
        u.user_metadata?.role === 'institution' &&
        u.user_metadata?.institution_id === id
      ) {
        staffList.push({
          id: u.id,
          email: u.email,
          role: 'institution',
          isOwner: false,
          fullName: u.user_metadata?.fullName || u.email.split('@')[0],
          created_at: u.created_at,
        });
      }
    });

    return res.status(200).json({ success: true, staff: staffList });
  } catch (err) {
    console.error('Error fetching staff list:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/institutions/:id/stats
 * Pure Supabase aggregation queries:
 * - total certificates issued
 * - total revoked
 * - total verification requests received (joined on verification_logs filtered by institution's certificates)
 * - issuance over time count
 */
router.get('/:id/stats', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Fetch certificates for this institution
    const { data: certs, error: certsErr } = await supabase
      .from('certificates')
      .select('id, credential_id, issue_date, revoked, created_at')
      .eq('institution_id', id);

    if (certsErr) {
      console.error('Error fetching certificates for stats:', certsErr);
      return res.status(500).json({ error: 'Failed to fetch certificates for stats.' });
    }

    const certificatesList = certs || [];
    const total_issued = certificatesList.length;
    const total_revoked = certificatesList.filter((c) => c.revoked).length;

    // 2. Fetch verification requests received for this institution's certificates
    let total_verifications = 0;
    const credentialIds = certificatesList.map((c) => c.credential_id).filter(Boolean);

    if (credentialIds.length > 0) {
      const { count, error: logErr } = await supabase
        .from('verification_logs')
        .select('*', { count: 'exact', head: true })
        .in('credential_id', credentialIds);

      if (!logErr && typeof count === 'number') {
        total_verifications = count;
      }
    }

    // 3. Issuance over time aggregation (by period YYYY-MM)
    const timelineMap = {};
    certificatesList.forEach((c) => {
      const d = c.issue_date || (c.created_at ? c.created_at.split('T')[0] : null);
      if (!d) return;
      const period = d.slice(0, 7); // 'YYYY-MM'
      timelineMap[period] = (timelineMap[period] || 0) + 1;
    });

    const issuance_over_time = Object.entries(timelineMap)
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.period.localeCompare(b.period));

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

const { getAnomalyFlags } = require('../services/anomalyService');

/**
 * GET /api/institutions/anomalies/all
 * Query all recorded anomaly flags across the system.
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
 * Query recorded anomaly flags for a specific institution.
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

