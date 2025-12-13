// app/delete-account/page.tsx
export const metadata = {
  title: "Delete Account | Monna AI",
  description:
    "Request deletion of your Monna AI account and associated data (XROTING TECHNOLOGY LLC).",
};

const SUPPORT_EMAIL = "privacy@xroting.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-zinc-700">{children}</div>
    </section>
  );
}

export default function DeleteAccountPage({
  searchParams,
}: {
  searchParams?: { lang?: string; done?: string; error?: string };
}) {
  const lang = (searchParams?.lang || "zh").toLowerCase(); // zh | en
  const isEN = lang === "en";

  const title = isEN ? "Delete your Monna AI account" : "删除你的 Monna AI 账号";
  const subtitle = isEN
    ? "This page is the official web resource for account deletion requests for Monna AI (XROTING TECHNOLOGY LLC)."
    : "本页面是 Monna AI（XROTING TECHNOLOGY LLC）用于账号删除请求的官方网页入口。";

  const success = searchParams?.done === "1";
  const error = searchParams?.error;

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
            <p className="mt-2 text-sm text-zinc-600">{subtitle}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {isEN ? "App/Developer name:" : "应用/开发者名称："} Monna AI / XROTING TECHNOLOGY LLC
            </p>
          </div>
          <div className="flex gap-2">
            <a
              className={`rounded-xl px-3 py-1.5 text-sm ${!isEN ? "bg-zinc-900 text-white" : "bg-white border"}`}
              href="/delete-account?lang=zh"
            >
              中文
            </a>
            <a
              className={`rounded-xl px-3 py-1.5 text-sm ${isEN ? "bg-zinc-900 text-white" : "bg-white border"}`}
              href="/delete-account?lang=en"
            >
              English
            </a>
          </div>
        </div>

        {success && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {isEN
              ? "Request received. Please check your email to confirm the deletion."
              : "请求已提交。请检查邮箱并点击确认链接以完成删除请求。"}
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {isEN ? `Error: ${error}` : `错误：${error}`}
          </div>
        )}

        <div className="mt-8 grid gap-4">
          <Section title={isEN ? "Before you delete" : "删除前请注意"}>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                {isEN
                  ? "If you subscribed via Google Play or Apple App Store, billing is handled by the store. Please cancel your subscription in the store before deleting your account."
                  : "如果你通过 Google Play 或 Apple App Store 订阅，扣费由应用商店管理。建议先在应用商店取消订阅，再删除账号。"}
              </li>
              <li>
                {isEN
                  ? "We may retain certain records for security, fraud prevention, or legal/compliance needs, and will inform you below."
                  : "出于安全、反欺诈或法律合规需要，我们可能会保留少量必要记录，具体见下方说明。"}
              </li>
            </ul>
          </Section>

          <Section title={isEN ? "Request account deletion" : "发起账号删除请求"}>
            <p>
              {isEN
                ? "Enter the email associated with your Monna AI account. We will send a confirmation link to verify you are the account owner."
                : "请输入与你 Monna AI 账号绑定的邮箱。我们会发送确认链接，用于验证你是账号所有者。"}
            </p>

            <form className="mt-4 grid gap-3" method="POST" action="/api/account-deletion/request">
              <input type="hidden" name="lang" value={isEN ? "en" : "zh"} />
              <label className="grid gap-1">
                <span className="text-xs text-zinc-600">{isEN ? "Email" : "邮箱"}</span>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder={isEN ? "you@example.com" : "you@example.com"}
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/20"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-zinc-600">{isEN ? "Reason (optional)" : "原因（可选）"}</span>
                <textarea
                  name="reason"
                  rows={3}
                  placeholder={isEN ? "Why are you leaving? (optional)" : "告诉我们原因（可选）"}
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/20"
                />
              </label>

              <button
                type="submit"
                className="mt-1 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
              >
                {isEN ? "Send confirmation email" : "发送确认邮件"}
              </button>

              <p className="text-xs text-zinc-500">
                {isEN
                  ? "If you no longer have access to your email, contact support: "
                  : "如果你无法访问该邮箱，请联系支持："}
                <a className="underline hover:text-zinc-900" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
              </p>
            </form>
          </Section>

          <Section title={isEN ? "What we delete / what we may retain" : "我们会删除什么 / 可能保留什么"}>
            <div className="grid gap-3">
              <div>
                <div className="font-medium text-zinc-900">{isEN ? "Deleted" : "将删除"}</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>{isEN ? "Account profile and authentication identifiers on our side" : "我们侧的账号资料与身份标识信息"}</li>
                  <li>{isEN ? "Your generated content stored under your account (where applicable)" : "与你账号绑定的生成内容（如适用）"}</li>
                  <li>{isEN ? "Prompts, generation history, and related metadata (where applicable)" : "提示词、生成历史与相关元数据（如适用）"}</li>
                </ul>
              </div>
              <div>
                <div className="font-medium text-zinc-900">{isEN ? "May retain (limited)" : "可能保留（有限）"}</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>{isEN ? "Records needed for security, fraud prevention, or regulatory compliance" : "为安全、反欺诈或合规所必需的记录"}</li>
                  <li>{isEN ? "Payment/invoice records required by law (may be de-identified where possible)" : "法律要求保留的支付/发票记录（可行时做去标识化）"}</li>
                </ul>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                {isEN
                  ? "We will complete requests within a reasonable time and tell you what to expect."
                  : "我们会在合理时间内完成处理，并告知你预计时长与结果确认。"}
              </p>
            </div>
          </Section>

          <Section title={isEN ? "Need help?" : "需要帮助？"}>
            <p>
              {isEN
                ? "Email us and include your account email: "
                : "请邮件联系我们，并注明你的账号邮箱："}
              <a className="underline hover:text-zinc-900" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
            </p>
          </Section>
        </div>

        <p className="mt-8 text-xs text-zinc-500">
          {isEN
            ? "Note: This page supports initiating deletion requests from outside the app, as required by Google Play for apps that enable account creation."
            : "备注：本页面用于在 App 外发起删除请求，满足 Google Play 对支持账号创建的应用所要求的网页入口。"}
        </p>
      </div>
    </main>
  );
}
