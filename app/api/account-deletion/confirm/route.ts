import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { inngest } from '@/inngest/client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.monna.us';

/**
 * GET /api/account-deletion/confirm?token=xxx
 * Confirm deletion request and trigger account deletion process
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!token) {
    return new NextResponse(
      renderErrorPage('Invalid confirmation link', '无效的确认链接', 'zh'),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  try {
    // Create Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Find deletion request by token
    const { data: deletionRequest, error: fetchError } = await supabase
      .from('deletion_requests')
      .select('*')
      .eq('token', token)
      .single();

    if (fetchError || !deletionRequest) {
      console.error('Deletion request not found:', fetchError);
      return new NextResponse(
        renderErrorPage(
          'Invalid or expired confirmation link',
          '确认链接无效或已过期',
          'zh'
        ),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const lang = deletionRequest.lang || 'zh';

    // Check if already confirmed
    if (deletionRequest.status !== 'pending') {
      const statusMessage = deletionRequest.status === 'completed'
        ? (lang === 'en' ? 'This account has already been deleted.' : '此账号已被删除。')
        : (lang === 'en' ? 'This deletion request has already been processed.' : '此删除请求已被处理。');

      return new NextResponse(
        renderErrorPage(
          statusMessage,
          statusMessage,
          lang
        ),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // Check if expired
    const expiresAt = new Date(deletionRequest.expires_at);
    if (expiresAt < new Date()) {
      return new NextResponse(
        renderErrorPage(
          'This confirmation link has expired. Please submit a new deletion request.',
          '此确认链接已过期，请重新提交删除请求。',
          lang
        ),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // Update status to confirmed
    const { error: updateError } = await supabase
      .from('deletion_requests')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString()
      })
      .eq('id', deletionRequest.id);

    if (updateError) {
      console.error('Failed to update deletion request:', updateError);
      return new NextResponse(
        renderErrorPage(
          'Failed to process confirmation. Please try again or contact support.',
          '确认处理失败，请重试或联系支持。',
          lang
        ),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // Trigger async deletion process via Inngest
    try {
      await inngest.send({
        name: 'account/deletion.confirmed',
        data: {
          deletionRequestId: deletionRequest.id,
          userId: deletionRequest.user_id,
          email: deletionRequest.email,
          lang: deletionRequest.lang
        }
      });

      console.log('✅ Account deletion job triggered for:', deletionRequest.email);
    } catch (inngestError) {
      console.error('Failed to trigger deletion job:', inngestError);
      // Don't fail the confirmation - we can manually process or retry
    }

    // Log activity if user exists
    if (deletionRequest.user_id) {
      await supabase
        .from('activity_logs')
        .insert({
          user_id: deletionRequest.user_id,
          action: 'account_deletion_confirmed',
          ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
          metadata: {
            deletion_request_id: deletionRequest.id,
            email: deletionRequest.email
          }
        });
    }

    // Render success page
    return new NextResponse(
      renderSuccessPage(deletionRequest.email, lang),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );

  } catch (error) {
    console.error('Error confirming deletion:', error);
    return new NextResponse(
      renderErrorPage(
        'Internal error. Please contact support at privacy@xroting.com',
        '内部错误，请联系支持：privacy@xroting.com',
        'zh'
      ),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

/**
 * Render success page after confirmation
 */
function renderSuccessPage(email: string, lang: string): string {
  const isEN = lang === 'en';

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isEN ? 'Deletion Confirmed' : '删除已确认'} - Monna AI</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 24px;
      max-width: 600px;
      width: 100%;
      padding: 48px 32px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .icon {
      width: 80px;
      height: 80px;
      background: #10b981;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .checkmark {
      font-size: 48px;
      color: white;
    }
    h1 {
      color: #18181b;
      font-size: 28px;
      margin-bottom: 16px;
      text-align: center;
    }
    .email {
      background: #f4f4f5;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: monospace;
      text-align: center;
      margin-bottom: 24px;
      color: #52525b;
    }
    .info {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    .info p {
      color: #92400e;
      font-size: 14px;
      line-height: 1.6;
    }
    .timeline {
      margin: 32px 0;
    }
    .timeline-item {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }
    .timeline-marker {
      width: 12px;
      height: 12px;
      background: #10b981;
      border-radius: 50%;
      margin-top: 4px;
      flex-shrink: 0;
    }
    .timeline-marker.pending {
      background: #d1d5db;
    }
    .timeline-content h3 {
      color: #18181b;
      font-size: 16px;
      margin-bottom: 4px;
    }
    .timeline-content p {
      color: #71717a;
      font-size: 14px;
      line-height: 1.5;
    }
    .actions {
      display: flex;
      gap: 12px;
      margin-top: 32px;
    }
    .btn {
      flex: 1;
      padding: 14px 24px;
      border-radius: 12px;
      text-decoration: none;
      text-align: center;
      font-weight: 600;
      font-size: 16px;
      transition: all 0.2s;
      display: block;
    }
    .btn-primary {
      background: #18181b;
      color: white;
    }
    .btn-primary:hover {
      background: #27272a;
    }
    .btn-secondary {
      background: #f4f4f5;
      color: #18181b;
    }
    .btn-secondary:hover {
      background: #e4e4e7;
    }
    .support {
      text-align: center;
      margin-top: 32px;
      padding-top: 32px;
      border-top: 1px solid #e4e4e7;
      color: #71717a;
      font-size: 14px;
    }
    .support a {
      color: #3b82f6;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <div class="checkmark">✓</div>
    </div>

    <h1>${isEN ? 'Deletion Confirmed' : '删除已确认'}</h1>

    <div class="email">${email}</div>

    <div class="info">
      <p>
        ${isEN
          ? '<strong>Your account deletion has been confirmed.</strong> We will process your request within 7 business days. You will receive a confirmation email once the deletion is complete.'
          : '<strong>你的账号删除请求已确认。</strong>我们将在 7 个工作日内处理你的请求。删除完成后，你将收到确认邮件。'
        }
      </p>
    </div>

    <div class="timeline">
      <div class="timeline-item">
        <div class="timeline-marker"></div>
        <div class="timeline-content">
          <h3>${isEN ? '1. Request Submitted' : '1. 请求已提交'}</h3>
          <p>${isEN ? 'You submitted the deletion request' : '你已提交删除请求'}</p>
        </div>
      </div>

      <div class="timeline-item">
        <div class="timeline-marker"></div>
        <div class="timeline-content">
          <h3>${isEN ? '2. Email Confirmed' : '2. 邮件已确认'}</h3>
          <p>${isEN ? 'You confirmed via email link (current step)' : '你已通过邮件链接确认（当前步骤）'}</p>
        </div>
      </div>

      <div class="timeline-item">
        <div class="timeline-marker pending"></div>
        <div class="timeline-content">
          <h3>${isEN ? '3. Processing Deletion' : '3. 处理删除中'}</h3>
          <p>${isEN ? 'We will delete your data (1-7 days)' : '我们将删除你的数据（1-7天）'}</p>
        </div>
      </div>

      <div class="timeline-item">
        <div class="timeline-marker pending"></div>
        <div class="timeline-content">
          <h3>${isEN ? '4. Completion Notice' : '4. 完成通知'}</h3>
          <p>${isEN ? 'You will receive a final confirmation email' : '你将收到最终确认邮件'}</p>
        </div>
      </div>
    </div>

    <div class="actions">
      <a href="${SITE_URL}" class="btn btn-primary">
        ${isEN ? 'Back to Home' : '返回首页'}
      </a>
    </div>

    <div class="support">
      ${isEN ? 'Need help? Contact us at' : '需要帮助？联系我们：'}
      <a href="mailto:privacy@xroting.com">privacy@xroting.com</a>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Render error page
 */
function renderErrorPage(messageEN: string, messageZH: string, lang: string): string {
  const isEN = lang === 'en';
  const message = isEN ? messageEN : messageZH;

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isEN ? 'Error' : '错误'} - Monna AI</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #f87171 0%, #dc2626 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 24px;
      max-width: 600px;
      width: 100%;
      padding: 48px 32px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: #ef4444;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon::before {
      content: "✕";
      font-size: 48px;
      color: white;
    }
    h1 {
      color: #18181b;
      font-size: 28px;
      margin-bottom: 16px;
    }
    p {
      color: #52525b;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    .btn {
      padding: 14px 24px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #18181b;
      color: white;
    }
    .btn-primary:hover {
      background: #27272a;
    }
    .btn-secondary {
      background: #f4f4f5;
      color: #18181b;
    }
    .btn-secondary:hover {
      background: #e4e4e7;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon"></div>
    <h1>${isEN ? 'Oops! Something went wrong' : '哎呀！出错了'}</h1>
    <p>${message}</p>
    <div class="actions">
      <a href="${SITE_URL}/delete-account?lang=${lang}" class="btn btn-primary">
        ${isEN ? 'Try Again' : '重试'}
      </a>
      <a href="${SITE_URL}" class="btn btn-secondary">
        ${isEN ? 'Back to Home' : '返回首页'}
      </a>
    </div>
  </div>
</body>
</html>
  `.trim();
}
