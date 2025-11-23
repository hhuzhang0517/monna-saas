import { NextResponse } from 'next/server';
import { getUser, getTeamForUser, createUserTeam } from '@/lib/db/queries';
import { stripe } from '@/lib/payments/stripe';

export async function GET() {
  try {
    console.log('[test-checkout] Starting test...');

    // 1. 获取用户
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated', step: 'getUser' }, { status: 401 });
    }
    console.log('[test-checkout] User:', user.id, user.email);

    // 2. 获取团队
    let team = await getTeamForUser();
    console.log('[test-checkout] Team:', team ? { id: team.id, name: team.name } : null);

    if (!team) {
      console.log('[test-checkout] Creating team...');
      team = await createUserTeam(user);
      console.log('[test-checkout] Team created:', team?.id);
    }

    if (!team) {
      return NextResponse.json({ error: 'Failed to get or create team', step: 'getTeam' }, { status: 500 });
    }

    // 3. 测试 Stripe session 创建
    const testPriceId = 'price_1SFUSUA8Ld2Pk5ecXjTPcv4R'; // 基础档

    // 构建 base URL - 优先使用 NEXT_PUBLIC_SITE_URL,然后是 VERCEL_URL
    let baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!baseUrl) {
      const vercelUrl = process.env.VERCEL_URL;
      if (vercelUrl) {
        baseUrl = `https://${vercelUrl}`;
      } else {
        baseUrl = 'http://localhost:3005';
      }
    }
    baseUrl = baseUrl.replace(/\/$/, '');

    const stripeCustomerId = team.stripe_customer_id || team.stripeCustomerId || undefined;

    console.log('[test-checkout] Creating Stripe session with:', {
      priceId: testPriceId,
      baseUrl,
      successUrl: `${baseUrl}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/pricing`,
      stripeCustomerId,
      userId: user.id
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: testPriceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      customer: stripeCustomerId,
      client_reference_id: user.id,
      allow_promotion_codes: true
    });

    console.log('[test-checkout] Stripe session created:', session.id, session.url);

    return NextResponse.json({
      success: true,
      userId: user.id,
      teamId: team.id,
      stripeSessionId: session.id,
      stripeCheckoutUrl: session.url,
      baseUrlUsed: baseUrl,
      message: 'Checkout session created successfully! You can redirect to the stripeCheckoutUrl'
    });
  } catch (error) {
    console.error('[test-checkout] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
