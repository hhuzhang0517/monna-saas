'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { CreditCard, TrendingUp, Calendar, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import useSWR from 'swr';
import { customerPortalAction } from '@/lib/payments/actions';
import { useTranslation, useLanguage } from '@/lib/contexts/language-context';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// 获取生成类型显示名称和图标
function getGenerationType(jobInfo: any, t: any) {
  if (!jobInfo) return { name: '-', icon: '💳', unit: '-' };
  
  if (jobInfo.type === 'image') {
    return { name: t('imageGenType'), icon: '🖼️', unit: t('imageCount', { count: 1 }) };
  } else if (jobInfo.type === 'video') {
    const duration = jobInfo.video_duration || 5; // 默认5秒
    return { name: t('shortVideoGenType'), icon: '🎬', unit: t('videoSeconds', { seconds: duration }) };
  } else if (jobInfo.type === 'longvideo') {
    const duration = jobInfo.video_duration || 30; // 默认30秒
    return { name: t('longVideoGenType'), icon: '🎞️', unit: t('videoSeconds', { seconds: duration }) };
  }
  
  return { name: t('unknownType'), icon: '❓', unit: '-' };
}

// 格式化日期时间
function formatDateTime(dateString: string, locale: string) {
  const date = new Date(dateString);
  const localeCode = locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en-US';
  return {
    date: date.toLocaleDateString(localeCode, { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }),
    time: date.toLocaleTimeString(localeCode, { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  };
}

// 信用点交易记录组件（增强版表格）
function CreditHistory() {
  const { data: creditHistoryResponse } = useSWR('/api/credits/history', fetcher);
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  if (!creditHistoryResponse) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('creditHistory')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 从API响应中获取transactions数组
  const creditHistory = creditHistoryResponse?.transactions || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('creditHistory')}</CardTitle>
        <p className="text-sm text-gray-500">{t('generationHistory')}</p>
      </CardHeader>
      <CardContent>
        {creditHistory.length === 0 ? (
          <p className="text-gray-500 text-center py-8">{t('noGenerationHistory')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-sm text-gray-500">
                  <th className="text-left py-3 px-2">{t('type')}</th>
                  <th className="text-left py-3 px-2">{t('specification')}</th>
                  <th className="text-right py-3 px-2">{t('consumption')}</th>
                  <th className="text-left py-3 px-2">{t('dateTime')}</th>
                  <th className="text-right py-3 px-2">{t('balance')}</th>
                </tr>
              </thead>
              <tbody>
                {creditHistory.map((transaction: any) => {
                  const genType = getGenerationType(transaction.job_info, t);
                  const dateTime = formatDateTime(transaction.created_at, currentLanguage);
                  const isConsume = transaction.type === 'consume';
                  const isCharge = transaction.type === 'charge';
                  const isRefund = transaction.type === 'refund';
                  
                  return (
                    <tr key={transaction.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 px-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{genType.icon}</span>
                          <div>
                            <p className="font-medium text-sm">
                              {isCharge ? `📈 ${t('subscriptionRenewal')}` : 
                               isRefund ? `↩️ ${t('refund')}` : 
                               genType.name}
                            </p>
                            {transaction.job_info?.provider && (
                              <p className="text-xs text-gray-500 capitalize">
                                {transaction.job_info.provider}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-4 px-2">
                        <span className="text-sm font-medium">
                          {isCharge ? 
                            (transaction.reason.includes('基础档') || transaction.reason.includes('Basic') ? '+2000' : 
                             transaction.reason.includes('高级档') || transaction.reason.includes('Professional') ? '+5000' : 
                             transaction.reason.includes('专业档') || transaction.reason.includes('Enterprise') ? '+10000' : '+') :
                           isRefund ? '-' :
                           genType.unit}
                        </span>
                      </td>
                      
                      <td className="py-4 px-2 text-right">
                        <span className={`font-semibold ${
                          isCharge || isRefund ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {isCharge || isRefund ? '+' : '-'}
                          {Math.abs(transaction.amount)}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">{t('creditsUnit')}</span>
                      </td>
                      
                      <td className="py-4 px-2">
                        <div className="text-sm">
                          <div className="font-medium">{dateTime.date}</div>
                          <div className="text-gray-500 text-xs">{dateTime.time}</div>
                        </div>
                      </td>
                      
                      <td className="py-4 px-2 text-right">
                        <span className="text-sm font-medium">
                          {transaction.balance_after}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">{t('creditsUnit')}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 订阅计划组件
function SubscriptionCard() {
  const { data: teamData } = useSWR('/api/team', fetcher);
  const { t } = useTranslation();

  if (!teamData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('subscriptionPlan')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPlanName = (planName: string) => {
    const planMap: Record<string, string> = {
      'free': t('freePlan'),
      'basic': t('basicPlan'),
      'professional': t('professionalPlan'),
      'enterprise': t('enterprisePlan')
    };
    return planMap[planName] || planName || t('freePlan');
  };

  const currentPlan = getPlanName(teamData?.planName);

  // 判断是否有活跃订阅
  const hasActiveSubscription = teamData?.subscriptionStatus === 'active' ||
                                 teamData?.subscriptionStatus === 'trialing';
  const isFreeUser = teamData?.planName === 'free';

  const getStatusText = (status: string) => {
    if (status === 'active') return t('activeStatus');
    if (status === 'trialing') return t('trialingStatus');
    return t('inactiveStatus');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>{t('subscriptionPlan')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">{t('currentPlan')}</p>
            <div className="flex items-center justify-between">
              <p className="text-xl font-semibold">{currentPlan}</p>
              <Badge variant={hasActiveSubscription ? 'default' : 'secondary'}>
                {getStatusText(teamData?.subscriptionStatus)}
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500">{t('remainingCredits')}</p>
            <p className="text-2xl font-bold text-orange-500">{teamData?.credits || 0}</p>
          </div>

          <div className="space-y-2">
            <Link href="/pricing">
              <Button className="w-full bg-orange-500 hover:bg-orange-600">
                {t('upgradeSubscription')}
              </Button>
            </Link>

            {hasActiveSubscription && !isFreeUser && (
              <form action={customerPortalAction}>
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {t('cancelSubscription')}
                </Button>
              </form>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 使用统计组件
function UsageStatsCard() {
  const { data: statsData, error } = useSWR('/api/user/stats', fetcher, {
    refreshInterval: 30000, // 每30秒自动刷新
    revalidateOnFocus: true, // 页面获得焦点时重新验证
  });
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  if (!statsData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>{t('usageStats')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-12"></div>
            </div>
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-28"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const localeCode = currentLanguage === 'zh' ? 'zh-CN' : currentLanguage === 'ja' ? 'ja-JP' : 'en-US';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>{t('usageStats')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">{t('monthGenerationCount')}</span>
            <span className="font-semibold">{statsData.monthGenerationCount || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">{t('monthCreditsConsumed')}</span>
            <span className="font-semibold">{statsData.monthCreditsConsumed || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">{t('nextRenewalDate')}</span>
            <span className="font-semibold">
              {statsData.nextRenewalDate
                ? new Date(statsData.nextRenewalDate).toLocaleDateString(localeCode)
                : '-'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ActivityPage() {
  const { t } = useTranslation();

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-lg lg:text-2xl font-medium text-gray-900">
          {t('subscriptionBilling')}
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 订阅计划信息 */}
        <Suspense fallback={
          <Card>
            <CardHeader>
              <CardTitle>{t('subscriptionPlan')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse space-y-3">
                <div className="h-6 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        }>
          <SubscriptionCard />
        </Suspense>

        {/* 使用统计 */}
        <Suspense fallback={
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>{t('usageStats')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse space-y-4">
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                </div>
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-28"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        }>
          <UsageStatsCard />
        </Suspense>
      </div>

      {/* 信用点历史记录 */}
      <div className="mt-6">
        <Suspense fallback={
          <Card>
            <CardHeader>
              <CardTitle>{t('creditHistory')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        }>
          <CreditHistory />
        </Suspense>
      </div>
    </section>
  );
}
