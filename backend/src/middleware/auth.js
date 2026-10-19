const { supabase } = require('../config/supabase');
const db = require('../config/database');

/**
 * Authentication Middleware
 * Validates Supabase Auth tokens and derives identity & authoritative role/profile from Neon PostgreSQL.
 *
 * Requirements:
 * 1. Bearer token: Authorization: Bearer <supabase_jwt>
 * 2. In non-production environments only: x-user-id header simulation for automated test suites.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data?.user) {
        return res.status(401).json({ error: 'Invalid or expired authentication token.' });
      }

      const authUser = data.user;
      let userRole = authUser.user_metadata?.role || 'student';
      let institutionId = authUser.user_metadata?.institution_id || null;
      let fullName = authUser.user_metadata?.fullName || null;
      let email = authUser.email;

      // Authoritative lookup from Neon PostgreSQL
      if (db.isConfigured) {
        try {
          const result = await db.query(
            'SELECT id, email, role, institution_id, full_name FROM users WHERE id = $1',
            [authUser.id]
          );
          if (result.rows.length > 0) {
            const dbUser = result.rows[0];
            userRole = dbUser.role || userRole;
            institutionId = dbUser.institution_id || institutionId;
            fullName = dbUser.full_name || fullName;
            email = dbUser.email || email;
          }
        } catch (dbErr) {
          // If query fails, fall back to validated token identity
          console.warn('Authoritative profile lookup from Neon failed:', dbErr.message);
        }
      }

      req.user = {
        id: authUser.id,
        email,
        role: userRole,
        institution_id: institutionId,
        full_name: fullName,
      };

      return next();
    }

    // Development & Test Environment Identity Simulation
    // Prohibited in production environments to prevent authentication bypass
    const isProduction = process.env.NODE_ENV === 'production';
    const simulatedUserId = req.headers['x-user-id'];

    if (simulatedUserId) {
      if (isProduction) {
        return res.status(401).json({
          error: 'Simulated authentication headers are strictly prohibited in production environments.',
        });
      }

      let role = req.headers['x-user-role'] || 'institution';
      let email = req.headers['x-user-email'] || `user-${simulatedUserId.slice(0, 8)}@institution.edu`;
      let institutionId = req.headers['x-institution-id'] || null;
      let fullName = null;

      // Query Neon for simulated user if database is available
      if (db.isConfigured) {
        try {
          const result = await db.query(
            'SELECT id, email, role, institution_id, full_name FROM users WHERE id = $1',
            [simulatedUserId]
          );
          if (result.rows.length > 0) {
            const dbUser = result.rows[0];
            role = dbUser.role || role;
            email = dbUser.email || email;
            if (dbUser.institution_id) institutionId = dbUser.institution_id;
            fullName = dbUser.full_name || fullName;
          }
        } catch (_) {}
      }

      req.user = {
        id: simulatedUserId,
        email,
        role,
        institution_id: institutionId,
        full_name: fullName,
      };

      return next();
    }

    return res.status(401).json({
      error: 'Authentication required. Please provide a valid Authorization Bearer token.',
    });
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Internal authentication error', details: err.message });
  }
}

/**
 * Middleware factory for role-based authorization.
 * e.g. requireRole('regulator'), requireRole(['institution', 'regulator'])
 */
function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of the following roles: [${roles.join(', ')}]. Current role: '${req.user.role}'`,
      });
    }

    next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
