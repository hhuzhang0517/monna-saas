import Stripe from 'stripe';
import { handleSubscriptionChange, handleOneTimePayment, stripe } from '@/lib/payments/stripe';
import { NextRequest, NextResponse } from 'next/server';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`\n========== WEBHOOK REQUEST START (${timestamp}) ==========`);
  console.log('🎯 Webhook POST request received');
  
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') as string;

  console.log('📝 Payload length:', payload.length, 'bytes');
  console.log('📝 Webhook Secret configured:', webhookSecret ? 'YES (first 10 chars: ' + webhookSecret.substring(0, 10) + '...)' : 'NO');
  console.log('📝 Signature present:', signature ? 'YES' : 'NO');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    console.log('✅ Webhook signature verified successfully');
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    console.error('Error type:', err.type);
    console.error('Error code:', err.code);
    return NextResponse.json(
      { error: 'Webhook signature verification failed.' },
      { status: 400 }
    );
  }

  console.log(`🔔 Webhook received: ${event.type}`);
  console.log(`📋 Event ID: ${event.id}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('📦 Processing checkout.session.completed:', session.id);
        console.log('💰 Session mode:', session.mode);
        console.log('💳 Payment status:', session.payment_status);
        console.log('👤 Client reference ID:', session.client_reference_id);
        
        // 区分订阅和一次性支付
        if (session.mode === 'payment') {
          // 一次性支付（流量包）
          console.log('🛒 Detected one-time payment (Credits Pack)');
          try {
            await handleOneTimePayment(session);
            console.log('✅ handleOneTimePayment completed successfully');
          } catch (error: any) {
            console.error('❌ Error in handleOneTimePayment:', error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            // 不要抛出错误，继续返回 200 给 Stripe
          }
        } else if (session.mode === 'subscription') {
          // 订阅会由 customer.subscription.* 事件处理
          console.log('📊 Detected subscription payment, will be handled by subscription events');
        }
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        console.log('📊 Processing subscription event:', event.type);
        try {
          await handleSubscriptionChange(subscription);
          console.log('✅ handleSubscriptionChange completed successfully');
        } catch (error: any) {
          console.error('❌ Error in handleSubscriptionChange:', error);
          console.error('Error message:', error.message);
        }
        break;
      default:
        console.log(`⚠️ Unhandled event type ${event.type}`);
    }
  } catch (error: any) {
    console.error('❌ Critical error processing webhook:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }

  console.log('✅ Webhook processing completed, returning success');
  console.log(`========== WEBHOOK REQUEST END (${timestamp}) ==========\n`);
  return NextResponse.json({ received: true });
}
