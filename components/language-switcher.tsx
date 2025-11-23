'use client';

import { useState } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { useLanguage } from '@/lib/contexts/language-context';
import { Button } from '@/components/ui/button';

interface LanguageSwitcherProps {
  variant?: 'default' | 'minimal' | 'icon-only';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  theme?: 'light' | 'dark';
}

export function LanguageSwitcher({ variant = 'default', size = 'md', className = '', theme = 'light' }: LanguageSwitcherProps) {
  const { currentLanguage, setLanguage, supportedLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = supportedLanguages.find(lang => lang.code === currentLanguage);

  const handleLanguageChange = (languageCode: string) => {
    setLanguage(languageCode as any);
    setIsOpen(false);
  };

  // 将自定义 size 映射到 Button 组件接受的 size
  const buttonSize = size === 'md' ? 'default' : size as 'sm' | 'lg';

  if (variant === 'icon-only') {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size={buttonSize}
          onClick={() => setIsOpen(!isOpen)}
          className="p-2"
        >
          <Globe className="h-4 w-4" />
        </Button>
        
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[120px]">
              {supportedLanguages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${
                    currentLanguage === language.code ? 'bg-gray-50 font-medium' : ''
                  }`}
                >
                  <span>{language.flag}</span>
                  <span>{language.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (variant === 'minimal') {
    const buttonClasses = theme === 'dark' 
      ? "flex items-center gap-1 px-2 py-1 text-sm text-white hover:text-blue-200 hover:bg-white/10 rounded transition-colors drop-shadow-md"
      : "flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors";
    
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={buttonClasses}
        >
          <span>{currentLang?.flag}</span>
          <span>{currentLang?.name}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
        
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute left-0 top-full mt-1 z-20 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-md shadow-lg py-1 min-w-[120px]">
              {supportedLanguages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-gray-900 ${
                    currentLanguage === language.code ? 'bg-gray-50 font-medium' : ''
                  }`}
                >
                  <span>{language.flag}</span>
                  <span>{language.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size={buttonSize}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <span>{currentLang?.flag}</span>
        <span className="hidden sm:inline">{currentLang?.name}</span>
        <ChevronDown className="h-4 w-4" />
      </Button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[140px]">
            {supportedLanguages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3 transition-colors ${
                  currentLanguage === language.code ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-700'
                }`}
              >
                <span className="text-lg">{language.flag}</span>
                <span>{language.name}</span>
                {currentLanguage === language.code && (
                  <span className="ml-auto text-orange-600">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}