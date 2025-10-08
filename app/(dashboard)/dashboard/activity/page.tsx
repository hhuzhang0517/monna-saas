'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { CreditCard, TrendingUp, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import useSWR from 'swr';
// import { useTranslation } from '@/lib/contexts/language-context';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// 获取生成类型显示名称和图标
function getGenerationType(jobInfo: any) {
  if (!jobInfo) return { name: '-', icon: '💳', unit: '-' };
  
  if (jobInfo.type === 'image') {
    return { name: '图片生成', icon: '🖼️', unit: '1张' };
  } else if (jobInfo.type === 'video') {
    const duration = jobInfo.video_duration || 5; // 默认5秒
    return { name: '短视频生成', icon: '🎬', unit: `${duration}秒` };
  } else if (jobInfo.type === 'longvideo') {
    const duration = jobInfo.video_duration || 30; // 默认30秒
    return { name: '长视频生成', icon: '🎞️', unit: `${duration}秒` };
  }
  
  return { name: '未知类型', icon: '❓', unit: '-' };
}

// 格式化日期时间
function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }),
    time: date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  };
}

// 信用点交易记录组件（增强版表格）
function CreditHistory() {
  const { data: creditHistoryResponse } = useSWR('/api/credits/history', fetcher);

  if (!creditHistoryResponse) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>信用点消费记录</CardTitle>
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
        <CardTitle>信用点消费记录</CardTitle>
        <p className="text-sm text-gray-500">详细记录每次AI生成任务的消费情况</p>
      </CardHeader>
      <CardContent>
        {creditHistory.length === 0 ? (
          <p className="text-gray-500 text-center py-8">暂无消费记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-sm text-gray-500">
                  <th className="text-left py-3 px-2">类型</th>
                  <th className="text-left py-3 px-2">规格</th>
                  <th className="text-right py-3 px-2">消费</th>
                  <th className="text-left py-3 px-2">日期时间</th>
                  <th className="text-right py-3 px-2">余额</th>
                </tr>
              </thead>
              <tbody>
                {creditHistory.map((transaction: any) => {
                  const genType = getGenerationType(transaction.job_info);
                  const dateTime = formatDateTime(transaction.created_at);
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
                              {isCharge ? '📈 订阅续费' : 
                               isRefund ? '↩️ 退款' : 
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
                            (transaction.reason.includes('基础档') ? '+2000' : 
                             transaction.reason.includes('高级档') ? '+5000' : 
                             transaction.reason.includes('专业档') ? '+10000' : '+') :
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
                        <span className="text-xs text-gray-500 ml-1">积分</span>
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
                        <span className="text-xs text-gray-500 ml-1">积分</span>
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

  if (!teamData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>订阅计划</CardTitle>
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

  const planNames = {
    'free': '免费档',
    'basic': '基础档',
    'professional': '专业档',
    'enterprise': '企业档'
  };

  const currentPlan = planNames[teamData?.planName as keyof typeof planNames] || teamData?.planName || '免费档';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>订阅计划</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">当前计划</p>
            <div className="flex items-center justify-between">
              <p className="text-xl font-semibold">{currentPlan}</p>
              <Badge variant={teamData?.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                {teamData?.subscriptionStatus === 'active' ? '已激活' :
                 teamData?.subscriptionStatus === 'trialing' ? '试用中' : '未激活'}
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500">剩余信用点</p>
            <p className="text-2xl font-bold text-orange-500">{teamData?.credits || 0}</p>
          </div>

          <Link href="/pricing">
            <Button className="w-full bg-orange-500 hover:bg-orange-600">
              升级订阅
            </Button>
          </Link>
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

  if (!statsData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>使用统计</span>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>使用统计</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">本月生成次数</span>
            <span className="font-semibold">{statsData.monthGenerationCount || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">本月消费信用点</span>
            <span className="font-semibold">{statsData.monthCreditsConsumed || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">下次续费日期</span>
            <span className="font-semibold">
              {statsData.nextRenewalDate
                ? new Date(statsData.nextRenewalDate).toLocaleDateString('zh-CN')
                : '-'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ActivityPage() {

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-lg lg:text-2xl font-medium text-gray-900">
          订阅与账单
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 订阅计划信息 */}
        <Suspense fallback={
          <Card>
            <CardHeader>
              <CardTitle>订阅计划</CardTitle>
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
                <span>使用统计</span>
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
              <CardTitle>信用点历史</CardTitle>
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
