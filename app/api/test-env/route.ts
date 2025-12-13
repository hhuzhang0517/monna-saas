import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    // 显示所有 NEXT_PUBLIC_ 开头的环境变量
    allPublicEnvVars: Object.keys(process.env)
      .filter(key => key.startsWith('NEXT_PUBLIC_'))
      .reduce((acc, key) => {
        acc[key] = process.env[key];
        return acc;
      }, {} as Record<string, string | undefined>)
  });
}
