import { NextResponse } from "next/server";

/**
 * Inngest 调试端点
 * 用于检查生产环境中的环境变量配置
 *
 * ⚠️ 仅用于调试，部署后应立即删除此文件
 */
export async function GET() {
  const eventKey = process.env.INNGEST_EVENT_KEY;
  const signingKey = process.env.INNGEST_SIGNING_KEY;

  // 检查所有可能的 Inngest 环境变量
  const allInngestEnvs: Record<string, string | undefined> = {};
  for (const key in process.env) {
    if (key.toUpperCase().includes('INNGEST')) {
      const value = process.env[key];
      allInngestEnvs[key] = value ? value.substring(0, 15) + "..." : undefined;
    }
  }

  return NextResponse.json({
    debug: {
      hasEventKey: !!eventKey,
      eventKeyPrefix: eventKey ? eventKey.substring(0, 10) + "..." : "NOT_SET",
      eventKeyLength: eventKey?.length || 0,

      hasSigningKey: !!signingKey,
      signingKeyPrefix: signingKey ? signingKey.substring(0, 15) + "..." : "NOT_SET",
      signingKeyLength: signingKey?.length || 0,
      signingKeyFormat: signingKey?.startsWith("signkey-") ? "CORRECT" : "INCORRECT",

      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,

      allInngestEnvVars: allInngestEnvs,
    },
    warning: "⚠️ This endpoint exposes sensitive configuration. Delete after debugging!"
  });
}
