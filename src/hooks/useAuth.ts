import { useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { ADMIN_EMAILS } from '@/lib/constants';

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
      // Reset role cache so a future login re-checks roles reliably
      lastRoleCheckKeyRef.current = '';
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setRoleLoading(false);
    };

    const ensureCoreAdmin = async (u: User, currentSession: Session | null) => {
      const email = (u.email ?? '').toLowerCase();
      if (!email || !ADMIN_EMAILS.includes(email)) return;

      // Only call edge function if we have a valid session with access token
      if (!currentSession?.access_token) {
        console.log('Skipping ensureCoreAdmin: no valid session');
        return;
      }

      try {
        // Server-side self-heal: guarantees that the core admin emails always
        // have the admin role even if it was removed accidentally.
        await supabase.functions.invoke('ensure-core-admin', {
          headers: {
            // Be explicit: prevents supabase-js from falling back to the anon JWT
            // (which has no `sub` claim and causes bad_jwt/missing sub in getClaims).
            Authorization: `Bearer ${currentSession.access_token}`,
          },
        });
      } catch (err) {
        // Ignore: we still fall back to the normal role check.
        console.log('ensureCoreAdmin error (ignored):', err);
      }
    };

    const checkAdminRole = async (nextUser: User, currentSession: Session | null) => {
      const key = `admin:${nextUser.id}`;
      // Prevent duplicate concurrent checks for the same user, but do NOT
      // permanently cache across logouts/logins (Android can rehydrate late).
      if (lastRoleCheckKeyRef.current === key && roleLoading) return;
      lastRoleCheckKeyRef.current = key;

      if (mountedRef.current) setRoleLoading(true);

      try {
        await ensureCoreAdmin(nextUser, currentSession);

        // Use the SECURITY DEFINER function to avoid any RLS issues on user_roles
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: nextUser.id,
          _role: 'admin',
        });

        const hasAdminRole = !error && data === true;
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
        // New session => force role re-check (fixes "logged out and became user" cases)
        lastRoleCheckKeyRef.current = '';
        // Defer role check (avoid making Supabase calls inside callback)
        setTimeout(() => {
          if (mountedRef.current) void checkAdminRole(nextSession.user, nextSession);
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
          // Session restored => force role re-check (fixes late rehydration on Android)
          lastRoleCheckKeyRef.current = '';
          void checkAdminRole(data.session.user, data.session);
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
      lastRoleCheckKeyRef.current = '';
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
