'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/contexts/language-context';

export default function PrivacyPolicyPage() {
  const { currentLanguage } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="mb-8">
          <Link
            href="/"
            className="text-orange-600 hover:text-orange-700 text-sm font-medium"
          >
            ← {currentLanguage === 'zh' ? '返回首页' : currentLanguage === 'ja' ? 'ホームに戻る' : 'Back to Home'}
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {currentLanguage === 'zh' ? '隐私政策（Monna AI）' : currentLanguage === 'ja' ? 'プライバシーポリシー（Monna AI）' : 'Privacy Policy (Monna AI)'}
        </h1>

        <div className="prose prose-gray max-w-none">
          {currentLanguage === 'zh' ? (
            // 中文版本
            <>
              <p className="text-sm text-gray-600 mb-6">
                生效日期：2025-9-25<br />
                最后更新：2025-11-28
              </p>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. 运营商信息</h2>
                <p className="text-gray-700 mb-4">
                  本网站及移动端应用（统称"本服务"）由 <strong>XROTING TECHNOLOGY LLC</strong>（以下简称"我们"）运营。
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>网站：<a href="https://www.monna.us" className="text-orange-600 hover:text-orange-700">https://www.monna.us</a></li>
                  <li>隐私联系邮箱：<a href="mailto:privacy@xroting.com" className="text-orange-600 hover:text-orange-700">privacy@xroting.com</a></li>
                  <li>法律联系邮箱：<a href="mailto:legal@xroting.com" className="text-orange-600 hover:text-orange-700">legal@xroting.com</a></li>
                  <li>注册/邮寄地址：30 N Gould St Ste N, Sheridan, WY 82801, United States</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. 本政策适用范围</h2>
                <p className="text-gray-700 mb-4">
                  本政策适用于你使用本服务（包括网页端与移动端 App）期间，我们对你的个人信息/数据的收集、使用、共享、保留与保护方式。
                </p>
                <p className="text-gray-700 mb-4">
                  如你不同意本政策，请立即停止使用本服务。我们可能不时更新本政策，并通过网页公告、应用内提示或邮件通知。你继续使用即表示接受更新后的版本。
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. 账号、资格与未成年人保护</h2>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li><strong>年龄限制</strong>：本服务仅面向 <strong>13 岁及以上</strong>用户。</li>
                  <li>我们不会故意收集 13 岁以下儿童的数据；如发现后将尽快核实并删除。</li>
                  <li>我们致力于遵循适用的未成年人保护要求（例如 COPPA 等）。</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. 我们收集哪些数据</h2>
                <p className="text-gray-700 mb-4">我们收集的数据与场景有关，主要包括：</p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 账户与身份数据</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>邮箱/手机号</li>
                  <li>用户名、显示名称、头像（如你提供）</li>
                  <li>密码（仅以加密/哈希形式存储；我们不会以明文存储密码）</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 支付与订阅数据</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li><strong>网页端</strong>：支付相关信息通常由 <strong>Stripe</strong> 等支付处理商处理；我们会处理与你订单相关的必要信息（如订单号、商品/套餐、支付状态、发票/收据信息、风控结果等）。</li>
                  <li><strong>移动端 App</strong>：订阅/内购可能由 <strong>Apple App Store</strong> 或 <strong>Google Play</strong> 处理；我们可能使用 <strong>RevenueCat</strong> 等订阅管理服务同步订阅状态。我们通常不会直接接触或保存你的完整银行卡号信息，但会处理交易/订阅状态、交易标识、产品 ID、币种/国家或地区等用于对账与提供权益。</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">4.3 使用与技术数据（自动收集）</h3>
                <p className="text-gray-700 mb-4">
                  当你访问或使用本服务时，我们会为<strong>提供服务、安全防护、故障排查与性能优化</strong>自动收集部分技术信息，包括：
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li><strong>日志与网络信息</strong>：IP 地址、访问时间、请求路径、错误码、以及与请求相关的日志标识符；</li>
                  <li><strong>设备与应用信息</strong>：设备型号/制造商、操作系统版本、应用版本、语言与时区设置、浏览器类型 / User-Agent、屏幕与兼容性相关信息；</li>
                  <li><strong>诊断信息</strong>：崩溃日志、性能与稳定性指标（如加载耗时、崩溃堆栈、卡顿与错误日志）。</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  <strong>关于标识符（如适用）</strong>：仅在启用推送通知、反作弊或统计分析等必要场景，我们可能会处理设备/应用实例标识符（例如推送 token、应用实例 ID）。
                  <strong>我们不会在未明确披露并取得你授权/同意的情况下</strong>，出于跨 App/跨网站广告追踪目的收集或使用广告标识符（例如 Android Advertising ID/AAID 等）。若未来我们引入广告归因/广告投放等能力，我们将更新本政策并提供相应选择。
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">4.4 生成内容与交互数据</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>你上传的图片/视频/文本（如你选择上传）</li>
                  <li>生成结果（图片/视频/相关文件）</li>
                  <li>你输入的提示词（prompts）及元数据（如尺寸、时长、模型/版本、参数、任务 ID、失败原因等）</li>
                  <li>你与客服沟通的信息（如邮件、工单、反馈内容）</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. 数据使用目的与法律依据</h2>
                <p className="text-gray-700 mb-4">我们使用上述数据用于：</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>提供、维护与改进服务（含生成图片/视频、队列与任务管理）</li>
                  <li>处理账户注册、登录、身份验证与权限管理</li>
                  <li>处理订单、订阅与计费、对账及欺诈风控</li>
                  <li>提供客户支持与问题定位（含崩溃/错误排查）</li>
                  <li>产品分析、A/B 测试与功能迭代（在适用时基于你的同意或合法利益）</li>
                  <li>安全防护、滥用检测、内容合规与法律合规</li>
                  <li>履行法定义务、响应执法/监管请求</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  如你位于 EEA/UK 等地区，我们会在适用情况下基于：履行合同、你的同意、我们的合法利益或法律义务等作为处理依据。
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Cookies 与本地存储（网页端）</h2>
                <p className="text-gray-700 mb-4">我们可能使用 Cookies/本地存储用于：</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li><strong>必要功能</strong>：登录保持、会话安全、防止欺诈、偏好设置</li>
                  <li><strong>分析用途（如适用）</strong>：在你同意后用于流量统计与产品改进</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  你可以通过浏览器设置管理 Cookies；但禁用必要 Cookies 可能影响服务功能。
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. 数据共享与跨境传输</h2>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">7.1 我们可能与哪些第三方共享数据</h3>
                <p className="text-gray-700 mb-4">
                  为提供服务，我们可能与以下类型第三方共享必要数据（仅限实现目的所需最小范围）：
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li><strong>基础设施/云服务</strong>：数据库、对象存储、CDN、日志平台等（例如 Supabase、CDN/托管服务）</li>
                  <li><strong>支付与订阅</strong>：Stripe、Apple App Store、Google Play、订阅管理服务（如 RevenueCat）</li>
                  <li><strong>日志分析与监控</strong>：用于错误定位、性能监控与安全审计</li>
                  <li><strong>AI 模型/推理服务提供商</strong>：用于处理你发起的生成请求（可能需要处理你上传内容/提示词/任务参数）</li>
                  <li><strong>法律合规与执法请求</strong>：在我们被要求或合理必要时披露</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  <strong>重要说明</strong>：我们的披露范围包括我们自身收集的数据、我们集成的第三方 SDK（如有）在 App 中收集的数据、以及我们后端/云基础设施在提供服务时产生的日志与安全数据。我们会要求第三方处理商按照我们的指示处理数据，并受数据保护/安全条款约束。
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">7.2 跨境传输</h3>
                <p className="text-gray-700 mb-4">
                  如涉及 EEA/UK 等地区数据跨境传输，我们将采用<strong>欧盟标准合同条款（SCCs）</strong>或其他合法机制，并实施适当的传输保护措施。
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. 数据保留与安全措施</h2>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">8.1 保留期限（示例规则）</h3>
                <p className="text-gray-700 mb-4">
                  我们仅在实现目的所需期间或法律要求期间保留数据。一般而言：
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li><strong>访问/安全日志（可能包含 IP）</strong>：通常保留 <strong>30–90 天</strong></li>
                  <li><strong>崩溃/错误与性能诊断日志</strong>：通常保留 <strong>90–180 天</strong></li>
                  <li><strong>生成内容与生成历史</strong>：在你账户有效期间保留；你可自行删除；账号删除后我们将在合理时间内清理（备份副本可能在技术周期内延迟删除，最长不超过 <strong>30–90 天</strong>）</li>
                  <li><strong>订单/发票/审计记录</strong>：按法律与合规要求保留（并在可行时做去标识化/最小化）</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">8.2 安全措施</h3>
                <p className="text-gray-700 mb-4">
                  我们采取加密、访问控制、最小权限、密钥管理、审计与备份等措施保护你的数据。但任何网络传输都无法保证 100% 安全；如发生数据泄露事件，我们将按法律要求和合理方式通知你。
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. 你的权利与控制</h2>
                <p className="text-gray-700 mb-4">根据适用法律，你可能拥有以下权利：</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>访问、查看、校正或删除你的个人数据</li>
                  <li>撤回或反对处理你的个人数据</li>
                  <li>获取数据副本（数据可携带权）</li>
                  <li>限制或拒绝某些处理活动</li>
                  <li>撤回之前的同意（不影响撤回前基于同意处理的合法性）</li>
                </ul>
                <p className="text-gray-700 mb-4">你可以通过以下方式联系我们行使权利：</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>网页：<a href="https://www.monna.us/privacy-requests" className="text-orange-600 hover:text-orange-700">https://www.monna.us/privacy-requests</a></li>
                  <li>邮箱：<a href="mailto:privacy@xroting.com" className="text-orange-600 hover:text-orange-700">privacy@xroting.com</a></li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9A. 账号删除与数据删除</h2>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li><strong>App 内路径</strong>：你可以在 App 内【设置 → 账号/隐私 → 删除账号】发起删除请求。</li>
                  <li><strong>网页路径（App 外）</strong>：你也可以访问 <a href="https://www.monna.us/delete-account" className="text-orange-600 hover:text-orange-700">https://www.monna.us/delete-account</a> 发起删除请求（适用于已卸载 App 的用户）。</li>
                  <li><strong>验证与处理时间</strong>：为防止误删或未经授权操作，我们可能要求你进行邮箱/短信验证或重新登录确认。我们将在合理时间内完成处理，并在适用情况下通知你结果。</li>
                  <li><strong>删除范围</strong>：删除将移除我们系统中的账号资料以及与账号相关且非法律必须保留的数据；出于安全、反欺诈、财务或法律合规要求，我们可能保留必要的交易/审计记录并尽可能去标识化。</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. 关于 AI 与内容处理</h2>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">10.1 用户内容版权与许可</h3>
                <p className="text-gray-700 mb-4">
                  你保证上传的内容（包括提示词）不侵犯他人权利。为向你提供服务，你授予我们一个全球范围的、可再转授的、免版税的、为提供与维护服务所必需的许可（例如用于生成、存储、传输与展示你的内容/结果）。
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">10.2 AI 生成内容的权利/责任</h3>
                <p className="text-gray-700 mb-4">
                  AI 生成内容可能不受版权/著作权保护，或受不同法律管辖。你理解并同意，我们不对 AI 生成内容的知识产权状态作保证。
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">10.3 模型训练（默认不启用）</h3>
                <p className="text-gray-700 mb-4">
                  我们目前<strong>默认不使用</strong>你的内容训练 AI 模型。若未来提供此能力，我们将通过<strong>明确选择同意（Opt-in）</strong>征求你的许可，并提供便捷的退出选项。
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. 其他说明</h2>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">11.1 禁止行为（摘要）</h3>
                <p className="text-gray-700 mb-4">
                  你不得使用本服务从事违法、侵权、欺诈、恶意攻击、未授权抓取/监控、或其他滥用行为；不得生成或传播违法有害内容（包括但不限于儿童色情、暴力恐怖等）。
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">11.2 免责声明与责任限制（摘要）</h3>
                <p className="text-gray-700 mb-4">
                  本服务按"现状/现用"提供。在法律允许的最大范围内，我们不对间接、附带、惩罚性或后果性损失承担责任。我们的总体责任以你向我们支付的费用为限（如适用）。
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. 联系方式</h2>
                <p className="text-gray-700 mb-4">如有隐私相关问题或投诉，请联系：</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li><a href="mailto:privacy@xroting.com" className="text-orange-600 hover:text-orange-700">privacy@xroting.com</a></li>
                  <li><a href="mailto:legal@xroting.com" className="text-orange-600 hover:text-orange-700">legal@xroting.com</a></li>
                </ul>
              </section>
            </>
          ) : (
            // 英文版本
            <>
              <p className="text-sm text-gray-600 mb-6">
                Effective Date: 2025-09-25<br />
                Last Updated: 2025-11-28
              </p>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Operator Information</h2>
                <p className="text-gray-700 mb-4">
                  This website and mobile application (collectively, "the Services") are operated by <strong>XROTING TECHNOLOGY LLC</strong> ("we," "us," or "our").
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Website: <a href="https://www.monna.us" className="text-orange-600 hover:text-orange-700">https://www.monna.us</a></li>
                  <li>Privacy Contact: <a href="mailto:privacy@xroting.com" className="text-orange-600 hover:text-orange-700">privacy@xroting.com</a></li>
                  <li>Legal Contact: <a href="mailto:legal@xroting.com" className="text-orange-600 hover:text-orange-700">legal@xroting.com</a></li>
                  <li>Registered/Mailing Address: 30 N Gould St Ste N, Sheridan, WY 82801, United States</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Scope of This Policy</h2>
                <p className="text-gray-700 mb-4">
                  This Policy applies to the collection, use, sharing, retention, and protection of your personal information/data while using the Services (including both web and mobile applications).
                </p>
                <p className="text-gray-700 mb-4">
                  If you do not agree with this Policy, please discontinue use immediately. We may update this Policy from time to time and will notify you via website announcements, in-app notifications, or email. Continued use constitutes acceptance of the updated version.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Accounts, Eligibility, and Protection of Minors</h2>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li><strong>Age Restriction</strong>: The Services are intended for users <strong>aged 13 and above</strong>.</li>
                  <li>We do not knowingly collect data from children under 13; if discovered, we will verify and delete it promptly.</li>
                  <li>We are committed to complying with applicable minor protection requirements (e.g., COPPA).</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data We Collect</h2>
                <p className="text-gray-700 mb-4">The data we collect depends on the context and includes:</p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Account & Identity Data</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Email/phone number</li>
                  <li>Username, display name, avatar (if provided)</li>
                  <li>Password (stored only in encrypted/hashed form; we do not store passwords in plain text)</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 Payment & Subscription Data</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li><strong>Web</strong>: Payment-related information is typically processed by payment providers such as <strong>Stripe</strong>; we process necessary order-related information (order ID, product/plan, payment status, invoice/receipt information, fraud detection results, etc.).</li>
                  <li><strong>Mobile App</strong>: Subscriptions/in-app purchases may be processed by <strong>Apple App Store</strong> or <strong>Google Play</strong>; we may use subscription management services like <strong>RevenueCat</strong> to sync subscription status. We typically do not directly access or store your complete card numbers, but we process transaction/subscription status, transaction identifiers, product IDs, currency/region, etc., for reconciliation and entitlement provisioning.</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">4.3 Usage & Technical Data (Automatically Collected)</h3>
                <p className="text-gray-700 mb-4">
                  When you access or use the Services, we automatically collect certain technical information for <strong>service provision, security protection, troubleshooting, and performance optimization</strong>, including:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li><strong>Logs & Network Information</strong>: IP address, access time, request path, error codes, and request-related log identifiers;</li>
                  <li><strong>Device & Application Information</strong>: Device model/manufacturer, OS version, app version, language and timezone settings, browser type/User-Agent, screen and compatibility information;</li>
                  <li><strong>Diagnostic Information</strong>: Crash logs, performance and stability metrics (e.g., loading times, crash stacks, lag, and error logs).</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  <strong>About Identifiers (if applicable)</strong>: Only in necessary scenarios such as push notifications, anti-fraud, or statistical analysis may we process device/app instance identifiers (e.g., push tokens, app instance IDs).
                  <strong>We will not</strong>, without explicit disclosure and obtaining your authorization/consent, collect or use advertising identifiers (e.g., Android Advertising ID/AAID) for cross-app/cross-website advertising tracking purposes. If we introduce advertising attribution/ad serving capabilities in the future, we will update this Policy and provide appropriate choices.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">4.4 Generated Content & Interaction Data</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Images/videos/text you upload (if you choose to upload)</li>
                  <li>Generated outputs (images/videos/related files)</li>
                  <li>Prompts you enter and related metadata (such as dimensions, duration, model/version, parameters, task IDs, failure reasons, etc.)</li>
                  <li>Information from your communications with customer support (e.g., emails, tickets, feedback)</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Purposes and Legal Bases for Data Use</h2>
                <p className="text-gray-700 mb-4">We use the above data for:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Providing, maintaining, and improving the Services (including image/video generation, queue and task management)</li>
                  <li>Handling account registration, login, authentication, and permission management</li>
                  <li>Processing orders, subscriptions, billing, reconciliation, and fraud prevention</li>
                  <li>Providing customer support and issue resolution (including crash/error troubleshooting)</li>
                  <li>Product analysis, A/B testing, and feature iteration (where applicable, based on your consent or our legitimate interests)</li>
                  <li>Security protection, abuse detection, content compliance, and legal compliance</li>
                  <li>Fulfilling legal obligations and responding to law enforcement/regulatory requests</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  If you are located in the EEA/UK or similar regions, we will rely on appropriate legal bases such as: contract performance, your consent, our legitimate interests, or legal obligations.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Cookies and Local Storage (Web)</h2>
                <p className="text-gray-700 mb-4">We may use cookies/local storage for:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li><strong>Essential Functions</strong>: Login persistence, session security, fraud prevention, preference settings</li>
                  <li><strong>Analytics (if applicable)</strong>: With your consent, for traffic statistics and product improvement</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  You can manage cookies via your browser settings; however, disabling essential cookies may affect service functionality.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Sharing and Cross-Border Transfers</h2>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">7.1 Third Parties We May Share Data With</h3>
                <p className="text-gray-700 mb-4">
                  To provide the Services, we may share necessary data (limited to the minimum scope required) with the following types of third parties:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li><strong>Infrastructure/Cloud Services</strong>: Databases, object storage, CDNs, logging platforms (e.g., Supabase, CDN/hosting services)</li>
                  <li><strong>Payment & Subscriptions</strong>: Stripe, Apple App Store, Google Play, subscription management services (e.g., RevenueCat)</li>
                  <li><strong>Logging, Analytics, and Monitoring</strong>: For error tracking, performance monitoring, and security auditing</li>
                  <li><strong>AI Model/Inference Service Providers</strong>: To process your generation requests (may involve processing uploaded content/prompts/task parameters)</li>
                  <li><strong>Legal Compliance & Law Enforcement</strong>: When required or reasonably necessary</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  <strong>Important Note</strong>: Our disclosure scope includes data collected by us, data collected by integrated third-party SDKs (if any) within the app, and logs/security data generated by our backend/cloud infrastructure while providing the Services. We require third-party processors to handle data according to our instructions and to be bound by data protection/security terms.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">7.2 Cross-Border Transfers</h3>
                <p className="text-gray-700 mb-4">
                  For cross-border data transfers involving the EEA/UK or similar regions, we will employ <strong>EU Standard Contractual Clauses (SCCs)</strong> or other lawful mechanisms and implement appropriate transfer safeguards.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Data Retention and Security Measures</h2>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">8.1 Retention Periods (Sample Rules)</h3>
                <p className="text-gray-700 mb-4">
                  We retain data only for as long as necessary to fulfill the purposes or as required by law. Generally:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li><strong>Access/Security Logs (may include IP)</strong>: Typically retained for <strong>30–90 days</strong></li>
                  <li><strong>Crash/Error & Performance Diagnostic Logs</strong>: Typically retained for <strong>90–180 days</strong></li>
                  <li><strong>Generated Content & Generation History</strong>: Retained during your account's validity; you may delete it yourself; after account deletion, we will clean it up within a reasonable timeframe (backup copies may be delayed within technical cycles, up to <strong>30–90 days</strong>)</li>
                  <li><strong>Order/Invoice/Audit Records</strong>: Retained as required by law and compliance (de-identified/minimized where feasible)</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">8.2 Security Measures</h3>
                <p className="text-gray-700 mb-4">
                  We employ encryption, access controls, least-privilege principles, key management, audits, and backups to protect your data. However, no network transmission is 100% secure; if a data breach occurs, we will notify you as required by law and in a reasonable manner.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Your Rights and Controls</h2>
                <p className="text-gray-700 mb-4">Depending on applicable law, you may have the following rights:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Access, view, correct, or delete your personal data</li>
                  <li>Withdraw or object to the processing of your personal data</li>
                  <li>Obtain a copy of your data (data portability)</li>
                  <li>Restrict or refuse certain processing activities</li>
                  <li>Withdraw previously given consent (without affecting the lawfulness of processing based on consent before withdrawal)</li>
                </ul>
                <p className="text-gray-700 mb-4">You may contact us to exercise your rights via:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Website: <a href="https://www.monna.us/privacy-requests" className="text-orange-600 hover:text-orange-700">https://www.monna.us/privacy-requests</a></li>
                  <li>Email: <a href="mailto:privacy@xroting.com" className="text-orange-600 hover:text-orange-700">privacy@xroting.com</a></li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9A. Account Deletion & Data Deletion</h2>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li><strong>In-App Path</strong>: You can initiate a deletion request in the app via [Settings → Account/Privacy → Delete Account].</li>
                  <li><strong>Web Path (Outside App)</strong>: You may also visit <a href="https://www.monna.us/delete-account" className="text-orange-600 hover:text-orange-700">https://www.monna.us/delete-account</a> to initiate a deletion request (for users who have uninstalled the app).</li>
                  <li><strong>Verification & Processing Time</strong>: To prevent accidental deletion or unauthorized operations, we may require email/SMS verification or re-login confirmation. We will complete processing within a reasonable timeframe and notify you of the outcome where applicable.</li>
                  <li><strong>Deletion Scope</strong>: Deletion will remove your account profile and account-related data that is not legally required to be retained from our systems; for security, anti-fraud, financial, or legal compliance purposes, we may retain necessary transaction/audit records and de-identify them where possible.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. About AI and Content Processing</h2>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">10.1 User Content Copyright & License</h3>
                <p className="text-gray-700 mb-4">
                  You warrant that content you upload (including prompts) does not infringe others' rights. To provide the Services, you grant us a worldwide, sublicensable, royalty-free license necessary for providing and maintaining the Services (e.g., to generate, store, transmit, and display your content/outputs).
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">10.2 Rights/Responsibilities for AI-Generated Content</h3>
                <p className="text-gray-700 mb-4">
                  AI-generated content may not be protected by copyright/authorship or may be governed by different laws. You understand and agree that we make no warranty regarding the intellectual property status of AI-generated content.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">10.3 Model Training (Not Enabled by Default)</h3>
                <p className="text-gray-700 mb-4">
                  We currently <strong>do not use</strong> your content to train AI models by default. If we offer this capability in the future, we will seek your permission through <strong>explicit opt-in</strong> and provide a convenient opt-out option.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Additional Notices</h2>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">11.1 Prohibited Conduct (Summary)</h3>
                <p className="text-gray-700 mb-4">
                  You may not use the Services to engage in illegal, infringing, fraudulent, malicious attacks, unauthorized scraping/monitoring, or other abusive behavior; or to generate or disseminate illegal harmful content (including but not limited to child pornography, violent terrorism, etc.).
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">11.2 Disclaimer & Limitation of Liability (Summary)</h3>
                <p className="text-gray-700 mb-4">
                  The Services are provided "as is / as available." To the maximum extent permitted by law, we are not liable for indirect, incidental, punitive, or consequential damages. Our total liability is limited to the fees you have paid to us (if applicable).
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Information</h2>
                <p className="text-gray-700 mb-4">For privacy-related questions or complaints, please contact:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li><a href="mailto:privacy@xroting.com" className="text-orange-600 hover:text-orange-700">privacy@xroting.com</a></li>
                  <li><a href="mailto:legal@xroting.com" className="text-orange-600 hover:text-orange-700">legal@xroting.com</a></li>
                </ul>
              </section>
            </>
          )}
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            © 2025 XROTING TECHNOLOGY LLC. {currentLanguage === 'zh' ? '保留所有权利。' : 'All rights reserved.'}
          </p>
        </div>
      </div>
    </div>
  );
}
