'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/contexts/language-context';

export default function TermsOfServicePage() {
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
          {currentLanguage === 'zh' ? '用户服务协议' : currentLanguage === 'ja' ? 'ユーザーサービス契約' : 'User Service Agreement'}
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
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. 协议接受与适用范围</h2>
            <p className="text-gray-700 mb-4">
              欢迎使用 XROTING TECHNOLOGY LLC（以下简称"我们"或"本公司"）提供的服务。
              本《用户服务协议》（以下简称"本协议"）是您与本公司之间关于使用本服务的法律协议。
            </p>
            <p className="text-gray-700 mb-4">
              <strong>使用本服务即表示您已阅读、理解并同意接受本协议的所有条款。</strong>
              如果您不同意本协议的任何内容，请立即停止使用本服务。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. 服务说明</h2>
            <p className="text-gray-700 mb-4">
              本公司提供基于人工智能技术的图片和视频生成服务（以下简称"本服务"）。
              本服务允许用户通过文本提示词、参考图片等方式生成各类创意内容。
            </p>
            <p className="text-gray-700 mb-4">
              我们保留随时修改、暂停或终止部分或全部服务的权利，恕不另行通知。
              我们将尽力确保服务的稳定性和可用性，但不对服务的不间断或无错误运行作出保证。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. 用户注册与账户管理</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 注册资格</h3>
            <p className="text-gray-700 mb-4">
              您必须年满 <strong>13 周岁</strong>才能注册和使用本服务。
              如果您未满 13 周岁，请勿注册或使用本服务。
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 账户安全</h3>
            <p className="text-gray-700 mb-4">
              您有责任维护账户的安全性，包括但不限于：
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>妥善保管您的登录凭证（邮箱、密码等）</li>
              <li>不与他人共享您的账户信息</li>
              <li>及时通知我们任何未经授权的账户使用行为</li>
            </ul>
            <p className="text-gray-700 mb-4">
              您将对您账户下的所有活动承担全部责任。
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3 账户信息真实性</h3>
            <p className="text-gray-700 mb-4">
              您承诺提供真实、准确、完整的注册信息，并及时更新以保持信息的准确性。
              提供虚假信息可能导致账户被暂停或终止。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. 用户行为规范</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 禁止的内容和行为</h3>
            <p className="text-gray-700 mb-4">
              使用本服务时，您不得创建、上传、传播或请求生成以下类型的内容：
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>非法内容：包括但不限于儿童性虐待材料、暴力、恐怖主义或其他违法内容</li>
              <li>仇恨言论：针对种族、性别、宗教、性取向等的歧视性内容</li>
              <li>侵权内容：侵犯他人知识产权、隐私权或其他合法权益的内容</li>
              <li>欺诈内容：用于诈骗、伪造身份、误导他人的内容</li>
              <li>成人内容：色情、露骨或不适当的性暗示内容</li>
              <li>危险内容：可能引发自我伤害、自杀或危险行为的内容</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 禁止的技术行为</h3>
            <p className="text-gray-700 mb-4">
              您不得从事以下技术行为：
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>试图未经授权访问我们的系统、服务器或数据库</li>
              <li>干扰或破坏服务的正常运行</li>
              <li>使用自动化工具（如爬虫、机器人）批量抓取内容或数据</li>
              <li>逆向工程、反编译或试图提取服务的源代码</li>
              <li>绕过我们实施的任何安全措施或使用限制</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.3 合理使用</h3>
            <p className="text-gray-700 mb-4">
              您应当合理使用本服务，不得滥用系统资源或从事可能影响其他用户正常使用的行为。
              我们保留对异常使用行为采取限制措施的权利。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. 知识产权</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.1 服务的知识产权</h3>
            <p className="text-gray-700 mb-4">
              本服务及其所有相关技术、软件、商标、标识等知识产权均归本公司或其授权方所有。
              未经明确授权，您不得复制、修改、传播或商业利用这些内容。
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.2 用户内容的权利</h3>
            <p className="text-gray-700 mb-4">
              对于您上传到本服务的内容（包括文本提示词、参考图片等），您保留所有权利。
              但为了向您提供服务，您授予我们一个全球性的、非独占的、免版税的许可，
              允许我们使用、存储、处理和展示这些内容。
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.3 AI 生成内容的权利</h3>
            <p className="text-gray-700 mb-4">
              通过本服务生成的内容（以下简称"生成内容"）的知识产权归属取决于适用法律。
              在某些司法管辖区，AI 生成的内容可能不受版权保护。
            </p>
            <p className="text-gray-700 mb-4">
              <strong>我们不对生成内容的知识产权状态作出任何保证。</strong>
              您有责任确保您对生成内容的使用符合适用法律和第三方权利。
            </p>
            <p className="text-gray-700 mb-4">
              在法律允许的范围内，我们授予您对生成内容的使用权，但您需自行承担使用生成内容的法律风险。
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.4 侵权处理</h3>
            <p className="text-gray-700 mb-4">
              如果您认为本服务上的内容侵犯了您的知识产权，请按照本协议第14条规定的 DMCA 程序通知我们。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. 付费服务与订阅</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.1 定价与支付</h3>
            <p className="text-gray-700 mb-4">
              我们提供免费和付费两种服务级别。付费服务的具体价格和功能将在服务页面明确显示。
            </p>
            <p className="text-gray-700 mb-4">
              价格可能随时变动。我们会在价格变更前通知现有订阅用户。继续使用服务即表示接受新价格。
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.2 订阅续费</h3>
            <p className="text-gray-700 mb-4">
              订阅服务将按照您选择的周期（月度或年度）自动续费，除非您在续费日期前取消订阅。
              您有责任在不希望续费时及时取消订阅。
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.3 退款政策</h3>
            <p className="text-gray-700 mb-4">
              除非法律另有规定或我们明确说明，付费订阅一般不支持退款。
              如遇特殊情况（如服务严重故障），请联系我们的客户支持团队。
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.4 税费</h3>
            <p className="text-gray-700 mb-4">
              显示的价格可能不包含适用的税费（如增值税、销售税等）。
              实际支付金额将在结账时显示，并包含所有适用税费。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. 服务限制与配额</h2>
            <p className="text-gray-700 mb-4">
              根据您的订阅级别，我们可能会对以下内容实施限制：
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>每日或每月的生成次数</li>
              <li>生成内容的分辨率和时长</li>
              <li>可使用的 AI 模型和功能</li>
              <li>存储空间和保存期限</li>
            </ul>
            <p className="text-gray-700 mb-4">
              具体限制将在服务页面说明。超出配额后，您可能需要升级订阅或等待配额重置。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. 免责声明</h2>
            <p className="text-gray-700 mb-4">
              <strong>本服务按"现状"和"现有"基础提供，不附带任何明示或默示的保证。</strong>
            </p>
            <p className="text-gray-700 mb-4">
              我们明确声明不对以下内容作出保证：
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>服务的准确性、可靠性、适用性或完整性</li>
              <li>生成内容的质量、合法性或适用性</li>
              <li>服务不会中断、延迟或出现错误</li>
              <li>服务完全安全、无病毒或其他有害组件</li>
              <li>生成内容不侵犯第三方权利</li>
            </ul>
            <p className="text-gray-700 mb-4">
              您理解并同意，使用本服务及其生成内容的风险完全由您自行承担。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. 责任限制</h2>
            <p className="text-gray-700 mb-4">
              在法律允许的最大范围内，我们对以下情况不承担责任：
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>间接损失、附带损失、惩罚性损失或后果性损失</li>
              <li>利润损失、业务中断或数据丢失</li>
              <li>因使用或无法使用服务而产生的任何损失</li>
              <li>第三方的行为或内容</li>
              <li>不可抗力事件（如自然灾害、战争、政府行为等）</li>
            </ul>
            <p className="text-gray-700 mb-4">
              <strong>我们的总体责任限额不超过您在过去 12 个月内向我们支付的费用总额，
              或 100 美元（以较高者为准）。</strong>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. 赔偿</h2>
            <p className="text-gray-700 mb-4">
              您同意赔偿、辩护并使本公司及其关联方、董事、员工、代理人免受因以下原因
              产生的任何索赔、损失、责任、损害、成本或费用（包括合理的律师费）：
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>您违反本协议的任何条款</li>
              <li>您使用服务的方式</li>
              <li>您上传或生成的内容侵犯第三方权利</li>
              <li>您违反适用法律或法规</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. 账户暂停与终止</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">11.1 我们的终止权利</h3>
            <p className="text-gray-700 mb-4">
              在以下情况下,我们保留暂停或终止您的账户的权利：
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>您违反本协议的任何条款</li>
              <li>您从事禁止的行为或创建违规内容</li>
              <li>您拖欠应付费用</li>
              <li>我们合理怀疑您的账户被未经授权使用</li>
              <li>法律、监管或执法要求</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">11.2 您的终止权利</h3>
            <p className="text-gray-700 mb-4">
              您可以随时通过账户设置或联系客户支持来终止使用本服务和删除账户。
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">11.3 终止后果</h3>
            <p className="text-gray-700 mb-4">
              账户终止后：
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>您将无法访问您的账户和生成的内容</li>
              <li>我们可能会删除您的数据（根据我们的数据保留政策）</li>
              <li>已支付的费用通常不予退还</li>
              <li>本协议中应当在终止后继续有效的条款将继续有效</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. 隐私保护</h2>
            <p className="text-gray-700 mb-4">
              我们重视您的隐私。我们如何收集、使用和保护您的个人信息在我们的
              <Link href="/privacy" className="text-orange-600 hover:text-orange-700 font-medium">《隐私政策》</Link>
              中详细说明。
            </p>
            <p className="text-gray-700 mb-4">
              使用本服务即表示您同意我们按照隐私政策处理您的信息。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. 协议变更</h2>
            <p className="text-gray-700 mb-4">
              我们保留随时修改本协议的权利。重大变更时，我们将通过以下方式通知您：
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>在网站上发布公告</li>
              <li>向您的注册邮箱发送通知</li>
              <li>在您登录时显示弹窗提示</li>
            </ul>
            <p className="text-gray-700 mb-4">
              变更生效后继续使用服务即表示您接受修订后的协议。
              如果您不同意变更，请停止使用服务并关闭账户。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. DMCA 版权侵权通知程序</h2>
            <p className="text-gray-700 mb-4">
              如果您认为本服务上的内容侵犯了您的版权，请向我们的 DMCA 指定代理人发送书面通知，包括：
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>版权所有人或其授权代表的签名（电子或物理）</li>
              <li>被侵权作品的描述</li>
              <li>涉嫌侵权内容在我们服务上的位置（URL 或具体描述）</li>
              <li>您的联系信息（地址、电话、邮箱）</li>
              <li>您善意相信该使用未经版权所有人、其代理人或法律授权的声明</li>
              <li>您在伪证处罚下声明通知中的信息准确，且您是版权所有人或其授权代表</li>
            </ul>
            <p className="text-gray-700 mb-4">
              <strong>DMCA 通知邮箱：</strong> legal@monna.us
            </p>
            <p className="text-gray-700 mb-4">
              我们将根据适用法律及时处理有效的 DMCA 通知。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. 争议解决</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">15.1 友好协商</h3>
            <p className="text-gray-700 mb-4">
              如果您与我们之间发生任何争议，我们鼓励首先通过友好协商解决。
              请联系我们的客户支持团队：legal@monna.us
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">15.2 仲裁或诉讼</h3>
            <p className="text-gray-700 mb-4">
              如果协商无法解决争议，双方同意将争议提交[指定仲裁机构/管辖法院]解决。
            </p>
            <p className="text-gray-700 mb-4">
              本协议受[适用法律管辖地]法律管辖和解释，不考虑其法律冲突原则。
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">15.3 集体诉讼豁免</h3>
            <p className="text-gray-700 mb-4">
              在法律允许的范围内，您同意仅以个人身份提起诉讼，而不作为集体诉讼、
              集体仲裁或代表诉讼的原告或成员。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. 其他条款</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">16.1 完整协议</h3>
            <p className="text-gray-700 mb-4">
              本协议（连同我们的隐私政策和其他引用的政策）构成您与我们之间关于
              使用本服务的完整协议，取代所有先前的协议、谅解和安排。
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">16.2 可分割性</h3>
            <p className="text-gray-700 mb-4">
              如果本协议的任何条款被认定为无效或不可执行，该条款将在最小必要范围内
              修改或删除，其余条款将继续完全有效。
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">16.3 不弃权</h3>
            <p className="text-gray-700 mb-4">
              我们未行使或延迟行使本协议下的任何权利或救济，不构成对该权利或救济的放弃。
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">16.4 转让</h3>
            <p className="text-gray-700 mb-4">
              您不得未经我们书面同意转让或转移本协议下的权利或义务。
              我们可以自由转让本协议（例如在公司合并或收购的情况下）。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">17. 联系我们</h2>
            <p className="text-gray-700 mb-4">
              如果您对本协议有任何问题、意见或建议，请通过以下方式联系我们：
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>法律事务邮箱：legal@xroting.com</li>
              <li>客户支持邮箱：support1@xroting.com</li>
              <li>网站：https://www.monna.us</li>
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
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of the Agreement and Scope</h2>
                <p className="text-gray-700 mb-4">
                  Welcome to the services provided by XROTING TECHNOLOGY LLC ("we," "us," or "the Company"). This User Service Agreement (the "Agreement") is a legal agreement between you and the Company regarding your use of our services.
                </p>
                <p className="text-gray-700 mb-4">
                  <strong>By using the Services, you acknowledge that you have read, understood, and agree to be bound by all terms of this Agreement.</strong> If you do not agree with any part of this Agreement, please stop using the Services immediately.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of the Services</h2>
                <p className="text-gray-700 mb-4">
                  We provide AI-powered image and video generation services (the "Services"). The Services allow users to generate various creative content via text prompts, reference images, and other inputs.
                </p>
                <p className="text-gray-700 mb-4">
                  We reserve the right to modify, suspend, or terminate all or part of the Services at any time without prior notice. We will make reasonable efforts to maintain stability and availability, but we do not warrant uninterrupted or error-free operation.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Registration and Account Management</h2>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Eligibility</h3>
                <p className="text-gray-700 mb-4">
                  You must be at least <strong>13 years old</strong> to register for and use the Services. If you are under 13, do not register or use the Services.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 Account Security</h3>
                <p className="text-gray-700 mb-4">
                  You are responsible for maintaining the security of your account, including but not limited to:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Safeguarding your login credentials (email, password, etc.)</li>
                  <li>Not sharing your account information with others</li>
                  <li>Promptly notifying us of any unauthorized use of your account</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  You are fully responsible for all activities that occur under your account.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3 Accuracy of Account Information</h3>
                <p className="text-gray-700 mb-4">
                  You agree to provide true, accurate, and complete registration information and to keep it updated. Providing false information may result in suspension or termination of your account.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. User Conduct</h2>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Prohibited Content and Activities</h3>
                <p className="text-gray-700 mb-4">
                  You may not create, upload, distribute, or request the generation of content that includes:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Illegal content: including but not limited to child sexual abuse material, violence, terrorism, or other unlawful content</li>
                  <li>Hate speech: discriminatory content targeting race, gender, religion, sexual orientation, etc.</li>
                  <li>Infringing content: content that violates others' intellectual property, privacy, or other rights</li>
                  <li>Fraudulent content: content used for scams, identity forgery, or misleading others</li>
                  <li>Adult content: pornographic, explicit, or otherwise inappropriate sexual content</li>
                  <li>Dangerous content: content that may encourage self-harm, suicide, or dangerous acts</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 Prohibited Technical Activities</h3>
                <p className="text-gray-700 mb-4">
                  You may not:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Attempt to access our systems, servers, or databases without authorization</li>
                  <li>Interfere with or disrupt the normal operation of the Services</li>
                  <li>Use automated tools (e.g., crawlers, bots) to scrape content or data at scale</li>
                  <li>Reverse engineer, decompile, or attempt to extract source code of the Services</li>
                  <li>Bypass any security measures or usage restrictions we implement</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">4.3 Fair Use</h3>
                <p className="text-gray-700 mb-4">
                  You must use the Services reasonably and not abuse system resources or impair other users' normal use. We reserve the right to impose limits on abnormal usage.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Intellectual Property</h2>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">5.1 Our IP</h3>
                <p className="text-gray-700 mb-4">
                  All technologies, software, trademarks, logos, and other intellectual property related to the Services are owned by us or our licensors. Without express authorization, you may not copy, modify, distribute, or commercially exploit such content.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">5.2 Your Content</h3>
                <p className="text-gray-700 mb-4">
                  You retain all rights to content you upload to the Services (including text prompts, reference images, etc.). To provide the Services to you, you grant us a worldwide, non-exclusive, royalty-free license to use, store, process, and display such content for the purpose of providing the Services to you.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">5.3 Rights in AI-Generated Content</h3>
                <p className="text-gray-700 mb-4">
                  The intellectual property status of content generated through the Services ("Generated Content") depends on applicable law. In some jurisdictions, AI-generated content may not be protected by copyright.
                </p>
                <p className="text-gray-700 mb-4">
                  <strong>We make no warranties regarding the IP status of Generated Content.</strong> You are responsible for ensuring your use of Generated Content complies with applicable laws and third-party rights. To the extent permitted by law, we grant you the right to use the Generated Content, and you assume all legal risks associated with such use.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">5.4 Infringement Handling</h3>
                <p className="text-gray-700 mb-4">
                  If you believe content on the Services infringes your IP rights, please notify us under the DMCA procedure in Section 14.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Paid Services and Subscriptions</h2>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">6.1 Pricing and Payment</h3>
                <p className="text-gray-700 mb-4">
                  We offer both free and paid tiers. Prices and features of paid Services are shown on the Services pages.
                </p>
                <p className="text-gray-700 mb-4">
                  Prices may change at any time. We will notify existing subscribers prior to price changes. Continued use after a change constitutes acceptance of the new price.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">6.2 Subscription Renewal</h3>
                <p className="text-gray-700 mb-4">
                  Subscriptions renew automatically on the cycle you select (monthly or annually) unless you cancel before the renewal date. You are responsible for canceling if you do not wish to renew.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">6.3 Refund Policy</h3>
                <p className="text-gray-700 mb-4">
                  Unless required by law or expressly stated otherwise by us, paid subscriptions are generally non-refundable. For exceptional cases (e.g., severe service outages), contact customer support.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">6.4 Taxes</h3>
                <p className="text-gray-700 mb-4">
                  Displayed prices may exclude applicable taxes (e.g., VAT, sales tax). The checkout page will show the total amount including applicable taxes.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Service Limits and Quotas</h2>
                <p className="text-gray-700 mb-4">
                  Depending on your subscription tier, we may impose limits on:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Daily or monthly generation counts</li>
                  <li>Resolution and duration of Generated Content</li>
                  <li>Available AI models and features</li>
                  <li>Storage capacity and retention periods</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  Specific limits are described on the Services pages. Exceeding your quota may require upgrading or waiting for a reset.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Disclaimers</h2>
                <p className="text-gray-700 mb-4">
                  <strong>The Services are provided "as is" and "as available," without any express or implied warranties.</strong>
                </p>
                <p className="text-gray-700 mb-4">
                  We expressly disclaim warranties regarding:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Accuracy, reliability, suitability, or completeness of the Services</li>
                  <li>Quality, legality, or suitability of Generated Content</li>
                  <li>Uninterrupted, timely, or error-free operation</li>
                  <li>Complete security or absence of viruses or other harmful components</li>
                  <li>Non-infringement of third-party rights by Generated Content</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  You understand and agree that your use of the Services and any Generated Content is at your sole risk.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Limitation of Liability</h2>
                <p className="text-gray-700 mb-4">
                  To the maximum extent permitted by law, we are not liable for:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Indirect, incidental, punitive, or consequential damages</li>
                  <li>Loss of profits, business interruption, or data loss</li>
                  <li>Any losses arising from your use of or inability to use the Services</li>
                  <li>Acts or content of third parties</li>
                  <li>Force majeure events (e.g., natural disasters, war, government actions)</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  <strong>Our total liability shall not exceed the greater of (i) the total fees you paid to us in the preceding 12 months or (ii) USD 100.</strong>
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Indemnification</h2>
                <p className="text-gray-700 mb-4">
                  You agree to indemnify, defend, and hold harmless the Company and its affiliates, directors, employees, and agents from and against any claims, losses, liabilities, damages, costs, or expenses (including reasonable attorneys' fees) arising out of or related to:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Your breach of any term of this Agreement</li>
                  <li>Your use of the Services</li>
                  <li>Content you upload or generate that infringes third-party rights</li>
                  <li>Your violation of applicable laws or regulations</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Suspension and Termination</h2>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">11.1 Our Rights</h3>
                <p className="text-gray-700 mb-4">
                  We may suspend or terminate your account if:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>You breach any term of this Agreement</li>
                  <li>You engage in prohibited conduct or create prohibited content</li>
                  <li>You fail to pay fees due</li>
                  <li>We reasonably suspect unauthorized use of your account</li>
                  <li>Required by law, regulation, or law enforcement</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">11.2 Your Rights</h3>
                <p className="text-gray-700 mb-4">
                  You may terminate your use of the Services and delete your account at any time via account settings or by contacting support.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">11.3 Effect of Termination</h3>
                <p className="text-gray-700 mb-4">
                  Upon termination:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>You will lose access to your account and Generated Content</li>
                  <li>We may delete your data pursuant to our data retention policies</li>
                  <li>Fees already paid are generally non-refundable</li>
                  <li>Provisions that by their nature should survive termination will survive</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Privacy</h2>
                <p className="text-gray-700 mb-4">
                  We value your privacy. Our Privacy Policy explains how we collect, use, and protect your personal information.
                </p>
                <p className="text-gray-700 mb-4">
                  By using the Services, you consent to our processing of your information in accordance with the Privacy Policy.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Changes to this Agreement</h2>
                <p className="text-gray-700 mb-4">
                  We may modify this Agreement at any time. For material changes, we will notify you by:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Posting an announcement on the website</li>
                  <li>Sending a notice to your registered email</li>
                  <li>Displaying a pop-up upon login</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  Your continued use of the Services after changes take effect constitutes acceptance of the revised Agreement. If you do not agree, discontinue use and close your account.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. DMCA Copyright Infringement Notice Procedure</h2>
                <p className="text-gray-700 mb-4">
                  If you believe content on the Services infringes your copyright, please send a written notice to our DMCA agent including:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>A physical or electronic signature of the copyright owner or authorized agent</li>
                  <li>Identification of the copyrighted work claimed to be infringed</li>
                  <li>Identification of the allegedly infringing material and its location on our Services (URL or specific description)</li>
                  <li>Your contact information (address, telephone, email)</li>
                  <li>A statement that you have a good-faith belief that the use is not authorized by the copyright owner, its agent, or the law</li>
                  <li>A statement under penalty of perjury that the information in the notice is accurate and that you are the copyright owner or authorized to act on their behalf</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  <strong>DMCA Notice Email:</strong> legal@monna.us
                </p>
                <p className="text-gray-700 mb-4">
                  We will process valid DMCA notices promptly in accordance with applicable law.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Dispute Resolution</h2>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">15.1 Amicable Resolution</h3>
                <p className="text-gray-700 mb-4">
                  If any dispute arises between you and us, we encourage amicable resolution first. Please contact customer support: legal@monna.us
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">15.2 Arbitration or Litigation</h3>
                <p className="text-gray-700 mb-4">
                  If a dispute cannot be resolved amicably, the parties agree to submit the dispute to the [designated arbitration institution/court of competent jurisdiction].
                </p>
                <p className="text-gray-700 mb-4">
                  This Agreement is governed by and construed in accordance with the laws of [governing law jurisdiction], without regard to conflict-of-laws principles.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">15.3 Class Action Waiver</h3>
                <p className="text-gray-700 mb-4">
                  To the extent permitted by law, you agree to bring claims only in your individual capacity, and not as a plaintiff or class member in any purported class, collective, or representative action.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Miscellaneous</h2>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">16.1 Entire Agreement</h3>
                <p className="text-gray-700 mb-4">
                  This Agreement (together with our Privacy Policy and any referenced policies) constitutes the entire agreement between you and us regarding the Services and supersedes all prior agreements, understandings, and arrangements.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">16.2 Severability</h3>
                <p className="text-gray-700 mb-4">
                  If any provision of this Agreement is held invalid or unenforceable, that provision will be modified or deleted to the minimum extent necessary, and the remaining provisions will remain in full force and effect.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">16.3 No Waiver</h3>
                <p className="text-gray-700 mb-4">
                  Our failure or delay in exercising any right or remedy under this Agreement does not constitute a waiver of that right or remedy.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">16.4 Assignment</h3>
                <p className="text-gray-700 mb-4">
                  You may not assign or transfer any rights or obligations under this Agreement without our prior written consent. We may freely assign this Agreement (e.g., in connection with a merger or acquisition).
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">17. Contact Us</h2>
                <p className="text-gray-700 mb-4">
                  If you have any questions, comments, or suggestions regarding this Agreement, please contact us at:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Legal: legal@xroting.com</li>
                  <li>Customer Support: support1@xroting.com</li>
                  <li>Website: https://www.monna.us</li>
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
