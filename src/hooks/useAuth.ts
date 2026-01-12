import { useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const mountedRef = useRef(true);
  const initializedRef = useRef(false);
  const lastRoleCheckKeyRef = useRef<string>('');

  useEffect(() => {
    mountedRef.current = true;

    const setAnonymous = () => {
      if (!mountedRef.current) return;
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setRoleLoading(false);
    };

    const checkAdminRole = async (userId: string) => {
      const key = `admin:${userId}`;
      if (lastRoleCheckKeyRef.current === key) return;
      lastRoleCheckKeyRef.current = key;

      if (mountedRef.current) setRoleLoading(true);

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle();

        const hasAdminRole = !error && data !== null;
        if (mountedRef.current) setIsAdmin(hasAdminRole);
      } catch {
        if (mountedRef.current) setIsAdmin(false);
      } finally {
        if (mountedRef.current) setRoleLoading(false);
      }
    };

    // 1) Listener FIRST (prevents missing events on mobile)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mountedRef.current) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      // Mark auth as ready as soon as we hear from the auth system
      if (!initializedRef.current) {
        initializedRef.current = true;
        setAuthLoading(false);
      }

      if (nextSession?.user) {
        // Defer role check (avoid making Supabase calls inside callback)
        setTimeout(() => {
          if (mountedRef.current) void checkAdminRole(nextSession.user.id);
        }, 0);
      } else {
        setAnonymous();
      }
    });

    // 2) Then read current session (critical on refresh / Safari)
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mountedRef.current) return;

        setSession(data.session);
        setUser(data.session?.user ?? null);

        initializedRef.current = true;
        setAuthLoading(false);

        if (data.session?.user) {
          void checkAdminRole(data.session.user.id);
        } else {
          setAnonymous();
        }
      })
      .catch(() => {
        if (!mountedRef.current) return;
        initializedRef.current = true;
        setAuthLoading(false);
        setAnonymous();
      });

    return () => {
      mountedRef.current = false;
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
