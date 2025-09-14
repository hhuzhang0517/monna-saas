import { useState, useEffect } from 'react';

interface JobStatus {
  id: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
  type: 'image' | 'video';
  created_at: string;
}

export function usePendingTasks() {
  const [pendingJobs, setPendingJobs] = useState<JobStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const checkPendingJobs = async () => {
    try {
      setIsLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

      const response = await fetch('/api/jobs/pending', {
        credentials: 'include',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const jobs: JobStatus[] = await response.json();
        // 过滤掉已完成和失败的任务，只保留真正待处理的任务
        const pendingOnly = jobs.filter(job =>
          job.status === 'queued' || job.status === 'processing'
        );
        setPendingJobs(pendingOnly || []);
      } else if (response.status === 401) {
        // 认证失败时，不清空当前状态，避免页面闪烁
        console.warn('Authentication timeout, will retry...');
      } else {
        console.error('Failed to fetch pending jobs, status:', response.status);
        setPendingJobs([]);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Request timeout when fetching pending jobs');
      } else {
        console.error('Failed to fetch pending jobs:', error);
      }
      // 网络错误时不清空状态，继续显示之前的状态
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 立即检查一次
    checkPendingJobs();
    
    // 每10秒检查一次待处理任务
    const interval = setInterval(checkPendingJobs, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const hasPendingTasks = pendingJobs.length > 0;
  const pendingCount = pendingJobs.length;

  return {
    pendingJobs,
    hasPendingTasks,
    pendingCount,
    isLoading,
    refreshPendingJobs: checkPendingJobs
  };
}