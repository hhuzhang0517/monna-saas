import { createSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';
import { getTeamForUser } from '@/lib/db/queries';
import Stripe from 'stripe';

export async function GET(request: NextRequest) {
  console.log('🔄 Processing Stripe checkout callback...');
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('session_id');
  console.log('Session ID:', sessionId);

  if (!sessionId) {
    console.log('❌ No session ID found, redirecting to pricing');
    return NextResponse.redirect(new URL('http://localhost:3005/pricing'));
  }

  try {
    console.log('📥 Retrieving Stripe session...');
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription'],
    });
    console.log('✅ Session retrieved successfully');

    if (!session.customer || typeof session.customer === 'string') {
      throw new Error('Invalid customer data from Stripe.');
    }

    const customerId = session.customer.id;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    if (!subscriptionId) {
      throw new Error('No subscription found for this session.');
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price.product'],
    });

    const plan = subscription.items.data[0]?.price;

    if (!plan) {
      throw new Error('No plan found for this subscription.');
    }

    const product = plan.product as Stripe.Product;
    const productId = product.id;

    if (!productId) {
      throw new Error('No product ID found for this subscription.');
    }

    // 创建产品名称到计划键的映射
    const planNameMapping: { [key: string]: string } = {
      '基础档': 'basic',
      '专业档': 'professional', 
      '企业档': 'enterprise'
    };

    // 获取计划键，优先使用metadata，然后使用产品名称映射
    const planKey = product.metadata?.plan_key || planNameMapping[product.name] || 'free';

    const userId = session.client_reference_id;
    if (!userId) {
      throw new Error("No user ID found in session's client_reference_id.");
    }

    console.log('Processing checkout success for user ID:', userId);
    const supabase = await createSupabaseServer();
    
    // 不需要验证用户，直接查找团队
    // 因为 userId 来自我们自己的 session，应该是可信的
    console.log('Looking up team for user...');
    
    // 通过用户ID查找团队（获取第一个团队）
    const { data: teamData, error: teamError } = await supabase
      .from('team_members')
      .select(`
        team_id,
        teams (
          id,
          name,
          plan_name,
          stripe_customer_id
        )
      `)
      .eq('user_id', userId)
      .order('joined_at', { ascending: true })
      .limit(1);

    if (teamError || !teamData || teamData.length === 0 || !teamData[0].teams) {
      console.error('Team lookup failed:', teamError);
      throw new Error('User is not associated with any team.');
    }
    
    const team = teamData[0].teams;
    console.log('✅ Found team for user:', team.id);

    // 更新团队订阅信息
    const { error } = await supabase
      .from('teams')
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_product_id: productId,
        plan_name: planKey,  // 使用统一的计划键而不是产品名称
        subscription_status: subscription.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', team.id);

    if (error) {
      throw new Error(`Failed to update team subscription: ${error.message}`);
    }

    // 分配信用点给团队
    const CreditManager = await import('@/lib/credits/credit-manager');
    const creditSuccess = await CreditManager.CreditManager.allocateSubscriptionCredits({
      teamId: team.id,
      planName: planKey,
    });

    if (!creditSuccess) {
      console.error(`Failed to allocate credits for team ${team.id} with plan ${planKey}`);
    } else {
      console.log(`✅ Successfully allocated credits for team ${team.id} with plan ${planKey}`);
    }

    console.log('✅ Checkout processing completed successfully');
    
    // 添加成功标识，前端可以根据此标识刷新缓存
    const redirectUrl = new URL('http://localhost:3005/dashboard');
    redirectUrl.searchParams.set('payment_success', 'true');
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error handling successful checkout:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.redirect(new URL('http://localhost:3005/error'));
  }
}
