const express = require('express');
const router = express.Router();
const { supabase, isConfigured } = require('../config/supabase');

router.get('/', async (req, res) => {
  const startTime = Date.now();
  const healthData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'credential-verification-api',
    supabase: {
      configured: isConfigured,
      connected: false,
      message: '',
      latency_ms: null,
    },
  };

  if (!isConfigured) {
    healthData.supabase.message =
      'Supabase credentials are not configured or are set to placeholder values. Update backend/.env to connect.';
    return res.status(200).json(healthData);
  }

  try {
    // Perform a lightweight check against Supabase using service role
    // Using limit(1) without head: true ensures errors return descriptive messages rather than empty HTTP HEAD bodies
    const { error: dbError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    healthData.supabase.latency_ms = Date.now() - startTime;

    if (dbError) {
      // If table privileges are not yet granted, verify connectivity via Supabase Auth Admin API
      const { error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (!authError) {
        healthData.supabase.connected = true;
        healthData.supabase.message = 'Successfully connected to Supabase (Auth API active; run Section 7 in schema.sql to grant table access to service_role)';
        return res.status(200).json(healthData);
      }

      healthData.supabase.connected = false;
      healthData.supabase.message = dbError.message || authError.message || 'Error communicating with Supabase';
      return res.status(503).json(healthData);
    }

    healthData.supabase.connected = true;
    healthData.supabase.message = 'Successfully connected to Supabase database';
    return res.status(200).json(healthData);
  } catch (err) {
    healthData.supabase.connected = false;
    healthData.supabase.message = err.message || 'Error communicating with Supabase';
    healthData.supabase.latency_ms = Date.now() - startTime;
    return res.status(503).json(healthData);
  }
});

module.exports = router;
