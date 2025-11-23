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
          {currentLanguage === 'zh' ? '隐私政策' : currentLanguage === 'ja' ? 'プライバシーポリシー' : 'Privacy Policy'}
        </h1>

        <div className="prose prose-gray max-w-none">
          {currentLanguage === 'zh' ? (
            // 中文版本
            <>
              <p className="text-sm text-gray-600 mb-6">
                生效日期：2025-9-25<br />
                最后更新：2025-10-15
              </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. 运营商信息</h2>
            <p className="text-gray-700 mb-4">
              本网站由 <strong>XROTING TECHNOLOGY LLC</strong>（以下简称"我们"、"我们的"）运营。
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>网站：www.monna.us</li>
              <li>联系邮箱：privacy@xroting.com / legal@xroting.com</li>
              <li>注册地址：[公司注册地、邮寄地址]</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. 我们承诺的协议</h2>
            <p className="text-gray-700 mb-4">
              使用本服务即表示同意并接受本《隐私政策 & 用户协议》。如果您不同意，请立即停止使用。
              我们可能会不时更新本政策，通过网站公告或邮件通知您。继续使用即表示接受更新后的版本。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. 账号、资格与未成年人保护</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">年龄限制</h3>
            <p className="text-gray-700 mb-4">
              本服务仅面向 <strong>13 岁及以上</strong>的用户。我们不会故意收集 13 岁以下儿童的数据，
              如果我们发现收集了 13 岁以下儿童数据，我们将在核实后尽快删除。我们致力于遵循 COPPA 对 13 岁以下儿童的保护要求。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. 我们收集哪些数据</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">账户数据</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>邮箱/手机号</li>
              <li>用户名、显示名称</li>
              <li>密码（加密存储）</li>
              <li>支付相关信息（通过 Stripe 等合规支付处理商处理）</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">使用和技术数据</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>设备识别码</li>
              <li>操作系统/IP/时间戳等</li>
              <li>会话日志、错误日志</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">生成内容数据</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>您上传的图片/视频/文本、生成结果</li>
              <li>用户输入的提示词（prompts）及元数据（尺寸、模型版本等）</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. 数据使用目的与法律依据</h2>
            <p className="text-gray-700 mb-4">我们使用收集的数据用于：</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>提供、维护和改进服务</li>
              <li>处理账户、身份验证和计费</li>
              <li>提供客户支持</li>
              <li>改进和开发新功能</li>
              <li>进行 A/B 测试和安全防护</li>
              <li>遵守法律法规</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Cookies 与本地存储</h2>
            <p className="text-gray-700 mb-4">
              我们使用必要 Cookies 提供登录和安全功能，以及根据您同意的分析/广告 Cookies。
              您可以通过浏览器设置管理 Cookies，但禁用必要 Cookies 可能影响服务功能。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. 数据共享与跨境传输</h2>
            <p className="text-gray-700 mb-4">
              我们会与以下类型的第三方共享数据：
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>基础设施提供商（如 Supabase、CDN、存储和支付服务商）</li>
              <li>日志分析和监控工具</li>
              <li>法律合规、执法请求</li>
              <li>AI 模型服务提供商（用于处理您的生成请求）</li>
            </ul>
            <p className="text-gray-700 mb-4">
              这些第三方处理商将根据我们的指示处理数据，并受到隐私和安全协议的约束。
              如果涉及 EEA/UK 及其他国家的跨境数据传输，我们将采用欧盟标准合同条款（SCCs）
              或其他合理可靠的机制实施合适的传输保护措施。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. 数据保留与安全措施</h2>
            <p className="text-gray-700 mb-4">
              <strong>保留期限：</strong>为实现收集目的所必需的合理期间，或法律要求的期限。
            </p>
            <p className="text-gray-700 mb-4">
              <strong>安全措施：</strong>我们采取加密、访问控制、最小权限、定期审计和备份等措施保护您的数据。
              但任何网络传输都无法保证 100% 安全，如果发生数据泄露事件，我们将按照合理和法律要求的方式通知您。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. 您的权利与控制</h2>
            <p className="text-gray-700 mb-4">根据适用法律，您可能拥有以下权利：</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>访问、查看、校正或删除您的个人数据</li>
              <li>撤回或反对处理您的个人数据</li>
              <li>获取数据副本（数据可携带权）</li>
              <li>限制或拒绝某些处理活动</li>
              <li>撤回之前的同意（不影响撤回前基于同意的处理的合法性）</li>
            </ul>
            <p className="text-gray-700 mb-4">
              如需行使上述权利，请通过以下方式联系我们：
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>网站：https://www.monna.us/privacy-requests</li>
              <li>邮箱：privacy@monna.us</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. 知识产权与 AI 专有权</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">用户内容版权</h3>
            <p className="text-gray-700 mb-4">
              您保证上传的内容（包括提示词）不侵犯他人权利。为向您提供服务，您授予我们一个全球范围的、
              可再转授的、免版税的、为提供和改进服务所需的许可。
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">AI 生成内容的权利/责任</h3>
            <p className="text-gray-700 mb-4">
              AI 生成的内容可能不受版权/著作权保护，或受到不同法律管辖。您理解并同意，
              我们不对 AI 生成内容的知识产权状态作任何保证。
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">模型训练（可选项）</h3>
            <p className="text-gray-700 mb-4">
              我们目前默认不使用您的内容训练 AI 模型。如果未来需要此功能，我们将通过
              <strong>明确选择同意（Opt-in）</strong>的方式征求您的许可，并提供便捷的退出选项。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. 禁止行为</h2>
            <p className="text-gray-700 mb-4">您不得使用本服务从事或传播以下行为：</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>违法内容（针对儿童的仇恨、暴力、恐怖主义或非法活动）</li>
              <li>侵犯他人知识产权、隐私权</li>
              <li>伪造、欺诈、诈骗或工程欺骗</li>
              <li>恶意攻击、破坏或工程漏洞</li>
              <li>未经同意地收集、抓取或监控数据</li>
              <li>生成误导性身份识别、金融或选举信息</li>
              <li>未经持牌或认证而从事医疗法律或投资建议</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. 定价、付费与税费</h2>
            <p className="text-gray-700 mb-4">
              价格可能随时变动，以我们在付款前显示的最终价格或税费计价器为准。
              您同意支付当地适用税费，并理解根据所在司法管辖区可能产生不同的税费责任。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. 免责声明与责任限制</h2>
            <p className="text-gray-700 mb-4">
              本服务按"现状/现用"提供，我们不对其准确性、适用性、适销权及任何明示或默示保证负责。
            </p>
            <p className="text-gray-700 mb-4">
              在法律允许的最大范围内，我们对任何间接、附带、惩罚性或后果性损失、数据丢失或利润损失不承担责任。
              我们的总体责任以您向我们支付的费用为限。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. 争议解决与管辖</h2>
            <p className="text-gray-700 mb-4">
              如果因本协议或服务产生争议，我们鼓励先通过友好协商解决。协商不成的，
              可提交[约定仲裁机构/所在地小额法院/指定法院管辖]。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. 版权侵权 DMCA 通知程序</h2>
            <p className="text-gray-700 mb-4">
              如果您认为我们的服务上存在侵犯您版权的内容，请向我们的 DMCA 指定代理人发送版权侵权通知，
              包括：版权人信息、描述侵权作品、链接、您的联系方式和签名等。
            </p>
            <p className="text-gray-700 mb-4">
              我们将根据适用法律（如 DMCA）及时处理此类通知。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. 政策更新通知</h2>
            <p className="text-gray-700 mb-4">
              我们可能更新本隐私政策。重大变更时，我们将通过网站公告或邮件通知您。
              继续使用服务即表示您接受更新后的版本。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">17. 联系方式</h2>
            <p className="text-gray-700 mb-4">
              如有隐私相关问题或投诉，请联系：
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>隐私邮箱：privacy@xroting.com</li>
              <li>法律联系邮箱：legal@xroting.com</li>
            </ul>
          </section>
            </>
          ) : (
            // 英文版本
            <>
              <p className="text-sm text-gray-600 mb-6">
                Effective Date: 2025-09-25<br />
                Last Updated: 2025-10-15
              </p>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Operator Information</h2>
                <p className="text-gray-700 mb-4">
                  This website is operated by <strong>XROTING TECHNOLOGY LLC</strong> ("we," "us," or "our").
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Website: www.monna.us</li>
                  <li>Contact Email: privacy@xroting.com / legal@xroting.com</li>
                  <li>Registered Address: [Company registration address / mailing address]</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Our Commitment & Agreements</h2>
                <p className="text-gray-700 mb-4">
                  By using the Services, you agree to this Privacy Policy & User Agreement. If you do not agree, please discontinue use immediately. We may update this Policy from time to time and will notify you via website announcements or email. Your continued use constitutes acceptance of the updated version.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Accounts, Eligibility, and Protection of Minors</h2>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Age Restriction</h3>
                <p className="text-gray-700 mb-4">
                  The Services are intended for users aged <strong>13 and older</strong>. We do not knowingly collect data from children under 13. If we discover that we have collected data from a child under 13, we will delete it promptly after verification. We are committed to complying with the Children's Online Privacy Protection Act (COPPA) regarding the protection of children under 13.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data We Collect</h2>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Account Data</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Email/phone number</li>
                  <li>Username, display name</li>
                  <li>Password (stored in encrypted form)</li>
                  <li>Payment-related information (processed via compliant payment processors such as Stripe)</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">Usage & Technical Data</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Device identifiers</li>
                  <li>Operating system / IP address / timestamps, etc.</li>
                  <li>Session logs, error logs</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">Generation Content Data</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Images/videos/text you upload and the generated outputs</li>
                  <li>User-entered prompts and related metadata (e.g., dimensions, model version)</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Purposes and Legal Bases for Use</h2>
                <p className="text-gray-700 mb-4">We use the collected data to:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Provide, maintain, and improve the Services</li>
                  <li>Handle accounts, authentication, and billing</li>
                  <li>Provide customer support</li>
                  <li>Improve and develop new features</li>
                  <li>Conduct A/B testing and protect security</li>
                  <li>Comply with legal and regulatory obligations</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Cookies and Local Storage</h2>
                <p className="text-gray-700 mb-4">
                  We use necessary cookies to provide login and security features, and (with your consent) analytics/advertising cookies. You can manage cookies via your browser settings, but disabling necessary cookies may affect functionality.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Sharing and Cross-Border Transfers</h2>
                <p className="text-gray-700 mb-4">
                  We may share data with:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Infrastructure providers (e.g., Supabase), CDNs, storage and payment providers</li>
                  <li>Logging, analytics, and monitoring tools</li>
                  <li>Legal compliance or law enforcement, when required</li>
                  <li>AI model service providers (to process your generation requests)</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  These third-party processors act on our instructions and are bound by privacy and security obligations. For cross-border transfers involving the EEA/UK or other regions, we implement appropriate safeguards such as EU Standard Contractual Clauses (SCCs) or other reliable mechanisms.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Data Retention and Security Measures</h2>
                <p className="text-gray-700 mb-4">
                  <strong>Retention:</strong> We retain data for the period reasonably necessary to fulfill the purposes of collection, or as required by law.
                </p>
                <p className="text-gray-700 mb-4">
                  <strong>Security:</strong> We employ encryption, access controls, least-privilege practices, regular audits, and backups to protect your data. However, no transmission over networks is 100% secure. If a data breach occurs, we will notify you in a reasonable manner and as required by law.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Your Rights and Controls</h2>
                <p className="text-gray-700 mb-4">Subject to applicable law, you may have the right to:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Access, view, correct, or delete your personal data</li>
                  <li>Withdraw or object to processing of your personal data</li>
                  <li>Obtain a copy of your data (data portability)</li>
                  <li>Restrict or refuse certain processing activities</li>
                  <li>Withdraw previously given consent (without affecting the lawfulness of processing based on consent before withdrawal)</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  To exercise your rights, contact us at:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Website: https://www.monna.us/privacy-requests</li>
                  <li>Email: privacy@monna.us</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Intellectual Property and AI-Specific Rights</h2>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">User Content Copyright</h3>
                <p className="text-gray-700 mb-4">
                  You warrant that content you upload (including prompts) does not infringe others' rights. To provide the Services, you grant us a worldwide, sublicensable, royalty-free license to use such content as necessary to provide and improve the Services.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">Rights/Responsibilities for AI-Generated Content</h3>
                <p className="text-gray-700 mb-4">
                  AI-generated content may not be protected by copyright or may be treated differently under various laws. You understand and agree that we make no warranty regarding the IP status of AI-generated content.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">Model Training (Optional)</h3>
                <p className="text-gray-700 mb-4">
                  By default, we do not use your content to train AI models. If we wish to enable this in the future, we will obtain your permission through an <strong>explicit opt-in</strong> and provide an easy opt-out mechanism.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Prohibited Conduct</h2>
                <p className="text-gray-700 mb-4">You may not use the Services to engage in or disseminate:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Illegal content (including hate targeting children, violence, terrorism, or unlawful activities)</li>
                  <li>Infringement of others' intellectual property or privacy rights</li>
                  <li>Forgery, fraud, scams, or social engineering</li>
                  <li>Malicious attacks, disruption, or exploitation of security vulnerabilities</li>
                  <li>Collection, scraping, or monitoring of data without consent</li>
                  <li>Generation of misleading identity, financial, or election-related information</li>
                  <li>Provision of medical, legal, or investment advice without appropriate licensing or certification</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Pricing, Payments, and Taxes</h2>
                <p className="text-gray-700 mb-4">
                  Prices may change at any time; the final price or tax calculator shown prior to payment will prevail. You agree to pay applicable local taxes and understand that tax obligations may vary by jurisdiction.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Disclaimer and Limitation of Liability</h2>
                <p className="text-gray-700 mb-4">
                  The Services are provided on an "as is" and "as available" basis. We disclaim all express or implied warranties regarding accuracy, fitness for a particular purpose, merchantability, and more.
                </p>
                <p className="text-gray-700 mb-4">
                  To the maximum extent permitted by law, we are not liable for any indirect, incidental, punitive, or consequential damages, loss of data, or loss of profits. Our total liability is limited to the fees you have paid to us.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Dispute Resolution and Jurisdiction</h2>
                <p className="text-gray-700 mb-4">
                  If a dispute arises from this Policy or the Services, we encourage amicable resolution first. If unresolved, the dispute may be submitted to the [agreed arbitration body/small claims court in the specified location/designated court of competent jurisdiction].
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Copyright Infringement (DMCA) Notice Procedure</h2>
                <p className="text-gray-700 mb-4">
                  If you believe content on our Services infringes your copyright, please send a notice to our designated DMCA agent including: copyright owner information, a description of the infringed work, links, your contact details, and your signature. We will process such notices promptly in accordance with applicable law (e.g., the DMCA).
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Updates to This Policy</h2>
                <p className="text-gray-700 mb-4">
                  We may update this Privacy Policy. For material changes, we will notify you via website announcements or email. Your continued use of the Services constitutes acceptance of the updated version.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">17. Contact</h2>
                <p className="text-gray-700 mb-4">
                  For privacy-related questions or complaints, please contact:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Privacy Email: privacy@xroting.com</li>
                  <li>Legal Contact Email: legal@xroting.com</li>
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
