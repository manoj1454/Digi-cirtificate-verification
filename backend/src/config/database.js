const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const databaseUrl = process.env.DATABASE_URL;

let pool = null;
let isConfigured = false;

function maskConnectionString(url) {
  if (!url) return 'Not configured';
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '*****';
    }
    return parsed.toString();
  } catch (_) {
    return '[Protected Connection String]';
  }
}

if (databaseUrl && databaseUrl.trim() !== '' && !databaseUrl.includes('placeholder')) {
  try {
    const isNeon = databaseUrl.includes('neon.tech') || databaseUrl.includes('sslmode=require');
    const poolConfig = {
      connectionString: databaseUrl,
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONN_TIMEOUT || '10000', 10),
    };

    // Neon requires TLS/SSL
    if (isNeon || process.env.NODE_ENV === 'production' || databaseUrl.includes('ssl=true')) {
      poolConfig.ssl = {
        rejectUnauthorized: false,
      };
    }

    pool = new Pool(poolConfig);
    isConfigured = true;

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client:', err.message);
    });
  } catch (err) {
    console.error('Failed to initialize PostgreSQL pool:', err.message);
  }
} else {
  // Pool unconfigured placeholder
  isConfigured = false;
}

/**
 * Execute a parameterized query using the pool.
 * @param {string} text - Parameterized SQL statement
 * @param {Array} params - Parameters array
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params = []) {
  if (!pool) {
    const err = new Error(
      'DATABASE_URL is not configured. Please set a valid Neon PostgreSQL connection string in backend/.env'
    );
    err.code = 'DATABASE_NOT_CONFIGURED';
    throw err;
  }
  return pool.query(text, params);
}

/**
 * Get a client from the pool (for multi-statement transactions).
 * Remember to call client.release() when finished!
 * @returns {Promise<import('pg').PoolClient>}
 */
async function getClient() {
  if (!pool) {
    const err = new Error(
      'DATABASE_URL is not configured. Please set a valid Neon PostgreSQL connection string in backend/.env'
    );
    err.code = 'DATABASE_NOT_CONFIGURED';
    throw err;
  }
  return pool.connect();
}

/**
 * Executes a callback within a managed transaction block.
 * Automatically BEGINs, COMMITs on success, and ROLLBACKs on failure.
 * @param {function(import('pg').PoolClient): Promise<any>} callback
 */
async function transaction(callback) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      console.error('Error during transaction rollback:', rbErr.message);
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Lightweight health check test for database connectivity and latency.
 */
async function checkConnection() {
  if (!pool) {
    return {
      connected: false,
      configured: false,
      message: 'DATABASE_URL is not configured or is a placeholder.',
      latency_ms: null,
    };
  }

  const start = Date.now();
  try {
    const res = await pool.query('SELECT NOW() AS server_time, current_database() AS db_name');
    const latency_ms = Date.now() - start;
    return {
      connected: true,
      configured: true,
      message: 'Successfully connected to Neon PostgreSQL database.',
      server_time: res.rows[0]?.server_time,
      database: res.rows[0]?.db_name,
      latency_ms,
    };
  } catch (err) {
    return {
      connected: false,
      configured: true,
      message: `Database connection failed: ${err.message}`,
      latency_ms: Date.now() - start,
    };
  }
}

/**
 * Graceful pool shutdown.
 */
async function shutdown() {
  if (pool) {
    try {
      await pool.end();
      console.log('PostgreSQL connection pool drained.');
    } catch (e) {
      console.error('Error draining PostgreSQL pool:', e.message);
    }
  }
}

module.exports = {
  pool,
  isConfigured,
  query,
  getClient,
  transaction,
  checkConnection,
  shutdown,
  maskConnectionString,
};
