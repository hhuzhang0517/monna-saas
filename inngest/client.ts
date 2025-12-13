import { Inngest } from "inngest";

// Inngest 客户端配置
// - eventKey: 用于发送事件到 Inngest Cloud
// - signingKey: SDK 会自动从环境变量 INNGEST_SIGNING_KEY 读取，不需要手动传入
export const inngest = new Inngest({
  id: "monna-saas",
  name: "monna-saas",
  eventKey: process.env.INNGEST_EVENT_KEY
});