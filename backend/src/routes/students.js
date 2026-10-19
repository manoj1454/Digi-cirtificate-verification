const express = require('express');
const { requireAuth } = require('../middleware/auth');
const db = require('../config/database');
const { getGatewayUrl } = require('../config/pinata');

const router = express.Router();

/**
 * GET /api/students/certificates
 * Returns all certificates belonging strictly to the authenticated student from Neon PostgreSQL.
 * Student data isolation: Only certificates matching the authenticated student's profile are returned.
 */
router.get('/certificates', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    if (!db.isConfigured) {
      return res.status(200).json({ success: true, certificates: [], student: null });
    }

    // 1. Look up student profile linked to this user
    let studentRecord = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (isUuid) {
      const studentRes = await db.query(
        `SELECT s.id, s.full_name, s.roll_number, s.institution_id, i.name AS institution_name
         FROM students s
         LEFT JOIN institutions i ON s.institution_id = i.id
         WHERE s.user_id = $1
         LIMIT 1`,
        [userId]
      );

      if (studentRes.rows.length > 0) {
        studentRecord = studentRes.rows[0];
      }
    } else {
      // In development/demo, allow fallback to first demo student if none linked
      if (process.env.NODE_ENV !== 'production') {
        const demoRes = await db.query(
          `SELECT s.id, s.full_name, s.roll_number, s.institution_id, i.name AS institution_name
           FROM students s
           LEFT JOIN institutions i ON s.institution_id = i.id
           LIMIT 1`
        );
        if (demoRes.rows.length > 0) {
          studentRecord = demoRes.rows[0];
        }
      }
    }

    if (!studentRecord) {
      return res.status(200).json({ success: true, certificates: [], student: null });
    }

    // 2. Fetch certificates strictly for this student
    const certsRes = await db.query(
      `SELECT c.*, i.name AS institution_name
       FROM certificates c
       LEFT JOIN institutions i ON c.institution_id = i.id
       WHERE c.student_id = $1
       ORDER BY c.issue_date DESC`,
      [studentRecord.id]
    );

    const augmented = certsRes.rows.map((c) => ({
      ...c,
      institution_name: c.institution_name || 'Accredited Institution',
      gatewayUrl: c.ipfs_hash ? getGatewayUrl(c.ipfs_hash) : null,
    }));

    return res.status(200).json({
      success: true,
      student: studentRecord,
      certificates: augmented,
    });
  } catch (err) {
    console.error('Error fetching student certificates:', err);
    return res.status(500).json({ error: 'Failed to fetch student certificates', details: err.message });
  }
});

module.exports = router;
