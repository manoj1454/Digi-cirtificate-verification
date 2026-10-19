import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
  const apiUrl = rawApiUrl.replace(/\/+$/, '');

  // Helper to obtain current Supabase session access token
  const getAccessToken = async () => {
    if (!isSupabaseConfigured) return null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch (_) {
      return null;
    }
  };

  // Synchronize profile to Neon PostgreSQL via Express API
  const syncUserProfile = async (profileData, token = null) => {
    try {
      const authToken = token || (await getAccessToken());
      if (!authToken) return null;

      const res = await fetch(`${apiUrl}/api/users/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(profileData),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setRole(data.role || data.profile.role);
          setProfile(data.profile);
          return data;
        }
      }
    } catch (err) {
      console.warn('Profile synchronization via Express API warning:', err);
    }
    return null;
  };

  // Fetch role and profile for an authenticated user via Express API (Neon backend)
  const fetchUserProfile = async (userId, fallbackRole = null, token = null, userMeta = {}) => {
    if (!isSupabaseConfigured) {
      setRole(fallbackRole || 'student');
      return;
    }

    try {
      const authToken = token || (await getAccessToken());
      if (!authToken) {
        if (fallbackRole) setRole(fallbackRole);
        return;
      }

      const res = await fetch(`${apiUrl}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setRole(data.role || data.profile.role);
          setProfile(data.profile);
          return data;
        } else if (data.needsProfileInit) {
          // Profile not yet in Neon (e.g. initial login after asynchronous email confirmation)
          const syncPayload = {
            role: fallbackRole || userMeta.role || 'student',
            fullName: userMeta.fullName || userMeta.full_name,
            institutionName: userMeta.institutionName,
            registrationNumber: userMeta.registrationNumber,
            rollNumber: userMeta.rollNumber,
            institutionId: userMeta.institution_id || userMeta.institutionId,
          };
          return await syncUserProfile(syncPayload, authToken);
        }
      }

      if (fallbackRole) setRole(fallbackRole);
    } catch (err) {
      console.error('Error in fetchUserProfile via API:', err);
      if (fallbackRole) setRole(fallbackRole);
    }
  };

  useEffect(() => {
    // Check active session on load
    const initializeAuth = async () => {
      setLoading(true);

      // Check if demo user saved in local storage
      const savedDemoRole = localStorage.getItem('veriCert_demo_role');
      if (savedDemoRole) {
        setDemoMode(true);
        setRole(savedDemoRole);
        setUser({
          id: `demo-${savedDemoRole}-uuid`,
          email: `demo.${savedDemoRole}@example.com`,
          role: savedDemoRole,
        });
        setLoading(false);
        return;
      }

      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const metaRole = session.user.user_metadata?.role;
          await fetchUserProfile(
            session.user.id,
            metaRole,
            session.access_token,
            session.user.user_metadata || {}
          );
        }
      } catch (err) {
        console.error('Session initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    if (!isSupabaseConfigured) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          const metaRole = session.user.user_metadata?.role;
          await fetchUserProfile(
            session.user.id,
            metaRole,
            session.access_token,
            session.user.user_metadata || {}
          );
        } else if (!localStorage.getItem('veriCert_demo_role')) {
          setUser(null);
          setRole(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Sign Up with Supabase Auth + Neon Profile synchronization via Express API
  const signUp = async (email, password, selectedRole, extraData = {}) => {
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured yet. Please add your credentials to frontend/.env or use Demo Login below.'
      );
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: selectedRole,
          ...extraData,
        },
      },
    });

    if (error) throw error;

    if (data?.user) {
      setUser(data.user);
      setRole(selectedRole);

      // If session is immediately available (auto-confirm enabled), sync profile with Neon now
      if (data.session?.access_token) {
        await syncUserProfile(
          {
            role: selectedRole,
            fullName: extraData.fullName,
            institutionName: extraData.institutionName,
            registrationNumber: extraData.registrationNumber,
            rollNumber: extraData.rollNumber,
            institutionId: extraData.institutionId,
          },
          data.session.access_token
        );
      }
      // If email confirmation is required and no session yet, profile will automatically sync on first signIn
    }

    return data;
  };

  // Sign In with Supabase Auth
  const signIn = async (email, password) => {
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured yet. Please add your credentials to frontend/.env or use Demo Login below.'
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data?.user) {
      setUser(data.user);
      const metaRole = data.user.user_metadata?.role;
      await fetchUserProfile(
        data.user.id,
        metaRole,
        data.session?.access_token,
        data.user.user_metadata || {}
      );
    }

    return data;
  };

  // Sign Out
  const signOut = async () => {
    localStorage.removeItem('veriCert_demo_role');
    setDemoMode(false);
    setUser(null);
    setRole(null);
    setProfile(null);

    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
  };

  // Switch/Set Demo Role for testing without Supabase credentials
  const loginAsDemoRole = (targetRole) => {
    localStorage.setItem('veriCert_demo_role', targetRole);
    setDemoMode(true);
    setRole(targetRole);
    setUser({
      id: `demo-${targetRole}-uuid`,
      email: `demo.${targetRole}@vericert.network`,
      role: targetRole,
    });
  };

  const getDashboardPath = (targetRole = role) => {
    switch (targetRole) {
      case 'regulator':
        return '/regulator';
      case 'institution':
        return '/institution';
      case 'student':
        return '/student';
      case 'company':
        return '/company';
      default:
        return '/login';
    }
  };

  const value = {
    user,
    role,
    profile,
    loading,
    demoMode,
    isSupabaseConfigured,
    signUp,
    signIn,
    signOut,
    loginAsDemoRole,
    getDashboardPath,
    syncUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
