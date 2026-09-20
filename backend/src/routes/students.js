const express = require('express');
const { supabase } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { getGatewayUrl } = require('../config/pinata');

const router = express.Router();

/**
 * GET /api/students/certificates
 * Returns all certificates belonging to the authenticated student.
 */
router.get('/certificates', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Look up student profile linked to this user
    let { data: studentRecord, error: studentErr } = await supabase
      .from('students')
      .select('id, full_name, roll_number, institution_id, institutions(name)')
      .eq('user_id', userId)
      .maybeSingle();

    if (!studentRecord) {
      // If none found for this user, look for demo student
      const { data: firstStudent } = await supabase
        .from('students')
        .select('id, full_name, roll_number, institution_id, institutions(name)')
        .limit(1)
        .maybeSingle();

      studentRecord = firstStudent;
    }

    if (!studentRecord) {
      return res.status(200).json({ success: true, certificates: [], student: null });
    }

    // 2. Fetch certificates for this student
    const { data: certs, error: certErr } = await supabase
      .from('certificates')
      .select('*, institutions(name)')
      .eq('student_id', studentRecord.id)
      .order('issue_date', { ascending: false });

    if (certErr) {
      return res.status(500).json({ error: 'Failed to fetch certificates', details: certErr.message });
    }

    const augmented = (certs || []).map((c) => ({
      ...c,
      institution_name: c.institutions?.name || 'Accredited Institution',
      gatewayUrl: c.ipfs_hash ? getGatewayUrl(c.ipfs_hash) : null,
    }));

    return res.status(200).json({
      success: true,
      student: studentRecord,
      certificates: augmented,
    });
  } catch (err) {
    console.error('Error fetching student certificates:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
