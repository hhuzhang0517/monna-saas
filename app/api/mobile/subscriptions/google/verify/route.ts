/**
 * Google Play Store 订阅验证 API
 * POST /api/mobile/subscriptions/google/verify
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { mobileSubscriptionManager } from '@/lib/mobile-subscriptions/subscription-manager';
import { GoogleVerificationRequest } from '@/lib/mobile-subscriptions/types';

export async function POST(request: NextRequest) {
  try {
    console.log('🤖 [API] Google Play subscription verification request');

    // 1. 验证用户身份
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ [API] Authentication failed');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. 解析请求体
    const body: GoogleVerificationRequest = await request.json();

    if (!body.purchaseToken || !body.productId) {
      return NextResponse.json(
        { error: 'Missing purchaseToken or productId' },
        { status: 400 }
      );
    }

    console.log(`   User ID: ${user.id}`);
    console.log(`   Product ID: ${body.productId}`);
    console.log(`   Purchase Token: ${body.purchaseToken.substring(0, 20)}...`);

    // 3. 验证并同步订阅
    const result = await mobileSubscriptionManager.verifyAndSyncGoogleSubscription(
      user.id,
      body
    );

    if (!result.success) {
      console.error(`❌ [API] Verification failed: ${result.error}`);
      return NextResponse.json(
        { error: result.error || 'Verification failed' },
        { status: 400 }
      );
    }

    console.log('✅ [API] Google Play subscription verified and synced');

    // 4. 返回成功响应
    return NextResponse.json({
      success: true,
      message: result.message || 'Subscription verified successfully'
    });

  } catch (error: any) {
    console.error('❌ [API] Google Play verification error:', error.message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
