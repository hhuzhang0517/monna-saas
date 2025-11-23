import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import {
  Team,
  getTeamByStripeCustomerId,
  getUser,
  updateTeamSubscription
} from '@/lib/db/queries';
import CreditManager from '@/lib/credits/credit-manager';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover'
});

export async function createCheckoutSession({
  team,
  priceId,
  paymentType = 'subscription'
}: {
  team: any;
  priceId: string;
  paymentType?: 'subscription' | 'onetime';
}) {
  console.log('[createCheckoutSession] Starting with team:', team?.id, 'priceId:', priceId, 'paymentType:', paymentType);
  const user = await getUser();
  console.log('[createCheckoutSession] User:', user?.id);

  if (!team || !user) {
    console.log('[createCheckoutSession] Missing team or user, redirecting to sign-up');
    redirect(`/sign-up?redirect=checkout&priceId=${priceId}`);
  }

  // 构建 base URL
  let baseUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!baseUrl) {
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) {
      baseUrl = `https://${vercelUrl}`;
    } else {
      baseUrl = 'http://localhost:3005';
    }
  }

  baseUrl = baseUrl.trim().replace(/[\r\n]/g, '').replace(/\/$/, '');
  console.log('[createCheckoutSession] Using base URL:', baseUrl);

  const stripeCustomerId = team.stripe_customer_id || team.stripeCustomerId || undefined;
  const stripeSubscriptionId = team.stripe_subscription_id || team.stripeSubscriptionId;
  console.log('[createCheckoutSession] Stripe customer ID:', stripeCustomerId);
  console.log('[createCheckoutSession] Existing subscription ID:', stripeSubscriptionId);

  // 如果用户已有活跃订阅，并且是订阅支付，先取消它
  if (stripeCustomerId && stripeSubscriptionId && paymentType === 'subscription') {
    try {
      console.log('[createCheckoutSession] Canceling existing subscription:', stripeSubscriptionId);
      // 先检查订阅是否存在
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      if (subscription && subscription.status !== 'canceled') {
        await stripe.subscriptions.cancel(stripeSubscriptionId);
        console.log('[createCheckoutSession] Existing subscription canceled successfully');
      }
    } catch (error: any) {
      if (error.code === 'resource_missing') {
        console.log('[createCheckoutSession] Subscription already canceled or does not exist');
      } else {
        console.error('[createCheckoutSession] Failed to cancel existing subscription:', error);
      }
    }
  }

  console.log('[createCheckoutSession] Creating Stripe checkout session...');

  // 检查价格信息
  const price = await stripe.prices.retrieve(priceId, {
    expand: ['product']
  });
  const currency = price.currency;
  const product = price.product as Stripe.Product;
  console.log('[createCheckoutSession] Price currency:', currency);
  console.log('[createCheckoutSession] Product:', product.name);

  // 根据支付类型配置不同的 session
  let paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[];
  let sessionMode: 'subscription' | 'payment';
  let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

  if (paymentType === 'subscription') {
    // 订阅模式：只使用信用卡
    paymentMethodTypes = ['card'];
    sessionMode = 'subscription';
    lineItems = [
      {
        price: priceId,
        quantity: 1
      }
    ];
    console.log('[createCheckoutSession] Creating subscription with card payment');
  } else {
    // 一次性支付模式：支持银行卡、支付宝和微信支付
    paymentMethodTypes = ['card', 'alipay', 'wechat_pay'];
    sessionMode = 'payment';

    // 从订阅价格中提取金额，创建一次性支付
    const unitAmount = price.unit_amount || 0;

    lineItems = [
      {
        price_data: {
          currency: currency,
          product: product.id,
          unit_amount: unitAmount,
        },
        quantity: 1
      }
    ];

    console.log('[createCheckoutSession] Creating one-time payment with multiple payment methods, amount:', unitAmount, currency);
  }

  console.log('[createCheckoutSession] Payment method types:', paymentMethodTypes);
  console.log('[createCheckoutSession] Session mode:', sessionMode);

  // 构建 session 配置
  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: paymentMethodTypes,
    line_items: lineItems,
    mode: sessionMode,
    success_url: `${baseUrl}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}&payment_type=${paymentType}`,
    cancel_url: `${baseUrl}/pricing`,
    customer: stripeCustomerId,
    client_reference_id: user.id,
    customer_email: !stripeCustomerId ? user.email : undefined,
    allow_promotion_codes: true
  };

  // 如果包含微信支付，添加必需的配置
  if (paymentMethodTypes.includes('wechat_pay')) {
    sessionConfig.payment_method_options = {
      wechat_pay: {
        client: 'web'
      }
    };
  }

  const session = await stripe.checkout.sessions.create(sessionConfig);

  console.log('[createCheckoutSession] ✅ Stripe session created successfully:', session.id);
  console.log('[createCheckoutSession] Redirecting to:', session.url);
  redirect(session.url!);
}

export async function createCustomerPortalSession(team: Team) {
  if (!team.stripe_customer_id || !team.stripe_product_id) {
    redirect('/pricing');
  }

  let configuration: Stripe.BillingPortal.Configuration;
  const configurations = await stripe.billingPortal.configurations.list();

  if (configurations.data.length > 0) {
    configuration = configurations.data[0];
  } else {
    const product = await stripe.products.retrieve(team.stripe_product_id);
    if (!product.active) {
      throw new Error("Team's product is not active in Stripe");
    }

    const prices = await stripe.prices.list({
      product: product.id,
      active: true
    });
    if (prices.data.length === 0) {
      throw new Error("No active prices found for the team's product");
    }

    configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your subscription'
      },
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price', 'quantity', 'promotion_code'],
          proration_behavior: 'create_prorations',
          products: [
            {
              product: product.id,
              prices: prices.data.map((price) => price.id)
            }
          ]
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'other'
            ]
          }
        },
        payment_method_update: {
          enabled: true
        }
      }
    });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005';

  return stripe.billingPortal.sessions.create({
    customer: team.stripe_customer_id,
    return_url: `${baseUrl}/dashboard/activity`,
    configuration: configuration.id
  });
}

export async function handleSubscriptionChange(
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;

  // ⚠️ 使用 Service Role 客户端绕过 RLS 策略
  // Webhook 环境中没有用户会话，必须使用 Service Role
  const { createSupabaseServiceRole } = await import('@/lib/supabase/server');
  const supabase = createSupabaseServiceRole();
  console.log('🔑 [handleSubscriptionChange] Using Service Role client to bypass RLS');

  // 直接使用 Service Role 查询 team
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .single();

  if (teamError || !team) {
    console.error('Team not found for Stripe customer:', customerId, 'Error:', teamError);
    return;
  }

  if (status === 'active' || status === 'trialing') {
    const plan = subscription.items.data[0]?.plan;
    const product = await stripe.products.retrieve(plan?.product as string);
    
    // 从产品元数据中获取计划信息
    const planKey = product.metadata?.plan_key || 'free';
    
    // 直接使用 Service Role 更新订阅
    const { error: updateError } = await supabase
      .from('teams')
      .update({
        stripe_subscription_id: subscriptionId,
        stripe_product_id: plan?.product as string,
        plan_name: planKey,
        subscription_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', team.id);

    if (updateError) {
      console.error(`Failed to update team ${team.id} subscription:`, updateError);
      return;
    }

    // 如果是新激活的订阅，分配信用点
    if (status === 'active') {
      const success = await CreditManager.allocateSubscriptionCredits({
        teamId: team.id,
        planName: planKey,
        supabaseClient: supabase // 传递 Service Role 客户端
      });

      if (!success) {
        console.error(`Failed to allocate credits for team ${team.id} with plan ${planKey}`);
      } else {
        console.log(`Successfully allocated credits for team ${team.id} with plan ${planKey}`);
      }
    }
  } else if (status === 'canceled' || status === 'unpaid') {
    // 订阅取消时,将计划降级为免费档
    const { error: updateError } = await supabase
      .from('teams')
      .update({
        stripe_subscription_id: null,
        stripe_product_id: null,
        plan_name: 'free',
        subscription_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', team.id);

    if (updateError) {
      console.error(`Failed to downgrade team ${team.id} to free plan:`, updateError);
      return;
    }

    console.log(`Subscription canceled for team ${team.id}, downgraded to free plan`);
  }
}

/**
 * 处理一次性支付（流量包购买）
 */
export async function handleOneTimePayment(
  session: Stripe.Checkout.Session
) {
  try {
    console.log('🛒 [handleOneTimePayment] Starting one-time payment processing...');
    console.log('📋 [handleOneTimePayment] Session ID:', session.id);
    console.log('💳 [handleOneTimePayment] Payment status:', session.payment_status);
    console.log('👤 [handleOneTimePayment] Client reference ID:', session.client_reference_id);
    console.log('🔢 [handleOneTimePayment] Session mode:', session.mode);
    
    // 检查支付是否成功
    if (session.payment_status !== 'paid') {
      console.log('⚠️ [handleOneTimePayment] Payment not completed, skipping credit allocation. Status:', session.payment_status);
      return;
    }

    // 获取用户 ID
    const userId = session.client_reference_id;
    if (!userId) {
      console.error('❌ [handleOneTimePayment] CRITICAL: No user ID found in session.client_reference_id');
      console.error('Session details:', JSON.stringify({
        id: session.id,
        customer: session.customer,
        customer_email: session.customer_email,
        payment_status: session.payment_status
      }));
      throw new Error('No user ID found in session');
    }
    console.log('✅ [handleOneTimePayment] User ID found:', userId);

    // 获取购买的商品详情（需要展开 line_items）
    console.log('📦 [handleOneTimePayment] Retrieving session with line items...');
    const sessionWithLineItems = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items', 'line_items.data.price.product']
    });

    const lineItems = sessionWithLineItems.line_items?.data;
    if (!lineItems || lineItems.length === 0) {
      console.error('❌ [handleOneTimePayment] CRITICAL: No line items found in session');
      throw new Error('No line items found');
    }

    console.log(`✅ [handleOneTimePayment] Found ${lineItems.length} line items`);

    // 获取用户的 team
    console.log('👥 [handleOneTimePayment] Fetching team for user:', userId);
    
    // ⚠️ 使用 Service Role 客户端绕过 RLS 策略
    // Webhook 环境中没有用户会话，必须使用 Service Role
    const { createSupabaseServiceRole } = await import('@/lib/supabase/server');
    const supabase = createSupabaseServiceRole();
    console.log('🔑 [handleOneTimePayment] Using Service Role client to bypass RLS');
    
    // 先直接查询 teams 表，不通过 team_members 关联
    console.log('🔍 [handleOneTimePayment] Attempting direct query approach...');
    
    // 方案1：直接查 team_members 表
    const { data: memberData, error: memberError } = await supabase
      .from('team_members')
      .select('team_id, joined_at')
      .eq('user_id', userId)
      .order('joined_at', { ascending: true })
      .limit(1);
    
    console.log('📊 [handleOneTimePayment] Member query result:', {
      data: memberData,
      error: memberError,
      count: memberData?.length
    });

    if (memberError) {
      console.error('❌ [handleOneTimePayment] Database error fetching team_members:', memberError);
      throw new Error(`Failed to get team members: ${memberError.message}`);
    }

    if (!memberData || memberData.length === 0) {
      console.error('❌ [handleOneTimePayment] CRITICAL: No team_members found for user:', userId);
      console.error('User ID type:', typeof userId);
      console.error('User ID value:', JSON.stringify(userId));
      
      // 尝试查询 profiles 表确认用户存在
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, name')
        .eq('id', userId)
        .single();
      
      console.log('👤 [handleOneTimePayment] Profile check:', { profileData, profileError });
      
      throw new Error(`No team found for user ${userId}`);
    }

    const teamId = memberData[0].team_id;
    console.log('✅ [handleOneTimePayment] Found team_id:', teamId);
    
    // 方案2：查询 teams 表
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, stripe_customer_id')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      console.error('❌ [handleOneTimePayment] Failed to get team details:', teamError);
      throw new Error(`Failed to get team ${teamId}: ${teamError?.message}`);
    }

    console.log('✅ [handleOneTimePayment] Team details:', {
      id: team.id,
      name: team.name,
      stripe_customer_id: team.stripe_customer_id
    });

    // 更新 team 的 stripe_customer_id（如果还没有）
    const customerId = typeof session.customer === 'string' 
      ? session.customer 
      : session.customer?.id;

    if (customerId && !team.stripe_customer_id) {
      console.log('🔄 [handleOneTimePayment] Updating team stripe_customer_id:', customerId);
      const { error: updateError } = await supabase
        .from('teams')
        .update({ stripe_customer_id: customerId })
        .eq('id', team.id);
      
      if (updateError) {
        console.error('⚠️ [handleOneTimePayment] Failed to update stripe_customer_id:', updateError);
      } else {
        console.log('✅ [handleOneTimePayment] Team stripe_customer_id updated');
      }
    }

    // 处理每个购买的商品
    let totalCreditsAdded = 0;
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      console.log(`\n📦 [handleOneTimePayment] Processing line item ${i + 1}/${lineItems.length}`);
      
      const price = item.price;
      const product = price?.product as Stripe.Product;
      const quantity = item.quantity || 1;

      if (!product) {
        console.warn('⚠️ [handleOneTimePayment] No product found for line item');
        continue;
      }

      console.log('🏷️ [handleOneTimePayment] Product name:', product.name);
      console.log('🏷️ [handleOneTimePayment] Product ID:', product.id);
      
      if (!product.metadata) {
        console.error('❌ [handleOneTimePayment] CRITICAL: Product has no metadata!');
        console.error('Product details:', JSON.stringify(product, null, 2));
        continue;
      }

      console.log('📝 [handleOneTimePayment] Product metadata:', JSON.stringify(product.metadata));

      // 检查是否是订阅产品（支付宝支付订阅时也是 payment mode）
      const planKey = product.metadata.plan_key;
      const isSubscriptionProduct = !!planKey;
      
      if (isSubscriptionProduct) {
        console.log('📊 [handleOneTimePayment] Detected subscription product with plan:', planKey);
        console.log('💡 [handleOneTimePayment] This is a subscription paid via Alipay (one-time payment mode)');
        
        // 更新团队的订阅状态
        console.log('🔄 [handleOneTimePayment] Updating team subscription status...');
        const { error: updateError } = await supabase
          .from('teams')
          .update({
            stripe_product_id: product.id,
            plan_name: planKey,
            subscription_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', team.id);

        if (updateError) {
          console.error('❌ [handleOneTimePayment] Failed to update team subscription:', updateError);
        } else {
          console.log('✅ [handleOneTimePayment] Team subscription updated to plan:', planKey);
        }
      }

      // 从产品元数据中获取 credits 数量
      const creditsPerUnit = parseInt(product.metadata.credits || '0', 10);
      if (creditsPerUnit <= 0) {
        console.error('❌ [handleOneTimePayment] CRITICAL: Invalid credits amount in product metadata!');
        console.error('metadata.credits value:', product.metadata.credits);
        console.error('Parsed value:', creditsPerUnit);
        console.error('Full metadata:', product.metadata);
        continue;
      }

      const totalCredits = creditsPerUnit * quantity;
      console.log(`💰 [handleOneTimePayment] Calculating credits: ${creditsPerUnit} × ${quantity} = ${totalCredits}`);

      // 使用 CreditManager 充值信用点
      console.log('🔄 [handleOneTimePayment] Calling CreditManager.chargeCredits...');
      const success = await CreditManager.chargeCredits({
        teamId: team.id,
        userId: userId,
        amount: totalCredits,
        reason: `购买流量包: ${product.name}`,
        planName: 'credits_pack',
        supabaseClient: supabase // 传递 Service Role 客户端
      });

      if (success) {
        totalCreditsAdded += totalCredits;
        console.log(`✅ [handleOneTimePayment] Successfully added ${totalCredits} credits to team ${team.id}`);
      } else {
        console.error(`❌ [handleOneTimePayment] CRITICAL: Failed to add credits to team ${team.id}`);
        throw new Error(`Failed to charge credits for product: ${product.name}`);
      }
    }

    console.log(`\n🎉 [handleOneTimePayment] One-time payment processing completed successfully!`);
    console.log(`💰 [handleOneTimePayment] Total credits added: ${totalCreditsAdded}`);
    console.log(`👥 [handleOneTimePayment] Team ID: ${team.id}`);
    console.log(`👤 [handleOneTimePayment] User ID: ${userId}`);
    
  } catch (error: any) {
    console.error('\n❌❌❌ [handleOneTimePayment] CRITICAL ERROR ❌❌❌');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Session ID:', session.id);
    throw error; // 重新抛出错误，让调用者知道失败了
  }
}

export async function getStripePrices() {
  const prices = await stripe.prices.list({
    expand: ['data.product'],
    active: true,
    type: 'recurring'
  });

  return prices.data.map((price) => ({
    id: price.id,
    productId:
      typeof price.product === 'string' ? price.product : price.product.id,
    unitAmount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval,
    trialPeriodDays: price.recurring?.trial_period_days
  }));
}

export async function getStripeProducts() {
  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price']
  });

  return products.data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    defaultPriceId:
      typeof product.default_price === 'string'
        ? product.default_price
        : product.default_price?.id
  }));
}

