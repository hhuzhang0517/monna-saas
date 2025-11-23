/**
 * Structured Data Component
 * 用于在页面中注入 JSON-LD 结构化数据
 */

import Script from 'next/script';
import { generateStructuredDataScript } from '@/lib/seo/structured-data';

interface StructuredDataProps {
  data: object | object[];
}

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <Script
      id="structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={generateStructuredDataScript(data)}
      strategy="beforeInteractive"
    />
  );
}
