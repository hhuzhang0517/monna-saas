"use client";

import { useEffect } from 'react';
import { useLanguage } from '@/lib/contexts/language-context';

declare global {
  interface Window {
    chatwootSDK?: {
      run: (config: {
        websiteToken: string;
        baseUrl: string;
        locale?: string;
      }) => void;
    };
    $chatwoot?: {
      toggle: () => void;
      isOpen: boolean;
      setLocale: (locale: string) => void;
    };
  }
}

// Chatwoot 支持的语言映射
// 文档: https://www.chatwoot.com/docs/product/others/languages
const CHATWOOT_LOCALE_MAP: Record<string, string> = {
  'en': 'en',       // English
  'zh': 'zh_CN',    // 简体中文
  'ja': 'ja',       // 日本語
  'ko': 'ko',       // 한국어
  'fr': 'fr',       // Français
  'es': 'es',       // Español
  'de': 'de',       // Deutsch
};

export function ChatwootWidget() {
  const { currentLanguage } = useLanguage();

  useEffect(() => {
    // 防止重复加载
    if (window.chatwootSDK) {
      // 如果已经加载，只更新语言
      if (window.$chatwoot && window.$chatwoot.setLocale) {
        const chatwootLocale = CHATWOOT_LOCALE_MAP[currentLanguage] || 'en';
        window.$chatwoot.setLocale(chatwootLocale);
        console.log('[Chatwoot] Language updated to:', chatwootLocale);
      }
      return;
    }

    // 获取 Chatwoot 语言代码
    const chatwootLocale = CHATWOOT_LOCALE_MAP[currentLanguage] || 'en';

    // 创建并加载 Chatwoot SDK 脚本
    const script = document.createElement('script');
    const firstScript = document.getElementsByTagName('script')[0];

    script.src = 'https://app.chatwoot.com/packs/js/sdk.js';
    script.async = true;

    script.onload = () => {
      if (window.chatwootSDK) {
        window.chatwootSDK.run({
          websiteToken: 'DTenNdy8UQoaHejf5dQai2dH',
          baseUrl: 'https://app.chatwoot.com',
          locale: chatwootLocale
        });
        console.log('[Chatwoot] Initialized with locale:', chatwootLocale);
      }
    };

    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    }

    // 清理函数（可选）
    return () => {
      // Chatwoot 脚本会自动管理其生命周期，通常不需要手动清理
    };
  }, [currentLanguage]); // 当语言改变时重新运行

  return null; // 这个组件不渲染任何可见内容
}
