'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, SupportedLanguage, TranslationKey } from '@/lib/i18n/translations';

interface LanguageContextType {
  currentLanguage: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  supportedLanguages: { code: SupportedLanguage; name: string; flag: string }[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const SUPPORTED_LANGUAGES = [
  { code: 'en' as SupportedLanguage, name: 'English', flag: '🇺🇸' },
  { code: 'zh' as SupportedLanguage, name: '中文', flag: '🇨🇳' },
  { code: 'ja' as SupportedLanguage, name: '日本語', flag: '🇯🇵' },
  { code: 'ko' as SupportedLanguage, name: '한국어', flag: '🇰🇷' },
  { code: 'fr' as SupportedLanguage, name: 'Français', flag: '🇫🇷' },
  { code: 'es' as SupportedLanguage, name: 'Español', flag: '🇪🇸' },
  { code: 'de' as SupportedLanguage, name: 'Deutsch', flag: '🇩🇪' },
];

// 检测浏览器语言
function detectBrowserLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'en';

  const browserLang = navigator.language.toLowerCase();

  if (browserLang.startsWith('zh')) return 'zh';
  if (browserLang.startsWith('ja')) return 'ja';
  if (browserLang.startsWith('ko')) return 'ko';
  if (browserLang.startsWith('fr')) return 'fr';
  if (browserLang.startsWith('es')) return 'es';
  if (browserLang.startsWith('de')) return 'de';
  return 'en';
}

// 从本地存储获取语言设置
function getStoredLanguage(): SupportedLanguage | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem('monna-language');
    if (stored && ['en', 'zh', 'ja', 'ko', 'fr', 'es', 'de'].includes(stored)) {
      return stored as SupportedLanguage;
    }
  } catch (error) {
    console.warn('Failed to read language from localStorage:', error);
  }

  return null;
}

// 保存语言设置到本地存储
function saveLanguageToStorage(language: SupportedLanguage) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('monna-language', language);
  } catch (error) {
    console.warn('Failed to save language to localStorage:', error);
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');
  const [isInitialized, setIsInitialized] = useState(false);

  // 初始化语言设置
  useEffect(() => {
    const storedLanguage = getStoredLanguage();
    const initialLanguage = storedLanguage || detectBrowserLanguage();
    
    setCurrentLanguage(initialLanguage);
    setIsInitialized(true);
  }, []);

  // 更新语言设置
  const setLanguage = (language: SupportedLanguage) => {
    setCurrentLanguage(language);
    saveLanguageToStorage(language);
  };

  // 翻译函数
  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    try {
      let translation = translations[currentLanguage][key] || translations.en[key] || key;
      
      // 处理参数替换
      if (params) {
        Object.entries(params).forEach(([paramKey, value]) => {
          translation = translation.replace(`{${paramKey}}`, String(value));
        });
      }
      
      return translation;
    } catch (error) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
  };

  const value: LanguageContextType = {
    currentLanguage,
    setLanguage,
    t,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };

  // 避免水合错误，在客户端初始化前不渲染
  if (!isInitialized) {
    return null;
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// 便捷hook用于翻译
export function useTranslation() {
  const { t } = useLanguage();
  return { t };
}