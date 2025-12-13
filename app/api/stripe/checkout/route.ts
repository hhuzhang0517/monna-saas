import { createSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';
import Stripe from 'stripe';

export async function GET(request: NextRequest) {
  console.log('🔄 Processing Stripe checkout callback...');
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('session_id');
  console.log('Session ID:', sessionId);

  const getBaseUrl = () => {
    let baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!baseUrl) {
      const vercelUrl = process.env.VERCEL_URL;
      if (vercelUrl) {
        baseUrl = `https://${vercelUrl}`;
      } else {
        baseUrl = 'http://localhost:3005';
      }
    }
    return baseUrl.trim().replace(/[\r\n]/g, '').replace(/\/$/, '');
  };

  const baseUrl = getBaseUrl();

  if (!sessionId) {
    console.log('❌ No session ID found, redirecting to pricing');
    return NextResponse.redirect(new URL(`${baseUrl}/pricing`));
  }

  try {
    console.log('📥 Retrieving Stripe session...');
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription'],
    });
    console.log('✅ Session retrieved successfully');
    console.log('Session mode:', session.mode);
    console.log('Payment status:', session.payment_status);

    // 如果是一次性支付（流量包），直接重定向到成功页面
    if (session.mode === 'payment') {
      console.log('✅ One-time payment detected, redirecting to success page');
      console.log('Note: Credits will be added via webhook (checkout.session.completed)');
      return NextResponse.redirect(new URL(`${baseUrl}/pricing?success=credits_purchased`));
    }

    // 以下是订阅模式的处理
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

    const planNameMapping: { [key: string]: string } = {
      '基础档': 'basic',
      '专业档': 'professional',
      '企业档': 'enterprise'
    };

    const planKey = product.metadata?.plan_key || planNameMapping[product.name] || 'free';

    const userId = session.client_reference_id;
    if (!userId) {
      throw new Error("No user ID found in session's client_reference_id.");
    }

    console.log('Processing checkout success for user ID:', userId);
    const supabase = await createSupabaseServer();

    console.log('Looking up team for user...');

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

    const teamArray = teamData[0].teams as any;
    const team = Array.isArray(teamArray) ? teamArray[0] : teamArray;

    if (!team || !team.id) {
      throw new Error('Invalid team data structure.');
    }

    console.log('✅ Found team for user:', team.id);

    const { error } = await supabase
      .from('teams')
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_product_id: productId,
        plan_name: planKey,
        subscription_status: subscription.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', team.id);

    if (error) {
      throw new Error(`Failed to update team subscription: ${error.message}`);
    }

    console.log('✅ Team subscription updated successfully');
    console.log('✅ Checkout complete, redirecting to generate page');

    return NextResponse.redirect(new URL(`${baseUrl}/generate?success=true`));
  } catch (error) {
    console.error('❌ Error processing checkout:', error);
    return NextResponse.redirect(
      new URL(`${baseUrl}/pricing?error=checkout_failed`)
    );
  }
}
