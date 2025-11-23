import { useState, useEffect, useRef } from 'react';

interface JobStatus {
  id: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
  type: 'image' | 'video';
  created_at: string;
}

export function usePendingTasks() {
  const [pendingJobs, setPendingJobs] = useState<JobStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isCheckingRef = useRef(false);

  const checkPendingJobs = async () => {
    // 防止重复请求
    if (isCheckingRef.current) {
      return;
    }

    try {
      isCheckingRef.current = true;
      setIsLoading(true);

      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 减少到8秒超时

      const response = await fetch('/api/jobs/pending', {
        credentials: 'include',
        signal: controller.signal,
        // 添加缓存控制头
        headers: {
          'Cache-Control': 'no-cache',
        },
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
        // 静默处理取消的请求
      } else {
        console.error('Failed to fetch pending jobs:', error);
      }
      // 网络错误时不清空状态，继续显示之前的状态
    } finally {
      setIsLoading(false);
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    // 立即检查一次
    checkPendingJobs();
    
    // 智能轮询策略：根据任务状态调整轮询频率
    let interval: NodeJS.Timeout;
    
    const scheduleNextCheck = () => {
      // 如果有待处理任务，更频繁地轮询；否则大幅减少频率
      const pollInterval = pendingJobs.length > 0 ? 5000 : 15000; // 5秒 vs 15秒
      interval = setTimeout(() => {
        checkPendingJobs().then(scheduleNextCheck);
      }, pollInterval);
    };
    
    scheduleNextCheck();
    
    return () => {
      clearTimeout(interval);
      // 清理时取消正在进行的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [pendingJobs.length]); // 依赖于待处理任务数量

  const hasPendingTasks = pendingJobs.length > 0;
  const pendingCount = pendingJobs.length;

  // 手动清理状态的函数
  const clearPendingJobs = async () => {
    try {
      console.log('🧹 Starting cleanup of pending jobs...');

      // 调用后端 API 清理数据库中的任务
      // forceAll: true 表示清理所有待处理任务，不管时间
      const response = await fetch('/api/jobs/cleanup', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ forceAll: true }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Cleanup completed:', result);

        // 清空前端状态
        setPendingJobs([]);

        // 重新刷新任务列表以确保同步
        setTimeout(() => {
          checkPendingJobs();
        }, 500);
      } else {
        console.error('❌ Cleanup API failed:', response.status);
        // 即使 API 失败，也清空前端状态
        setPendingJobs([]);
      }
    } catch (error) {
      console.error('❌ Failed to cleanup jobs:', error);
      // 即使出错，也清空前端状态
      setPendingJobs([]);
    }
  };

  return {
    pendingJobs,
    hasPendingTasks,
    pendingCount,
    isLoading,
    refreshPendingJobs: checkPendingJobs,
    clearPendingJobs
  };
}