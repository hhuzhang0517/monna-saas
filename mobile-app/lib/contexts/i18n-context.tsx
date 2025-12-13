/**
 * 国际化上下文 - 提供多语言支持
 * 支持中文、英文和日文
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { translations, Language } from '../i18n/translations';

const LANGUAGE_STORAGE_KEY = '@monna_language';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, defaultValue?: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

/**
 * 从设备语言码映射到支持的语言
 */
function getLanguageFromLocale(locale: string): Language {
  // 标准化语言码
  const normalized = locale.toLowerCase().replace('_', '-');

  // 完全匹配
  if (normalized.startsWith('zh')) {
    return 'zh-CN';
  }
  if (normalized.startsWith('ja')) {
    return 'ja-JP';
  }
  if (normalized.startsWith('en')) {
    return 'en-US';
  }

  // 默认使用英文
  return 'en-US';
}

/**
 * 从嵌套对象中获取翻译值
 */
function getNestedTranslation(obj: any, path: string): string | undefined {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en-US');

  // 初始化语言
  useEffect(() => {
    initLanguage();
  }, []);

  const initLanguage = async () => {
    try {
      // 1. 获取设备当前语言
      const deviceLocales = Localization.getLocales();
      const deviceLanguage = deviceLocales[0]?.languageTag || 'en-US';
      const mappedDeviceLanguage = getLanguageFromLocale(deviceLanguage);

      console.log('📱 [i18n] 检测到设备语言:', deviceLanguage);
      console.log('📱 [i18n] 映射到:', mappedDeviceLanguage);

      // 2. 尝试从 AsyncStorage 读取用户选择的语言
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

      // 3. 如果有保存的语言且与设备语言一致，使用保存的语言
      // 如果设备语言发生变化，优先使用设备语言（这样可以响应用户更改系统语言的行为）
      let finalLanguage: Language;

      if (savedLanguage && (savedLanguage === 'zh-CN' || savedLanguage === 'en-US' || savedLanguage === 'ja-JP')) {
        // 检查保存的语言是否与设备语言匹配
        if (savedLanguage === mappedDeviceLanguage) {
          // 语言一致，使用保存的设置
          finalLanguage = savedLanguage as Language;
          console.log('📱 [i18n] 从存储加载语言（与设备一致）:', savedLanguage);
        } else {
          // 设备语言已更改，使用新的设备语言
          finalLanguage = mappedDeviceLanguage;
          console.log('📱 [i18n] 检测到系统语言变化，更新为:', mappedDeviceLanguage);
        }
      } else {
        // 没有保存的语言，使用设备语言
        finalLanguage = mappedDeviceLanguage;
        console.log('📱 [i18n] 首次启动，使用设备语言:', mappedDeviceLanguage);
      }

      setLanguageState(finalLanguage);

      // 保存到 AsyncStorage
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, finalLanguage);
    } catch (error) {
      console.error('❌ [i18n] 初始化语言失败:', error);
      setLanguageState('en-US'); // 失败时默认英文
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      setLanguageState(lang);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      console.log('✅ [i18n] 语言已切换到:', lang);
    } catch (error) {
      console.error('❌ [i18n] 保存语言失败:', error);
    }
  };

  /**
   * 翻译函数
   * @param key - 翻译键，支持嵌套路径如 "common.home"
   * @param defaultValue - 如果找不到翻译则返回的默认值
   */
  const t = (key: string, defaultValue?: string): string => {
    const translation = getNestedTranslation(translations[language], key);

    if (translation) {
      return translation;
    }

    // 如果当前语言没有翻译，尝试使用英文
    if (language !== 'en-US') {
      const fallback = getNestedTranslation(translations['en-US'], key);
      if (fallback) {
        return fallback;
      }
    }

    // 返回默认值或键本身
    return defaultValue || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * 使用翻译的Hook
 */
export function useTranslation() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }

  return context;
}

/**
 * 获取当前语言的Hook
 */
export function useLanguage() {
  const { language, setLanguage } = useTranslation();
  return { language, setLanguage };
}
