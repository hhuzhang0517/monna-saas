import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.monna.us';

/**
 * Generate a secure random token for deletion confirmation
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Get client IP address from request headers
 */
function getClientIP(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return realIP || null;
}

/**
 * Send deletion confirmation email
 */
async function sendDeletionEmail(
  email: string,
  token: string,
  lang: string
): Promise<void> {
  const isEN = lang === 'en';
  const confirmUrl = `${SITE_URL}/api/account-deletion/confirm?token=${token}`;

  const subject = isEN
    ? 'Confirm your Monna AI account deletion request'
    : '确认删除你的 Monna AI 账号';

  const emailBody = isEN
    ? `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #18181b; font-size: 24px; margin-bottom: 16px;">Account Deletion Request</h1>

        <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
          We received a request to delete your Monna AI account associated with this email address.
        </p>

        <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          <strong>Important:</strong> This action is permanent and cannot be undone. All your data, including generated content, will be deleted.
        </p>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <p style="color: #92400e; font-size: 14px; margin: 0;">
            <strong>Before you proceed:</strong><br/>
            If you have an active subscription via Google Play or Apple App Store, please cancel it first in the respective store.
          </p>
        </div>

        <a href="${confirmUrl}" style="display: inline-block; background-color: #18181b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin-bottom: 24px;">
          Confirm Account Deletion
        </a>

        <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
          Or copy and paste this link into your browser:<br/>
          <a href="${confirmUrl}" style="color: #3b82f6; word-break: break-all;">${confirmUrl}</a>
        </p>

        <p style="color: #71717a; font-size: 14px; line-height: 1.6;">
          This link will expire in 24 hours. If you didn't request this deletion, please ignore this email or contact us at privacy@xroting.com.
        </p>

        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;"/>

        <p style="color: #a1a1aa; font-size: 12px;">
          Monna AI - XROTING TECHNOLOGY LLC<br/>
          This is an automated message, please do not reply.
        </p>
      </div>
    `
    : `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #18181b; font-size: 24px; margin-bottom: 16px;">账号删除请求</h1>

        <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
          我们收到了一个删除与此邮箱关联的 Monna AI 账号的请求。
        </p>

        <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          <strong>重要提示：</strong>此操作不可逆转。你的所有数据，包括生成的内容，都将被永久删除。
        </p>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <p style="color: #92400e; font-size: 14px; margin: 0;">
            <strong>删除前请注意：</strong><br/>
            如果你通过 Google Play 或 Apple App Store 订阅了服务，请先在应用商店取消订阅。
          </p>
        </div>

        <a href="${confirmUrl}" style="display: inline-block; background-color: #18181b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin-bottom: 24px;">
          确认删除账号
        </a>

        <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
          或将此链接复制粘贴到浏览器中：<br/>
          <a href="${confirmUrl}" style="color: #3b82f6; word-break: break-all;">${confirmUrl}</a>
        </p>

        <p style="color: #71717a; font-size: 14px; line-height: 1.6;">
          此链接将在 24 小时后过期。如果你没有请求删除账号，请忽略此邮件或联系我们：privacy@xroting.com
        </p>

        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;"/>

        <p style="color: #a1a1aa; font-size: 12px;">
          Monna AI - XROTING TECHNOLOGY LLC<br/>
          这是一封自动邮件，请勿回复。
        </p>
      </div>
    `;

  // Use Supabase Auth to send email
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

  // Note: Supabase doesn't have a built-in custom email sending API
  // You need to integrate with an email service provider (e.g., Resend, SendGrid, etc.)
  // For now, we'll log the email content and return success
  // TODO: Integrate with actual email service

  console.log('📧 Deletion confirmation email generated:', {
    to: email,
    subject,
    confirmUrl,
    lang
  });

  // In production, you would send the email here:
  // await sendEmail({ to: email, subject, html: emailBody });

  // For development/testing, you can use a service like Resend:
  try {
    // Example with Resend (if you have RESEND_API_KEY in .env):
    if (process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Monna AI <noreply@xroting.com>',
          to: email,
          subject,
          html: emailBody,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to send email via Resend:', error);
        throw new Error('Failed to send confirmation email');
      }

      console.log('✅ Email sent successfully via Resend');
    } else {
      console.warn('⚠️ No email service configured. Email content logged above.');
      console.warn('💡 To send actual emails, add RESEND_API_KEY to your .env file');
    }
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * POST /api/account-deletion/request
 * Handle account deletion request from web form
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const email = formData.get('email')?.toString().trim();
    const reason = formData.get('reason')?.toString().trim() || null;
    const lang = formData.get('lang')?.toString() || 'zh';

    // Validate email
    if (!email || !email.includes('@')) {
      const errorMsg = lang === 'en'
        ? 'Please provide a valid email address'
        : '请提供有效的邮箱地址';

      return NextResponse.redirect(
        new URL(`/delete-account?error=${encodeURIComponent(errorMsg)}&lang=${lang}`, SITE_URL)
      );
    }

    // Create Supabase client with service role for database operations
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

    // Check if user exists with this email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .is('deleted_at', null)
      .single();

    // Generate secure token
    const token = generateToken();
    const ipAddress = getClientIP(request);

    // Create deletion request
    const { error: insertError } = await supabase
      .from('deletion_requests')
      .insert({
        user_id: profile?.id || null,
        email,
        token,
        status: 'pending',
        reason,
        lang,
        ip_address: ipAddress,
        metadata: {
          user_agent: request.headers.get('user-agent'),
          created_from: 'web'
        }
      });

    if (insertError) {
      console.error('Failed to create deletion request:', insertError);
      const errorMsg = lang === 'en'
        ? 'Failed to process your request. Please try again.'
        : '处理请求失败，请重试。';

      return NextResponse.redirect(
        new URL(`/delete-account?error=${encodeURIComponent(errorMsg)}&lang=${lang}`, SITE_URL)
      );
    }

    // Send confirmation email
    try {
      await sendDeletionEmail(email, token, lang);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the request if email fails - user can contact support
      const errorMsg = lang === 'en'
        ? 'Request created but email failed. Please contact privacy@xroting.com'
        : '请求已创建但邮件发送失败，请联系 privacy@xroting.com';

      return NextResponse.redirect(
        new URL(`/delete-account?error=${encodeURIComponent(errorMsg)}&lang=${lang}`, SITE_URL)
      );
    }

    // Log activity if user exists
    if (profile?.id) {
      await supabase
        .from('activity_logs')
        .insert({
          user_id: profile.id,
          action: 'account_deletion_requested',
          ip_address: ipAddress,
          metadata: {
            email,
            lang,
            has_reason: !!reason
          }
        });
    }

    // Redirect to success page
    return NextResponse.redirect(
      new URL(`/delete-account?done=1&lang=${lang}`, SITE_URL)
    );

  } catch (error) {
    console.error('Error processing deletion request:', error);

    return NextResponse.redirect(
      new URL('/delete-account?error=Internal+error&lang=zh', SITE_URL)
    );
  }
}
