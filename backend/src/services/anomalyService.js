const fs = require('fs');
const path = require('path');
const { supabase } = require('../config/supabase');

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
 * Does not block issuance; logs clear warning and stores alert in anomaly_flags.
 */
async function checkIssuanceAnomaly(institutionId) {
  const threshold = parseInt(process.env.ISSUANCE_HOURLY_THRESHOLD || '20', 10);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  try {
    const { count, error } = await supabase
      .from('certificates')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', institutionId)
      .gte('created_at', oneHourAgo);

    const currentCount = typeof count === 'number' ? count : 0;

    if (currentCount >= threshold) {
      const anomaly = {
        id: `anomaly-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        institution_id: institutionId,
        event_type: 'excessive_issuance',
        count: currentCount,
        threshold: threshold,
        window_hours: 1,
        details: {
          message: `Institution issued ${currentCount} certificates within the last hour (threshold: ${threshold})`,
          detected_at: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      };

      console.warn(
        `⚠️ [SECURITY ANOMALY DETECTED] Institution ${institutionId} exceeded issuance threshold: ${currentCount}/${threshold} in last 1 hr.`
      );

      // Store in queryable file-based storage
      const fallbackRecords = readFallback();
      fallbackRecords.unshift(anomaly);
      if (fallbackRecords.length > 200) fallbackRecords.pop();
      writeFallback(fallbackRecords);

      // Store in Supabase table (if table exists)
      try {
        await supabase.from('anomaly_flags').insert({
          institution_id: anomaly.institution_id,
          event_type: anomaly.event_type,
          count: anomaly.count,
          threshold: anomaly.threshold,
          window_hours: anomaly.window_hours,
          details: anomaly.details,
        });
      } catch (dbErr) {
        console.warn('Note: Could not persist anomaly to Supabase anomaly_flags table:', dbErr.message);
      }

      return anomaly;
    }
  } catch (err) {
    console.warn('Error during anomaly check:', err.message);
  }
  return null;
}

/**
 * Query anomaly flags for an institution or all institutions.
 */
async function getAnomalyFlags(institutionId = null) {
  let dbAnomalies = [];
  try {
    let query = supabase.from('anomaly_flags').select('*').order('created_at', { ascending: false });
    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }
    const { data, error } = await query;
    if (!error && data) {
      dbAnomalies = data;
    }
  } catch (e) {}

  // Read fallback storage
  const fileAnomalies = readFallback();

  // Merge with fallback anomalies
  const combined = [...dbAnomalies];
  const seenIds = new Set(dbAnomalies.map((a) => a.id));

  for (const item of fileAnomalies) {
    if (!institutionId || item.institution_id === institutionId) {
      if (!seenIds.has(item.id)) {
        combined.push(item);
      }
    }
  }

  return combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

module.exports = {
  checkIssuanceAnomaly,
  getAnomalyFlags,
};
