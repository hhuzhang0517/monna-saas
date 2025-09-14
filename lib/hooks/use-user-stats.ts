import { useState, useEffect } from 'react';

interface UserStats {
  totalImageGenerations: number;
  totalVideoGenerations: number;
  imageQuota: number;
  videoQuota: number;
  planName: string;
  subscriptionStatus: string;
}

// 定义不同订阅计划的配额
const PLAN_QUOTAS = {
  'free': { imageQuota: 5, videoQuota: 2 },
  'pro': { imageQuota: 50, videoQuota: 20 },
  'premium': { imageQuota: 200, videoQuota: 100 },
  'default': { imageQuota: 5, videoQuota: 2 } // 默认值
};

export function useUserStats() {
  const [stats, setStats] = useState<UserStats>({
    totalImageGenerations: 0,
    totalVideoGenerations: 0,
    imageQuota: 5,
    videoQuota: 2,
    planName: 'free',
    subscriptionStatus: 'inactive'
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchUserStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/stats', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        
        // 根据计划名称获取配额
        const planQuotas = PLAN_QUOTAS[data.planName as keyof typeof PLAN_QUOTAS] || PLAN_QUOTAS.default;
        
        setStats({
          totalImageGenerations: data.imageCount || 0,
          totalVideoGenerations: data.videoCount || 0,
          imageQuota: planQuotas.imageQuota,
          videoQuota: planQuotas.videoQuota,
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

  const remainingImageGenerations = Math.max(0, stats.imageQuota - stats.totalImageGenerations);
  const remainingVideoGenerations = Math.max(0, stats.videoQuota - stats.totalVideoGenerations);
  
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