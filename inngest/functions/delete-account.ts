import { inngest } from "@/inngest/client";
import { createClient } from '@supabase/supabase-js';

/**
 * Account deletion processor
 * Triggered when user confirms deletion request via email
 *
 * Deletes:
 * - User's generated content (jobs, results from storage)
 * - User's activity logs
 * - User's credit transactions
 * - User's team memberships
 * - User's profile
 * - User's auth record (via Supabase Auth API)
 *
 * Retains:
 * - Payment/invoice records (de-identified where possible)
 * - Aggregated analytics (anonymized)
 */
export const processAccountDeletion = inngest.createFunction(
  {
    id: "process-account-deletion",
    name: "Process Account Deletion",
    retries: 3
  },
  { event: "account/deletion.confirmed" },
  async ({ event, step }) => {
    const { deletionRequestId, userId, email, lang } = event.data;

    console.log('🗑️ Starting account deletion process:', { deletionRequestId, userId, email });

    // Use Service Role for all database operations
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

    // Step 1: Update deletion request status to processing
    await step.run('update-status-processing', async () => {
      const { error } = await supabase
        .from('deletion_requests')
        .update({ status: 'processing' })
        .eq('id', deletionRequestId);

      if (error) {
        console.error('Failed to update deletion request status:', error);
        throw new Error('Failed to update deletion request status');
      }

      console.log('✓ Deletion request marked as processing');
    });

    // If no user ID (email not found in system), just mark as completed
    if (!userId) {
      await step.run('complete-no-user', async () => {
        const { error } = await supabase
          .from('deletion_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            metadata: { reason: 'no_user_found' }
          })
          .eq('id', deletionRequestId);

        if (error) {
          console.error('Failed to complete deletion request:', error);
          throw error;
        }

        console.log('✓ No user found - marked as completed');
      });

      return { success: true, reason: 'no_user_found' };
    }

    // Step 2: Delete user's generated content from storage
    await step.run('delete-storage-content', async () => {
      try {
        // Get all user's jobs to find storage files
        const { data: jobs } = await supabase
          .from('jobs')
          .select('result_url')
          .eq('user_id', userId)
          .not('result_url', 'is', null);

        if (jobs && jobs.length > 0) {
          console.log(`Found ${jobs.length} jobs with storage content`);

          // Extract storage paths from result URLs
          const storagePaths: string[] = [];
          for (const job of jobs) {
            if (job.result_url) {
              // Extract path from Supabase storage URL
              // Format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
              const match = job.result_url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
              if (match && match[1]) {
                storagePaths.push(match[1]);
              }
            }
          }

          // Delete files from storage
          if (storagePaths.length > 0) {
            const { error: storageError } = await supabase
              .storage
              .from('generations')
              .remove(storagePaths);

            if (storageError) {
              console.warn('Some files could not be deleted from storage:', storageError);
              // Don't fail the deletion if storage cleanup fails
            } else {
              console.log(`✓ Deleted ${storagePaths.length} files from storage`);
            }
          }
        }
      } catch (error) {
        console.error('Error deleting storage content:', error);
        // Don't fail the whole deletion if storage cleanup fails
      }
    });

    // Step 3: Delete user's jobs (generation history)
    await step.run('delete-jobs', async () => {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to delete jobs:', error);
        throw error;
      }

      console.log('✓ Deleted user jobs');
    });

    // Step 4: Get user's teams (to clean up team-related data)
    const teamIds = await step.run('get-user-teams', async () => {
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId);

      return teamMembers?.map(tm => tm.team_id) || [];
    });

    // Step 5: Delete credit transactions
    if (teamIds.length > 0) {
      await step.run('delete-credit-transactions', async () => {
        const { error } = await supabase
          .from('credit_transactions')
          .delete()
          .or(`user_id.eq.${userId},${teamIds.map(id => `team_id.eq.${id}`).join(',')}`);

        if (error) {
          console.error('Failed to delete credit transactions:', error);
          // Don't fail - these are just records
        } else {
          console.log('✓ Deleted credit transactions');
        }
      });
    }

    // Step 6: Delete activity logs
    await step.run('delete-activity-logs', async () => {
      const { error } = await supabase
        .from('activity_logs')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to delete activity logs:', error);
        // Don't fail - these are just logs
      } else {
        console.log('✓ Deleted activity logs');
      }
    });

    // Step 7: Delete team memberships
    await step.run('delete-team-memberships', async () => {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to delete team memberships:', error);
        throw error;
      }

      console.log('✓ Deleted team memberships');
    });

    // Step 8: Delete teams where user is the only member
    if (teamIds.length > 0) {
      await step.run('delete-empty-teams', async () => {
        for (const teamId of teamIds) {
          // Check if team has other members
          const { data: remainingMembers } = await supabase
            .from('team_members')
            .select('id')
            .eq('team_id', teamId);

          if (!remainingMembers || remainingMembers.length === 0) {
            // Delete team if no remaining members
            const { error } = await supabase
              .from('teams')
              .delete()
              .eq('id', teamId);

            if (error) {
              console.warn(`Failed to delete team ${teamId}:`, error);
            } else {
              console.log(`✓ Deleted empty team ${teamId}`);
            }
          }
        }
      });
    }

    // Step 9: Soft delete profile (mark as deleted)
    await step.run('soft-delete-profile', async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          deleted_at: new Date().toISOString(),
          email: `deleted_${userId}@deleted.local`, // Anonymize email
          name: null,
          gender: null
        })
        .eq('id', userId);

      if (error) {
        console.error('Failed to soft delete profile:', error);
        throw error;
      }

      console.log('✓ Soft deleted profile');
    });

    // Step 10: Delete auth user via Supabase Admin API
    await step.run('delete-auth-user', async () => {
      try {
        const { error } = await supabase.auth.admin.deleteUser(userId);

        if (error) {
          console.error('Failed to delete auth user:', error);
          throw error;
        }

        console.log('✓ Deleted auth user');
      } catch (error) {
        console.error('Error deleting auth user:', error);
        throw error;
      }
    });

    // Step 11: Mark deletion request as completed
    await step.run('complete-deletion-request', async () => {
      const { error } = await supabase
        .from('deletion_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', deletionRequestId);

      if (error) {
        console.error('Failed to complete deletion request:', error);
        throw error;
      }

      console.log('✓ Deletion request marked as completed');
    });

    // Step 12: Send completion email
    await step.run('send-completion-email', async () => {
      try {
        await sendDeletionCompletionEmail(email, lang);
        console.log('✓ Sent completion email');
      } catch (error) {
        console.error('Failed to send completion email:', error);
        // Don't fail the deletion if email fails
      }
    });

    console.log('🎉 Account deletion completed successfully for:', email);

    return {
      success: true,
      userId,
      email,
      deletedAt: new Date().toISOString()
    };
  }
);

/**
 * Send deletion completion email to user
 */
async function sendDeletionCompletionEmail(email: string, lang: string): Promise<void> {
  const isEN = lang === 'en';

  const subject = isEN
    ? 'Your Monna AI account has been deleted'
    : '你的 Monna AI 账号已被删除';

  const emailBody = isEN
    ? `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #18181b; font-size: 24px; margin-bottom: 16px;">Account Deleted</h1>

        <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
          Your Monna AI account associated with <strong>${email}</strong> has been successfully deleted.
        </p>

        <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
          All your personal data, including generated content and account information, has been removed from our systems.
        </p>

        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <p style="color: #065f46; font-size: 14px; margin: 0;">
            <strong>What was deleted:</strong><br/>
            • Account profile and authentication data<br/>
            • Generated images and videos<br/>
            • Generation history and prompts<br/>
            • Activity logs and preferences
          </p>
        </div>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <p style="color: #92400e; font-size: 14px; margin: 0;">
            <strong>What may be retained:</strong><br/>
            • Payment records required by law (de-identified where possible)<br/>
            • Aggregated, anonymized analytics data
          </p>
        </div>

        <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
          Thank you for using Monna AI. We're sorry to see you go.
        </p>

        <p style="color: #71717a; font-size: 14px; line-height: 1.6;">
          If you have any questions or concerns, please contact us at:<br/>
          <a href="mailto:privacy@xroting.com" style="color: #3b82f6;">privacy@xroting.com</a>
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
        <h1 style="color: #18181b; font-size: 24px; margin-bottom: 16px;">账号已删除</h1>

        <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
          与 <strong>${email}</strong> 关联的 Monna AI 账号已成功删除。
        </p>

        <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
          你的所有个人数据，包括生成的内容和账号信息，已从我们的系统中移除。
        </p>

        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <p style="color: #065f46; font-size: 14px; margin: 0;">
            <strong>已删除的内容：</strong><br/>
            • 账号资料和身份认证数据<br/>
            • 生成的图片和视频<br/>
            • 生成历史和提示词<br/>
            • 活动日志和偏好设置
          </p>
        </div>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <p style="color: #92400e; font-size: 14px; margin: 0;">
            <strong>可能保留的内容：</strong><br/>
            • 法律要求保留的支付记录（可行时已去标识化）<br/>
            • 聚合的匿名分析数据
          </p>
        </div>

        <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
          感谢你使用 Monna AI。很遗憾看到你离开。
        </p>

        <p style="color: #71717a; font-size: 14px; line-height: 1.6;">
          如有任何疑问或顾虑，请联系我们：<br/>
          <a href="mailto:privacy@xroting.com" style="color: #3b82f6;">privacy@xroting.com</a>
        </p>

        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;"/>

        <p style="color: #a1a1aa; font-size: 12px;">
          Monna AI - XROTING TECHNOLOGY LLC<br/>
          这是一封自动邮件，请勿回复。
        </p>
      </div>
    `;

  // Send email using Resend if configured
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
      console.error('Failed to send completion email via Resend:', error);
      throw new Error('Failed to send completion email');
    }
  } else {
    console.log('📧 Deletion completion email generated (no email service configured):', {
      to: email,
      subject,
      lang
    });
  }
}
