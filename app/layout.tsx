import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/lib/contexts/auth-context';
import { LanguageProvider } from '@/lib/contexts/language-context';

export const metadata: Metadata = {
  title: 'Monna AI - AI头像生成平台',
  description: 'AI驱动的专业头像和图像生成平台，创建高质量个人头像。'
};

export const viewport: Viewport = {
  maximumScale: 1
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh"
      className="bg-white dark:bg-gray-950 text-black dark:text-white">
      <body className="min-h-[100dvh] bg-gray-50 font-sans">
        <LanguageProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
