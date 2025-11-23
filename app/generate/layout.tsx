import type { Metadata } from 'next';
import { getPageMetadata, getCanonicalUrl } from '@/lib/seo/config';

// SEO 元数据
export const metadata: Metadata = {
  title: getPageMetadata('generate', 'zh').title,
  description: getPageMetadata('generate', 'zh').description,
  alternates: {
    canonical: getCanonicalUrl('/generate'),
    languages: {
      'zh-CN': getCanonicalUrl('/generate', 'zh'),
      'en-US': getCanonicalUrl('/generate', 'en'),
    },
  },
  openGraph: {
    title: getPageMetadata('generate', 'zh').title,
    description: getPageMetadata('generate', 'zh').description,
    url: getCanonicalUrl('/generate'),
  },
};

export default function GenerateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {children}
    </div>
  );
}