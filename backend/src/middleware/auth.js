const { supabase } = require('../config/supabase');

/**
 * Authentication Middleware
 * Supports:
 * 1. Standard Supabase Bearer token: Authorization: Bearer <token>
 * 2. Testing / Simulation header: x-user-id: <uuid> (and optional x-user-email, x-user-role)
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

      let institution_id = data.user.user_metadata?.institution_id || null;

      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select('institution_id')
          .eq('id', data.user.id)
          .maybeSingle();
        if (dbUser && dbUser.institution_id) {
          institution_id = dbUser.institution_id;
        }
      } catch (e) {}

      req.user = {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role || 'institution',
        institution_id,
      };
      return next();
    }

    // Development & Automated Test Header Simulation
    const simulatedUserId = req.headers['x-user-id'];
    if (simulatedUserId) {
      // Optional: check public.users to enrich profile
      let role = req.headers['x-user-role'] || 'institution';
      let email = req.headers['x-user-email'] || `user-${simulatedUserId.slice(0, 8)}@institution.edu`;
      let institution_id = req.headers['x-institution-id'] || null;

      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select('id, email, role, institution_id')
          .eq('id', simulatedUserId)
          .maybeSingle();

        if (dbUser) {
          role = dbUser.role || role;
          email = dbUser.email || email;
          if (dbUser.institution_id) institution_id = dbUser.institution_id;
        }
      } catch (e) {
        // Silently continue if database lookup fails
      }

      req.user = {
        id: simulatedUserId,
        email,
        role,
        institution_id,
      };
      return next();
    }

    return res.status(401).json({
      error: 'Authentication required. Please provide an Authorization Bearer token or x-user-id header.',
    });
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Internal authentication error', details: err.message });
  }
}

module.exports = {
  requireAuth,
};
