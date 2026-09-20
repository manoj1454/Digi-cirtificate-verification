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

  // Fetch role and profile for an authenticated user
  const fetchUserProfile = async (userId, fallbackRole = null) => {
    if (!isSupabaseConfigured) {
      setRole(fallbackRole || 'student');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Could not fetch public.users record:', error.message);
        if (fallbackRole) setRole(fallbackRole);
      } else if (data) {
        setRole(data.role);
        setProfile(data);
      } else if (fallbackRole) {
        setRole(fallbackRole);
      }
    } catch (err) {
      console.error('Error in fetchUserProfile:', err);
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
          await fetchUserProfile(session.user.id, metaRole);
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
          await fetchUserProfile(session.user.id, metaRole);
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

  // Sign Up with Supabase Auth
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
      // In case database trigger isn't applied yet, try explicit insert into public.users
      try {
        await supabase.from('users').upsert({
          id: data.user.id,
          email,
          role: selectedRole,
        });

        // Insert role-specific profile row
        if (selectedRole === 'institution' && extraData.institutionName) {
          const { data: instData } = await supabase.from('institutions').upsert({
            user_id: data.user.id,
            name: extraData.institutionName,
            registration_number: extraData.registrationNumber || 'PENDING-REG',
            status: 'pending',
          }).select().maybeSingle();

          if (instData?.id) {
            try {
              await supabase.from('users').update({ institution_id: instData.id }).eq('id', data.user.id);
            } catch (e) {}
          }
        } else if (selectedRole === 'student' && extraData.fullName) {
          // If institutionId is available, connect it; otherwise placeholder
          await supabase.from('students').upsert({
            user_id: data.user.id,
            full_name: extraData.fullName,
            roll_number: extraData.rollNumber || 'PENDING-ROLL',
            institution_id: extraData.institutionId || null,
          });
        }
      } catch (insertErr) {
        console.warn('Initial profile sync warning (trigger may handle this):', insertErr);
      }

      setUser(data.user);
      setRole(selectedRole);
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
      await fetchUserProfile(data.user.id, metaRole);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
