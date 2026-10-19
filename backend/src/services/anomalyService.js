const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const dataDir = path.resolve(__dirname, '../../data');
const fallbackFile = path.join(dataDir, 'anomaly_flags.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readFallback() {
  ensureDataDir();
  if (!fs.existsSync(fallbackFile)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(fallbackFile, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function writeFallback(records) {
  ensureDataDir();
  fs.writeFileSync(fallbackFile, JSON.stringify(records, null, 2), 'utf-8');
}

/**
 * Checks if an institution has exceeded the hourly issuance threshold.
 * Configurable via ISSUANCE_HOURLY_THRESHOLD (default 20).
 * Queries Neon PostgreSQL certificates table and logs anomaly to anomaly_flags.
 */
async function checkIssuanceAnomaly(institutionId) {
  const threshold = parseInt(process.env.ISSUANCE_HOURLY_THRESHOLD || '20', 10);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  let currentCount = 0;

  if (db.isConfigured) {
    try {
      const countRes = await db.query(
        `SELECT COUNT(*)::int AS total
         FROM certificates
         WHERE institution_id = $1 AND created_at >= $2`,
        [institutionId, oneHourAgo]
      );
      currentCount = countRes.rows[0]?.total || 0;
    } catch (err) {
      console.warn('[AnomalyService] Error querying certificate issuance velocity from Neon:', err.message);
    }
  }

  if (currentCount >= threshold) {
    const anomaly = {
      id: `anomaly-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      institution_id: institutionId,
      flag_type: 'excessive_issuance',
      event_type: 'excessive_issuance',
      count: currentCount,
      threshold,
      window_hours: 1,
      severity: 'WARNING',
      details: {
        message: `Institution issued ${currentCount} certificates within the last hour (threshold: ${threshold})`,
        detected_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    };

    console.warn(
      `⚠️ [SECURITY ANOMALY DETECTED] Institution ${institutionId} exceeded issuance threshold: ${currentCount}/${threshold} in last 1 hr.`
    );

    // Save to Neon anomaly_flags table
    if (db.isConfigured) {
      try {
        const insertRes = await db.query(
          `INSERT INTO anomaly_flags (
            institution_id, flag_type, event_type, count, threshold,
            window_hours, details, severity, created_at, timestamp
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
          ) RETURNING *`,
          [
            anomaly.institution_id,
            anomaly.flag_type,
            anomaly.event_type,
            anomaly.count,
            anomaly.threshold,
            anomaly.window_hours,
            JSON.stringify(anomaly.details),
            anomaly.severity,
          ]
        );
        return insertRes.rows[0];
      } catch (dbErr) {
        console.warn('Could not persist anomaly to Neon anomaly_flags:', dbErr.message);
      }
    }

    // Dev Fallback storage
    const fallbackRecords = readFallback();
    fallbackRecords.unshift(anomaly);
    if (fallbackRecords.length > 200) fallbackRecords.pop();
    writeFallback(fallbackRecords);

    return anomaly;
  }

  return null;
}

/**
 * Query anomaly flags for an institution or all institutions from Neon.
 */
async function getAnomalyFlags(institutionId = null) {
  let dbAnomalies = [];

  if (db.isConfigured) {
    try {
      let queryText = `SELECT * FROM anomaly_flags`;
      let params = [];

      if (institutionId) {
        queryText += ` WHERE institution_id = $1`;
        params.push(institutionId);
      }
      queryText += ` ORDER BY created_at DESC LIMIT 100`;

      const result = await db.query(queryText, params);
      dbAnomalies = result.rows;
      return dbAnomalies;
    } catch (e) {
      console.warn('[AnomalyService] Error reading anomaly_flags from Neon:', e.message);
    }
  }

  // Fallback storage in non-production
  const fileAnomalies = readFallback();
  return fileAnomalies
    .filter((a) => !institutionId || a.institution_id === institutionId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

module.exports = {
  checkIssuanceAnomaly,
  getAnomalyFlags,
};
