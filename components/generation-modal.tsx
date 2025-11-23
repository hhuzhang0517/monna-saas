"use client";

import { useState, useEffect, useRef } from "react";
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
  error_message?: string; // 添加错误信息字段
}

export function GenerationModal({ isOpen, onClose, jobId, templateName, generationType = 'image' }: GenerationModalProps) {
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [progress, setProgress] = useState(0);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!jobId || !isOpen) return;

    // 重置状态当jobId变化时
    setJobData(null);
    setProgress(0);

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
          try {
            const data: JobData = await response.json();

            // 检查result_url是否包含错误信息
            if (data.result_url && data.result_url.startsWith('ERROR:')) {
              data.error_message = data.result_url.substring(7); // 移除"ERROR: "前缀
              data.result_url = undefined; // 清空result_url
            }

            setJobData(data);

            // 更新进度条
            if (generationType === 'longvideo') {
              // 长视频使用实际进度
              setProgress(data.progress || 0);
            } else {
              // 短视频和图片使用更详细的估计进度
              if (data.status === "queued") setProgress(15);
              else if (data.status === "processing") setProgress(85);
              else if (data.status === "done") setProgress(100);
              else if (data.status === "failed") setProgress(0);
            }
          } catch (jsonError) {
            console.error("Failed to parse JSON response:", jsonError);
            // 尝试获取原始文本以便调试
            try {
              const clonedResponse = response.clone();
              const text = await clonedResponse.text();
              console.error("Response text:", text.substring(0, 200));
            } catch (textError) {
              console.error("Failed to read response text:", textError);
            }
          }
        } else {
          console.error("Response not OK:", response.status, response.statusText);
        }
      } catch (error) {
        console.error("Failed to fetch job status:", error);
      }
    };

    // 立即执行一次
    pollJob();

    // 简化轮询策略：固定2秒间隔，减少服务器压力
    const interval = setInterval(async () => {
      try {
        let response;
        if (generationType === 'longvideo') {
          response = await fetch(`/api/jobs/long-video?jobId=${jobId}`);
        } else {
          response = await fetch(`/api/jobs?id=${jobId}`);
        }

        if (response.ok) {
          try {
            const data: JobData = await response.json();

            // 检查result_url是否包含错误信息
            if (data.result_url && data.result_url.startsWith('ERROR:')) {
              data.error_message = data.result_url.substring(7); // 移除"ERROR: "前缀
              data.result_url = undefined; // 清空result_url
            }

            // 检查是否完成，如果完成就停止轮询
            if (data.status === "done" || data.status === "failed") {
              clearInterval(interval);
            }

            setJobData(data);

            // 更新进度条
            if (generationType === 'longvideo') {
              setProgress(data.progress || 0);
            } else {
              if (data.status === "queued") setProgress(15);
              else if (data.status === "processing") setProgress(85);
              else if (data.status === "done") setProgress(100);
              else if (data.status === "failed") setProgress(0);
            }
          } catch (jsonError) {
            console.error("Failed to parse JSON response in interval:", jsonError);
            // 尝试获取原始文本以便调试
            try {
              const clonedResponse = response.clone();
              const text = await clonedResponse.text();
              console.error("Response text:", text.substring(0, 200));
            } catch (textError) {
              console.error("Failed to read response text:", textError);
            }
          }
        } else {
          console.error("Response not OK in interval:", response.status, response.statusText);
        }
      } catch (error) {
        console.error("Failed to fetch job status in interval:", error);
      }
    }, 2000); // 固定2秒间隔

    return () => clearInterval(interval);
  }, [jobId, isOpen, generationType]);

  // 图片加载完成时检测尺寸
  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      });
    }
  };

  // 判断是否需要缩放显示（垂直分辨率超过2048）
  const shouldScaleDown = imageDimensions && imageDimensions.height > 2048;

  // 计算预览容器样式
  const getPreviewContainerStyle = () => {
    if (!shouldScaleDown) {
      return {};
    }

    // 当垂直分辨率超过2048时，整个预览区域缩小到50%
    return {
      transform: 'scale(0.5)',
      transformOrigin: 'top center',
      maxHeight: '70vh', // 限制最大高度为视口高度的70%
      overflow: 'hidden',
      // 减少缩放后的底部空白
      marginBottom: imageDimensions ? `-${Math.min(imageDimensions.height * 0.25, 300)}px` : '0'
    };
  };

  // 计算图片显示样式
  const getImageDisplayStyle = () => {
    return {
      maxWidth: '100%',
      height: 'auto',
      display: 'block'
    };
  };

  const getStatusText = (status: JobStatus | null | undefined) => {
    if (!status) {
      return jobId === "generating" ? "正在创建任务..." : "初始化中...";
    }
    switch (status) {
      case "queued": return "排队中...";
      case "processing": return "生成中...";
      case "done": return "生成完成！";
      case "failed": return "生成失败";
      default: return "处理中...";
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
      // 下载原始分辨率图片，不受预览缩放影响
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
        // 分享原始分辨率图片URL，不受预览缩放影响
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
              <div className="w-full space-y-2">
                <Progress value={progress} className="w-full" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>进度</span>
                  <span>{Math.round(progress)}%</span>
                </div>
              </div>
            )}
          </div>

          {/* 预览区域 */}
          <div className="space-y-4">
            {shouldScaleDown && (
              <div className="text-center">
                <p className="text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded-md">
                  🔍 超高分辨率图片已缩放至50%显示 (原始: {imageDimensions?.width} × {imageDimensions?.height})
                </p>
              </div>
            )}
            <div
              className="relative bg-gray-100 rounded-lg shadow-lg"
              style={{
                minHeight: '200px',
                ...getPreviewContainerStyle()
              }}
            >
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
                  <div className="rounded-lg">
                    <img
                      ref={imageRef}
                      src={jobData.result_url}
                      alt="Generated content"
                      className="w-full rounded-lg shadow-lg"
                      style={getImageDisplayStyle()}
                      onLoad={handleImageLoad}
                    />
                  </div>
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
                    
                    {/* 显示当前进度百分比 */}
                    {progress > 0 && (
                      <p className="text-xs text-gray-400">
                        {generationType === 'longvideo' ? 
                          `进度: ${jobData?.progress || 0}%` : 
                          `进度: ${Math.round(progress)}%`
                        }
                      </p>
                    )}
                    
                    {/* 显示详细状态 */}
                    {jobData?.status === "processing" && generationType !== 'longvideo' && (
                      <p className="text-xs text-blue-600 font-medium">
                        {generationType === 'video' ? "视频处理中..." : "图片渲染中..."}
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
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium mb-2">
                  {jobData.error_message || "生成过程中遇到问题"}
                </p>
                {jobData.error_message?.includes('人脸') && (
                  <p className="text-xs text-red-600">
                    提示：请确保上传的图片或视频中包含清晰可见的人脸
                  </p>
                )}
              </div>
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