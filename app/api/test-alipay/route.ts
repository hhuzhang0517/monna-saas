import { NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';

/**
 * 测试支付宝支付方式是否可用
 * 访问: /api/test-alipay
 */
export async function GET() {
  try {
    console.log('[test-alipay] Testing Alipay payment method availability...');

    // 测试1: 列出所有可用的支付方式
    const paymentMethods = await stripe.paymentMethods.list({
      type: 'alipay',
      limit: 1
    });

    console.log('[test-alipay] Payment methods query result:', paymentMethods);

    // 测试2: 尝试创建一个测试 checkout session
    const testSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'alipay'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Test Product',
            },
            unit_amount: 1000,
            recurring: {
              interval: 'month'
            }
          },
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
    });

    console.log('[test-alipay] ✅ Test session created successfully!');
    console.log('[test-alipay] Session ID:', testSession.id);
    console.log('[test-alipay] Payment method types:', testSession.payment_method_types);

    return NextResponse.json({
      success: true,
      message: 'Alipay is supported!',
      sessionId: testSession.id,
      paymentMethodTypes: testSession.payment_method_types,
      sessionUrl: testSession.url
    });

  } catch (error: any) {
    console.error('[test-alipay] ❌ Error:', error);

    return NextResponse.json({
      success: false,
      error: error.message,
      errorType: error.type,
      errorCode: error.code,
      details: error.raw?.message || error.message
    }, { status: 400 });
  }
}
