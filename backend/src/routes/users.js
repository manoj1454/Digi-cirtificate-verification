const express = require('express');
const { requireAuth } = require('../middleware/auth');
const db = require('../config/database');

const router = express.Router();

/**
 * GET /api/users/me
 * Retrieves current authenticated user profile and role from Neon PostgreSQL.
 * Also retrieves linked role-specific entities (institution or student).
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    if (!db.isConfigured) {
      return res.status(200).json({
        success: true,
        user: req.user,
        role: req.user.role,
        profile: req.user,
        institution: null,
        student: null,
      });
    }

    // 1. Fetch user profile from Neon
    const userResult = await db.query(
      `SELECT id, email, role, full_name, institution_id, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      // User is authenticated in Supabase but not yet synchronized in Neon
      return res.status(200).json({
        success: true,
        user: req.user,
        role: req.user.role || 'student',
        profile: null,
        needsProfileInit: true,
      });
    }

    const userProfile = userResult.rows[0];
    let linkedInstitution = null;
    let linkedStudent = null;

    // 2. Fetch role-specific details
    if (userProfile.role === 'institution') {
      const instResult = await db.query(
        `SELECT * FROM institutions WHERE user_id = $1 OR id = $2 LIMIT 1`,
        [userId, userProfile.institution_id]
      );
      if (instResult.rows.length > 0) {
        linkedInstitution = instResult.rows[0];
      }
    } else if (userProfile.role === 'student') {
      const studentResult = await db.query(
        `SELECT s.*, i.name AS institution_name
         FROM students s
         LEFT JOIN institutions i ON s.institution_id = i.id
         WHERE s.user_id = $1 LIMIT 1`,
        [userId]
      );
      if (studentResult.rows.length > 0) {
        linkedStudent = studentResult.rows[0];
      }
    }

    return res.status(200).json({
      success: true,
      user: userProfile,
      role: userProfile.role,
      profile: userProfile,
      institution: linkedInstitution,
      student: linkedStudent,
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return res.status(500).json({ error: 'Failed to fetch user profile', details: err.message });
  }
});

/**
 * POST /api/users/profile
 * Synchronizes Supabase Auth registration into Neon PostgreSQL.
 * Creates users row and role-specific rows (institutions / students) atomically.
 */
router.post('/profile', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const email = req.user.email;
  const {
    role,
    fullName,
    institutionName,
    registrationNumber,
    rollNumber,
    institutionId,
  } = req.body;

  const targetRole = role || req.user.role || 'student';
  const name = fullName || req.user.full_name || email.split('@')[0];

  try {
    if (!db.isConfigured) {
      const mockProfile = { id: userId, email, role: targetRole, full_name: name };
      return res.status(201).json({
        success: true,
        message: 'Neon database not configured. Profile acknowledged in session.',
        user: mockProfile,
        role: targetRole,
        profile: mockProfile,
      });
    }

    const result = await db.transaction(async (client) => {
      // 1. Upsert users table
      const userRes = await client.query(
        `INSERT INTO users (id, email, role, full_name, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           role = EXCLUDED.role,
           full_name = COALESCE(EXCLUDED.full_name, users.full_name),
           updated_at = NOW()
         RETURNING *`,
        [userId, email, targetRole, name]
      );
      let user = userRes.rows[0];
      let institution = null;
      let student = null;

      // 2. Role-specific creation
      if (targetRole === 'institution' && institutionName) {
        const instRes = await client.query(
          `INSERT INTO institutions (user_id, name, registration_number, status)
           VALUES ($1, $2, $3, 'pending')
           ON CONFLICT (user_id) DO UPDATE SET
             name = EXCLUDED.name,
             registration_number = EXCLUDED.registration_number
           RETURNING *`,
          [userId, institutionName, registrationNumber || 'PENDING-REG']
        );
        institution = instRes.rows[0];

        // Link institution_id to user
        const updatedUser = await client.query(
          `UPDATE users SET institution_id = $1 WHERE id = $2 RETURNING *`,
          [institution.id, userId]
        );
        user = updatedUser.rows[0];
      } else if (targetRole === 'student') {
        let effectiveInstId = institutionId;
        if (!effectiveInstId) {
          const defaultInst = await client.query('SELECT id FROM institutions LIMIT 1');
          if (defaultInst.rows.length > 0) {
            effectiveInstId = defaultInst.rows[0].id;
          }
        }
        if (effectiveInstId) {
          const studentRes = await client.query(
            `INSERT INTO students (user_id, full_name, roll_number, institution_id)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id) DO UPDATE SET
               full_name = EXCLUDED.full_name,
               roll_number = EXCLUDED.roll_number,
               institution_id = COALESCE(EXCLUDED.institution_id, students.institution_id)
             RETURNING *`,
            [userId, name, rollNumber || 'PENDING-ROLL', effectiveInstId]
          );
          student = studentRes.rows[0];
        }
      }

      return { user, institution, student };
    });

    return res.status(201).json({
      success: true,
      message: 'Profile synchronized successfully in Neon.',
      user: result.user,
      role: result.user.role,
      profile: result.user,
      institution: result.institution,
      student: result.student,
    });
  } catch (err) {
    console.error('Error synchronizing profile in Neon:', err);
    return res.status(500).json({ error: 'Failed to synchronize profile', details: err.message });
  }
});

module.exports = router;
