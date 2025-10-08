import { useState, useEffect } from 'react';

interface UserStats {
  totalImageGenerations: number;
  totalVideoGenerations: number;
  monthImageGenerations: number;
  monthVideoGenerations: number;
  imageQuota: number;
  videoQuota: number;
  remainingCredits: number;
  planName: string;
  subscriptionStatus: string;
}

// 定义不同订阅计划的配额（匹配实际计划名称）
const PLAN_QUOTAS = {
  'free': { imageQuota: 5, videoQuota: 2 },
  'basic': { imageQuota: 50, videoQuota: 20 },          // 基础档
  'professional': { imageQuota: 200, videoQuota: 100 },  // 专业档
  'enterprise': { imageQuota: 500, videoQuota: 200 },    // 企业档
  'default': { imageQuota: 5, videoQuota: 2 } // 默认值
};

export function useUserStats() {
  const [stats, setStats] = useState<UserStats>({
    totalImageGenerations: 0,
    totalVideoGenerations: 0,
    monthImageGenerations: 0,
    monthVideoGenerations: 0,
    imageQuota: 5,
    videoQuota: 2,
    remainingCredits: 0,
    planName: 'free',
    subscriptionStatus: 'inactive'
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchUserStats = async () => {
    try {
      setIsLoading(true);
      // 添加缓存破坏参数强制刷新
      const response = await fetch(`/api/user/stats?t=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        
        // 根据计划名称获取配额
        const planQuotas = PLAN_QUOTAS[data.planName as keyof typeof PLAN_QUOTAS] || PLAN_QUOTAS.default;
        
        setStats({
          totalImageGenerations: data.imageCount || 0,
          totalVideoGenerations: data.videoCount || 0,
          monthImageGenerations: data.monthImageCount || 0,
          monthVideoGenerations: data.monthVideoCount || 0,
          imageQuota: planQuotas.imageQuota,
          videoQuota: planQuotas.videoQuota,
          remainingCredits: data.remainingCredits || 0,
          planName: data.planName || 'free',
          subscriptionStatus: data.subscriptionStatus || 'inactive'
        });
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserStats();
  }, []);

  const remainingImageGenerations = Math.max(0, stats.imageQuota - stats.monthImageGenerations);
  const remainingVideoGenerations = Math.max(0, stats.videoQuota - stats.monthVideoGenerations);
  
  const canGenerateImage = remainingImageGenerations > 0;
  const canGenerateVideo = remainingVideoGenerations > 0;

  return {
    ...stats,
    remainingImageGenerations,
    remainingVideoGenerations,
    canGenerateImage,
    canGenerateVideo,
    isLoading,
    refreshStats: fetchUserStats
  };
}