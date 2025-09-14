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
import { CheckCircle, XCircle, Download, Share2, Loader2 } from "lucide-react";

interface GenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId?: string;
  templateName?: string;
  generationType?: 'image' | 'video' | 'longvideo';
}

type JobStatus = "queued" | "processing" | "done" | "failed";

interface JobData {
  id: string;
  status: JobStatus;
  result_url?: string;
  created_at: string;
  progress?: number;
  currentStep?: string;
  message?: string;
}

export function GenerationModal({ isOpen, onClose, jobId, templateName, generationType = 'image' }: GenerationModalProps) {
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!jobId || !isOpen) return;
    
    // 如果是临时的"generating"状态，不需要轮询
    if (jobId === "generating") return;

    const pollJob = async () => {
      try {
        let response;
        if (generationType === 'longvideo') {
          // 长视频使用专门的API端点
          response = await fetch(`/api/jobs/long-video?jobId=${jobId}`);
        } else {
          // 普通图片和短视频使用原有API
          response = await fetch(`/api/jobs?id=${jobId}`);
        }
        
        if (response.ok) {
          const data: JobData = await response.json();
          setJobData(data);
          
          // 更新进度条
          if (generationType === 'longvideo') {
            // 长视频使用实际进度
            setProgress(data.progress || 0);
          } else {
            // 短视频和图片使用估计进度
            if (data.status === "queued") setProgress(25);
            else if (data.status === "processing") setProgress(75);
            else if (data.status === "done") setProgress(100);
            else if (data.status === "failed") setProgress(0);
          }
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
      
      // 根据生成类型设置正确的文件扩展名
      const fileExtension = (generationType === 'video' || generationType === 'longvideo') ? 'mp4' : 'png';
      a.download = `monna-generated-${Date.now()}.${fileExtension}`;
      
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
        const contentType = (generationType === 'video' || generationType === 'longvideo') ? '视频' : '头像';
        await navigator.share({
          title: `Monna AI 生成的${contentType}`,
          text: `使用 ${templateName} 模板生成的AI${contentType}`,
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
          <DialogTitle className="flex items-center space-x-2">
            {jobData?.status === "done" ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>生成完成</span>
              </>
            ) : jobData?.status === "failed" ? (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                <span>生成失败</span>
              </>
            ) : (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                <span>
                  {generationType === 'video' ? "视频正在生成..." : 
                   generationType === 'longvideo' ? "长视频正在生成..." : 
                   "图片正在生成..."}
                </span>
              </>
            )}
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

          {/* 预览区域 */}
          <div className="space-y-4">
            <div className="relative bg-gray-100 rounded-lg shadow-lg" style={{ minHeight: '200px' }}>
              {jobData?.status === "done" && jobData.result_url ? (
                // 生成完成，显示结果
                (generationType === 'video' || generationType === 'longvideo') ? (
                  <video
                    src={jobData.result_url}
                    controls
                    autoPlay
                    loop
                    muted
                    className="w-full rounded-lg shadow-lg"
                    style={{ maxHeight: '400px' }}
                  >
                    您的浏览器不支持视频播放
                  </video>
                ) : (
                  <img
                    src={jobData.result_url}
                    alt="Generated content"
                    className="w-full rounded-lg shadow-lg"
                  />
                )
              ) : (
                // 生成中或等待中，显示加载状态
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <div className="relative">
                    <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-gray-500">
                      {jobData?.status === "queued" && "排队等待中..."}
                      {jobData?.status === "processing" && (
                        generationType === 'longvideo' ? 
                          (jobData.message || "正在生成长视频，请耐心等待...") :
                        generationType === 'video' ? "正在生成视频，请耐心等待..." : 
                        "正在生成图片，请稍候..."
                      )}
                      {!jobData && (jobId === "generating" ? 
                        (generationType === 'video' ? "正在创建视频生成任务..." : 
                         generationType === 'longvideo' ? "正在创建长视频生成任务..." : 
                         "正在创建图片生成任务...") : 
                        "准备开始生成..."
                      )}
                    </p>
                    {generationType === 'longvideo' && jobData?.currentStep && (
                      <p className="text-xs text-blue-600 font-medium">
                        当前步骤: {jobData.currentStep}
                      </p>
                    )}
                    {generationType === 'longvideo' && jobData?.progress && (
                      <p className="text-xs text-gray-400">
                        进度: {jobData.progress}%
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          {jobData?.status === "done" && jobData.result_url && (
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