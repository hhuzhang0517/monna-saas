import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

export type Language = 'zh-CN' | 'en-US' | 'ja-JP';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_KEY = '@monna_language';

// Import translations (we'll create this file next)
import { translations } from '@/lib/i18n/translations';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('zh-CN');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (saved) {
        setLanguageState(saved as Language);
      } else {
        // Detect system language - handle undefined/null safely
        const locale = Localization.locale ?? Localization.getLocales()?.[0]?.languageCode ?? 'en';
        const localeStr = typeof locale === 'string' ? locale : 'en';

        if (localeStr.startsWith('zh')) {
          setLanguageState('zh-CN');
        } else if (localeStr.startsWith('ja')) {
          setLanguageState('ja-JP');
        } else {
          setLanguageState('en-US');
        }
      }
    } catch (error) {
      console.error('Error loading language:', error);
      // Default to Chinese on error
      setLanguageState('zh-CN');
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      value = value?.[k];
    }

    return value || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
