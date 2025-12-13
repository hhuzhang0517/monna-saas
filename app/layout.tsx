import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/lib/contexts/auth-context';
import { LanguageProvider } from '@/lib/contexts/language-context';
import { SITE_CONFIG, DEFAULT_SEO_ZH, getCanonicalUrl } from '@/lib/seo/config';
import Script from 'next/script';
import {
  getOrganizationSchema,
  getWebSiteSchema,
  getSoftwareApplicationSchema,
  generateStructuredDataScript,
} from '@/lib/seo/structured-data';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: DEFAULT_SEO_ZH.title,
    template: '%s - Monna AI',
  },
  description: DEFAULT_SEO_ZH.description,
  keywords: DEFAULT_SEO_ZH.keywords,
  authors: [{ name: 'Monna AI' }],
  creator: 'Monna AI',
  publisher: 'Monna AI',

  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: SITE_CONFIG.url,
    siteName: SITE_CONFIG.name,
    title: DEFAULT_SEO_ZH.title,
    description: DEFAULT_SEO_ZH.description,
    images: [
      {
        url: '/figma-designs/monna_logo.png',
        width: 1200,
        height: 630,
        alt: 'Monna AI Logo',
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_SEO_ZH.title,
    description: DEFAULT_SEO_ZH.description,
    images: ['/figma-designs/monna_logo.png'],
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Icons
  icons: {
    icon: '/figma-designs/monna_logo.png',
    apple: '/figma-designs/monna_logo.png',
  },

  // Verification (添加实际的验证码)
  // verification: {
  //   google: 'google-site-verification-code',
  //   yandex: 'yandex-verification-code',
  //   bing: 'bing-verification-code',
  // },

  // Alternate languages
  alternates: {
    canonical: getCanonicalUrl('/'),
    languages: {
      'zh-CN': getCanonicalUrl('/', 'zh'),
      'en-US': getCanonicalUrl('/', 'en'),
    },
  },
};

export const viewport: Viewport = {
  maximumScale: 1,
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // 准备结构化数据
  const structuredData = [
    getOrganizationSchema(),
    getWebSiteSchema(),
    getSoftwareApplicationSchema(),
  ];

  return (
    <html
      lang="zh-CN"
      className="bg-white dark:bg-gray-950 text-black dark:text-white">
      <head>
        {/* 结构化数据 (JSON-LD) */}
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={generateStructuredDataScript(structuredData)}
          strategy="beforeInteractive"
        />
      </head>
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
