import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { generateMedia } from "@/inngest/functions/generate";
import { cleanupJobs } from "@/inngest/functions/cleanup";
import { generateLongVideo } from "@/inngest/functions/generate-long-video";

/**
 * Inngest 测试端点 - 不进行签名验证
 * ⚠️ 仅用于调试，不要在生产环境长期使用
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateMedia, cleanupJobs, generateLongVideo],
  // 明确指定不使用签名验证（仅用于测试）
  signingKey: undefined,
});
