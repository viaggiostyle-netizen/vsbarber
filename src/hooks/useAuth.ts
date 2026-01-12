import { useState, useEffect, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Track if initial load is complete (important for mobile)
  const initialLoadComplete = useRef(false);

  useEffect(() => {
    let mounted = true;

    const checkAdminRole = async (userId: string): Promise<boolean> => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle();

        const hasAdminRole = !error && data !== null;
        if (mounted) {
          setIsAdmin(hasAdminRole);
          setRoleLoading(false);
        }
        return hasAdminRole;
      } catch (e) {
        console.error('Error checking admin role:', e);
        if (mounted) {
          setIsAdmin(false);
          setRoleLoading(false);
        }
        return false;
      }
    };

    const initializeAuth = async () => {
      try {
        // Get existing session first (critical for mobile page refreshes)
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (existingSession?.user) {
          setSession(existingSession);
          setUser(existingSession.user);
          // Wait for role check before marking auth as complete
          await checkAdminRole(existingSession.user.id);
        } else {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setRoleLoading(false);
        }
        
        setAuthLoading(false);
        initialLoadComplete.current = true;
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setAuthLoading(false);
          setRoleLoading(false);
        }
      }
    };

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      // Only handle changes after initial load to prevent race conditions on mobile
      if (!initialLoadComplete.current) return;
      
      if (!mounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      // Defer role check to avoid Supabase deadlock
      if (currentSession?.user) {
        setTimeout(() => {
          if (mounted) {
            void checkAdminRole(currentSession.user.id);
          }
        }, 0);
      } else {
        setIsAdmin(false);
        setRoleLoading(false);
      }
    });

    // Initialize auth
    void initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setIsAdmin(false);
    }
    return { error };
  };

  return {
    user,
    session,
    loading: authLoading || roleLoading,
    isAdmin,
    signIn,
    signUp,
    signOut,
  };
}
