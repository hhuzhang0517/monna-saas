'use client';

import { useState, useEffect } from 'react';

// 全局状态，避免每个组件重复请求
let globalAuthState = {
  user: null as any,
  loading: true,
  initialized: false
};

const listeners = new Set<() => void>();

async function checkAuthStatus() {
  try {
    const response = await fetch('/api/auth/status', {
      cache: 'no-store',
      credentials: 'include'
    });
    
    const serverAuthStatus = await response.json();
    console.log('🔍 Global auth status check:', serverAuthStatus);
    
    if (serverAuthStatus.hasUser && serverAuthStatus.user !== 'No user') {
      console.log('✅ User found:', serverAuthStatus.user);
      globalAuthState = {
        user: { email: serverAuthStatus.user },
        loading: false,
        initialized: true
      };
    } else {
      console.log('❌ No user');
      globalAuthState = {
        user: null,
        loading: false,
        initialized: true
      };
    }
    
    // 通知所有监听器
    listeners.forEach(listener => listener());
  } catch (error) {
    console.error('Auth status check failed:', error);
    globalAuthState = {
      user: null,
      loading: false,
      initialized: true
    };
    listeners.forEach(listener => listener());
  }
}

export function useAuthStatus() {
  const [state, setState] = useState(globalAuthState);

  useEffect(() => {
    const listener = () => setState({ ...globalAuthState });
    listeners.add(listener);

    // 如果还没初始化，执行检查
    if (!globalAuthState.initialized) {
      checkAuthStatus();
    }

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const refresh = () => {
    globalAuthState.loading = true;
    setState({ ...globalAuthState });
    checkAuthStatus();
  };

  return { 
    user: state.user, 
    loading: state.loading, 
    refresh 
  };
}