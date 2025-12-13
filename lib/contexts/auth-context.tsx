'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

interface AuthContextType {
  user: any;
  userProfile: any;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        // Check for auth refresh cookie first
        const authRefreshCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('auth-refresh='))
          ?.split('=')[1];
          
        if (authRefreshCookie) {
          console.log('AuthContext: Auth refresh needed, clearing state');
          setUser(null);
          // Force session refresh
          await supabase.auth.refreshSession();
        }
        
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;
        
        console.log('AuthContext initial session:', session?.user?.email || 'No user');
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('Auth state change:', event, session?.user?.email || 'No user');
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserProfile();
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async () => {
    try {
      // 先检查是否有 session，避免不必要的 API 调用
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.log('AuthContext: No session, skipping profile fetch');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/user', {
        credentials: 'include'
      });
      if (response.ok) {
        const userData = await response.json();
        setUserProfile(userData);
      } else {
        console.log('AuthContext: Failed to fetch profile, status:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    userProfile,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}