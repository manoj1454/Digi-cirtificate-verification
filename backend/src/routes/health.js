const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { supabase, isConfigured: isSupabaseConfigured } = require('../config/supabase');
const blockchain = require('../config/blockchain');

router.get('/', async (req, res) => {
  const startTime = Date.now();

  // 1. Check Neon PostgreSQL database
  const dbHealth = await db.checkConnection();

  // 2. Check Supabase Auth connectivity
  let authHealth = {
    configured: isSupabaseConfigured,
    connected: false,
    provider: 'supabase-auth',
    message: '',
    latency_ms: null,
  };

  if (!isSupabaseConfigured) {
    authHealth.message = 'Supabase Auth credentials not configured or using placeholders.';
  } else {
    const authStart = Date.now();
    try {
      const { error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
      authHealth.latency_ms = Date.now() - authStart;
      if (authError) {
        authHealth.connected = false;
        authHealth.message = `Supabase Auth error: ${authError.message}`;
      } else {
        authHealth.connected = true;
        authHealth.message = 'Supabase Auth service reachable and active.';
      }
    } catch (err) {
      authHealth.latency_ms = Date.now() - authStart;
      authHealth.connected = false;
      authHealth.message = err.message || 'Error communicating with Supabase Auth';
    }
  }

  // Database must be healthy for the database service check
  // Do NOT report database as healthy merely because auth responds!
  const isDbOk = dbHealth.connected;
  const isAuthOk = authHealth.connected || !authHealth.configured;

  const overallStatus = isDbOk ? 'ok' : dbHealth.configured ? 'error' : 'degraded';
  const httpStatus = isDbOk ? 200 : dbHealth.configured ? 503 : 200;

  const responsePayload = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    total_latency_ms: Date.now() - startTime,
    service: 'xypher-verification-api',
    database: {
      provider: 'neon-postgresql',
      configured: dbHealth.configured,
      connected: dbHealth.connected,
      latency_ms: dbHealth.latency_ms,
      database: dbHealth.database,
      message: dbHealth.message,
    },
    auth: authHealth,
    blockchain: {
      configured: blockchain.isBlockchainConfigured,
      mode: blockchain.isDemoMode ? 'demo' : process.env.NODE_ENV === 'production' ? 'production' : 'development',
      signerConfigured: Boolean(blockchain.signer),
      message: blockchain.isBlockchainConfigured
        ? 'Blockchain service configured and operational.'
        : 'Demo mode: Blockchain signer not configured. State-changing operations disabled (HTTP 503).',
    },
  };

  return res.status(httpStatus).json(responsePayload);
});

module.exports = router;
