'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession, createCustomerPortalSession } from './stripe';
import { getUser, getTeamForUser, createUserTeam } from '@/lib/db/queries';

export async function checkoutAction(formData: FormData) {
  console.log('[checkoutAction] ===== Starting checkout process =====');
  const user = await getUser();
  console.log('[checkoutAction] User retrieved:', user?.id, user?.email);

  if (!user) {
    const priceId = formData.get('priceId') as string;
    console.log('[checkoutAction] No user found, redirecting to homepage with priceId:', priceId);
    redirect(`/?redirect=/pricing&priceId=${priceId}`);
  }

  const priceId = formData.get('priceId') as string;
  const paymentType = (formData.get('paymentType') as string) || 'subscription';
  console.log('[checkoutAction] Processing checkout for priceId:', priceId, 'paymentType:', paymentType);

  // 获取或创建团队
  console.log('[checkoutAction] Attempting to fetch team for user...');
  let team = await getTeamForUser();
  console.log('[checkoutAction] Team query result:', team ? {
    id: team.id,
    name: team.name,
    stripe_customer_id: team.stripe_customer_id || team.stripeCustomerId,
    plan_name: team.plan_name || team.planName
  } : null);

  if (!team) {
    console.log('[checkoutAction] No team found, creating new team for user...');
    team = await createUserTeam(user);
    console.log('[checkoutAction] Team created:', team ? {
      id: team.id,
      name: team.name
    } : 'FAILED');
  }

  if (!team) {
    console.error('[checkoutAction] Failed to get or create team for user');
    throw new Error('无法创建团队，请稍后重试');
  }

  console.log('[checkoutAction] Calling createCheckoutSession...');
  await createCheckoutSession({
    team,
    priceId,
    paymentType: paymentType as 'subscription' | 'onetime'
  });
  console.log('[checkoutAction] ===== Checkout process completed =====');
}

export async function customerPortalAction(_: FormData) {
  const user = await getUser();

  if (!user) {
    redirect('/');
  }

  const team = await getTeamForUser();
  if (!team) {
    redirect('/pricing');
  }

  const portalSession = await createCustomerPortalSession(team);
  redirect(portalSession.url);
}

// 购买流量包的 action
export async function purchaseCreditsPackAction(formData: FormData) {
  console.log('[purchaseCreditsPackAction] ===== Starting credits pack purchase =====');
  const user = await getUser();
  console.log('[purchaseCreditsPackAction] User retrieved:', user?.id, user?.email);

  if (!user) {
    const priceId = formData.get('priceId') as string;
    console.log('[purchaseCreditsPackAction] No user found, redirecting to homepage');
    redirect(`/?redirect=/pricing&priceId=${priceId}`);
  }

  const priceId = formData.get('priceId') as string;
  console.log('[purchaseCreditsPackAction] Processing purchase for priceId:', priceId);

  // 获取或创建团队
  let team = await getTeamForUser();
  console.log('[purchaseCreditsPackAction] Team query result:', team?.id);

  if (!team) {
    console.log('[purchaseCreditsPackAction] No team found, creating new team for user...');
    team = await createUserTeam(user);
  }

  if (!team) {
    console.error('[purchaseCreditsPackAction] Failed to get or create team for user');
    throw new Error('无法创建团队，请稍后重试');
  }

  // 流量包始终使用一次性支付
  console.log('[purchaseCreditsPackAction] Calling createCheckoutSession for one-time payment...');
  await createCheckoutSession({
    team,
    priceId,
    paymentType: 'onetime'
  });
  console.log('[purchaseCreditsPackAction] ===== Credits pack purchase completed =====');
}
