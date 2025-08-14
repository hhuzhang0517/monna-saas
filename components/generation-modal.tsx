"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Download, Share2 } from "lucide-react";

interface GenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId?: string;
  templateName?: string;
}

type JobStatus = "queued" | "processing" | "done" | "failed";

interface JobData {
  id: string;
  status: JobStatus;
  result_url?: string;
  created_at: string;
}

export function GenerationModal({ isOpen, onClose, jobId, templateName }: GenerationModalProps) {
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!jobId || !isOpen) return;

    const pollJob = async () => {
      try {
        const response = await fetch(`/api/jobs?id=${jobId}`);
        if (response.ok) {
          const data: JobData = await response.json();
          setJobData(data);
          
          // 更新进度条
          if (data.status === "queued") setProgress(25);
          else if (data.status === "processing") setProgress(75);
          else if (data.status === "done") setProgress(100);
          else if (data.status === "failed") setProgress(0);
        }
      } catch (error) {
        console.error("Failed to fetch job status:", error);
      }
    };

    // 立即执行一次
    pollJob();

    // 如果任务未完成，定期轮询
    const interval = setInterval(() => {
      if (jobData?.status === "done" || jobData?.status === "failed") {
        clearInterval(interval);
        return;
      }
      pollJob();
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, isOpen, jobData?.status]);

  const getStatusText = (status: JobStatus) => {
    switch (status) {
      case "queued": return "排队中...";
      case "processing": return "生成中...";
      case "done": return "生成完成！";
      case "failed": return "生成失败";
      default: return "未知状态";
    }
  };

  const getStatusIcon = (status: JobStatus) => {
    switch (status) {
      case "done": return <CheckCircle className="h-6 w-6 text-green-500" />;
      case "failed": return <XCircle className="h-6 w-6 text-red-500" />;
      default: return null;
    }
  };

  const handleDownload = async () => {
    if (!jobData?.result_url) return;
    
    try {
      const response = await fetch(jobData.result_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `monna-generated-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleShare = async () => {
    if (!jobData?.result_url) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Monna AI 生成的头像',
          text: `使用 ${templateName} 模板生成的AI头像`,
          url: jobData.result_url,
        });
      } catch (error) {
        console.error("Share failed:", error);
      }
    } else {
      // 降级：复制链接到剪贴板
      navigator.clipboard.writeText(jobData.result_url);
      // 这里可以添加 toast 提示
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {jobData?.status === "done" ? "生成完成" : "正在生成头像"}
          </DialogTitle>
          <DialogDescription>
            {templateName && `使用模板：${templateName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 状态和进度 */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              {getStatusIcon(jobData?.status as JobStatus)}
              <span className="font-medium">
                {getStatusText(jobData?.status as JobStatus)}
              </span>
            </div>
            
            {jobData?.status !== "failed" && (
              <Progress value={progress} className="w-full" />
            )}
          </div>

          {/* 结果图片 */}
          {jobData?.status === "done" && jobData.result_url && (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={jobData.result_url}
                  alt="Generated avatar"
                  className="w-full rounded-lg shadow-lg"
                />
              </div>
              
              {/* 操作按钮 */}
              <div className="flex space-x-2">
                <Button onClick={handleDownload} className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  下载
                </Button>
                <Button onClick={handleShare} variant="outline" className="flex-1">
                  <Share2 className="mr-2 h-4 w-4" />
                  分享
                </Button>
              </div>
            </div>
          )}

          {/* 失败状态 */}
          {jobData?.status === "failed" && (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-500">
                生成过程中遇到问题，请稍后重试
              </p>
              <Button onClick={onClose} variant="outline">
                关闭
              </Button>
            </div>
          )}

          {/* 等待状态的关闭按钮 */}
          {jobData?.status !== "done" && jobData?.status !== "failed" && (
            <div className="text-center">
              <Button onClick={onClose} variant="outline">
                后台运行
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}