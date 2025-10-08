'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession, createCustomerPortalSession } from './stripe';
import { withTeam } from '@/lib/auth/middleware';

export const checkoutAction = withTeam(async (formData, team) => {
  const priceId = formData.get('priceId') as string;
  
  // 临时处理：如果没有配置数据库，显示提示信息
  if (!process.env.POSTGRES_URL || process.env.POSTGRES_URL.includes('placeholder')) {
    throw new Error('支付功能需要配置数据库。请联系管理员完成数据库配置。');
  }
  
  await createCheckoutSession({ team: team, priceId });
});

export const customerPortalAction = withTeam(async (_, team) => {
  const portalSession = await createCustomerPortalSession(team);
  redirect(portalSession.url);
});
