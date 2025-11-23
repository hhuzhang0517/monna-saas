"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Video, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/contexts/language-context";

interface VideoUploadProps {
  onVideoSelect: (file: File | null, duration?: number) => void;
  selectedVideo: File | null;
  className?: string;
}

export function VideoUpload({
  onVideoSelect,
  selectedVideo,
  className
}: VideoUploadProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>("");
  const [isChecking, setIsChecking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 检查视频元数据并标记需要处理的信息
  const analyzeVideo = useCallback(async (file: File): Promise<{
    duration: number;
    width: number;
    height: number;
    needsProcessing: boolean;
    targetResolution?: { width: number; height: number };
  }> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        const { videoWidth, videoHeight, duration } = video;
        window.URL.revokeObjectURL(video.src);
        
        // Runway支持的分辨率 (aspect ratios)
        const runwayAspectRatios = [
          { width: 1280, height: 720 },   // 16:9
          { width: 720, height: 1280 },   // 9:16
          { width: 960, height: 960 },    // 1:1
          { width: 1104, height: 832 },   // 4:3
          { width: 832, height: 1104 },   // 3:4
          { width: 1584, height: 672 },   // 21:9
        ];
        
        // 检查是否需要处理
        const needsTimeProcessing = duration > 10;
        
        // 找到最接近的分辨率
        const currentRatio = videoWidth / videoHeight;
        let bestMatch = runwayAspectRatios[0];
        let smallestDiff = Math.abs(currentRatio - (bestMatch.width / bestMatch.height));
        
        for (const ratio of runwayAspectRatios) {
          const diff = Math.abs(currentRatio - (ratio.width / ratio.height));
          if (diff < smallestDiff) {
            smallestDiff = diff;
            bestMatch = ratio;
          }
        }
        
        const needsResolutionProcessing = videoWidth !== bestMatch.width || videoHeight !== bestMatch.height;
        
        resolve({
          duration,
          width: videoWidth,
          height: videoHeight,
          needsProcessing: needsTimeProcessing || needsResolutionProcessing,
          targetResolution: needsResolutionProcessing ? bestMatch : undefined
        });
      };
      
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        reject(new Error(t('videoAnalysisFailed')));
      };
      
      video.src = URL.createObjectURL(file);
    });
  }, [t]);

  const validateVideo = useCallback(async (file: File): Promise<{
    processedFile: File;
    error?: string;
    info?: { duration: number; needsProcessing: boolean; targetResolution?: any }
  }> => {
    // 检查文件类型
    if (!file.type.startsWith('video/')) {
      return { processedFile: file, error: t('pleaseUploadVideo') };
    }

    // 检查文件大小 (64MB = 64 * 1024 * 1024 bytes)
    const maxSize = 64 * 1024 * 1024;
    if (file.size > maxSize) {
      return { processedFile: file, error: t('videoFileSizeLimit') };
    }

    // ⚠️ 检查文件是否过小（可能被移动端浏览器压缩）
    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB < 3) {
      console.warn("⚠️ 视频文件过小:", fileSizeMB.toFixed(2), "MB。移动端浏览器可能已压缩视频，实际时长可能很短");
    }

    try {
      // 分析视频元数据
      const analysis = await analyzeVideo(file);
      
      // 将分析信息附加到文件对象上
      (file as any).duration = Math.min(analysis.duration, 10);
      (file as any).originalDuration = analysis.duration;
      (file as any).needsProcessing = analysis.needsProcessing;
      (file as any).targetResolution = analysis.targetResolution;

      // 特别提示：视频时长警告
      if (analysis.duration < 3) {
        console.warn("⚠️ 视频时长过短:", analysis.duration, "秒。角色功能需要至少3秒的视频以获得最佳效果");
      }

      return {
        processedFile: file,
        info: {
          duration: analysis.duration,
          needsProcessing: analysis.needsProcessing,
          targetResolution: analysis.targetResolution
        }
      };
    } catch (err) {
      return { processedFile: file, error: t('videoAnalysisFailed') };
    }
  }, [analyzeVideo, t]);

  const [processingInfo, setProcessingInfo] = useState<string>("");

  const handleFileSelect = async (file: File) => {
    setError("");
    setProcessingInfo("");
    setIsChecking(true);
    
    try {
      const { processedFile, error, info } = await validateVideo(file);
      if (error) {
        setError(error);
        onVideoSelect(null);
      } else {
        // 显示处理信息
        const messages = [];
        const fileSizeMB = processedFile.size / 1024 / 1024;

        // 文件大小警告（移动端压缩检测）
        if (fileSizeMB < 3) {
          messages.push(`⚠️ 文件大小: ${fileSizeMB.toFixed(2)}MB (可能被浏览器压缩)`);
        } else {
          messages.push(`文件大小: ${fileSizeMB.toFixed(2)}MB`);
        }

        if (info?.duration) {
          // 显示实际视频时长
          messages.push(`视频时长: ${info.duration.toFixed(1)}秒`);

          if (info.duration > 10) {
            messages.push(t('videoWillBeTruncated', { duration: info.duration.toFixed(1) }));
          }

          if (info.duration < 3) {
            messages.push("⚠️ 视频较短，建议使用3秒以上的视频");
          }
        }

        if (info?.targetResolution) {
          messages.push(t('resolutionWillBeAdjusted', {
            width: info.targetResolution.width.toString(),
            height: info.targetResolution.height.toString()
          }));
        }

        if (messages.length > 0) {
          setProcessingInfo(messages.join(' | '));
        }

        const duration = (processedFile as any).duration || 10;
        onVideoSelect(processedFile, duration);
      }
    } catch (err) {
      setError(t('fileAnalysisFailed'));
      onVideoSelect(null);
    } finally {
      setIsChecking(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
    // 清空input value，允许重复选择相同文件
    e.target.value = '';
  };

  const handleRemoveVideo = () => {
    setError("");
    setProcessingInfo("");
    onVideoSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn("w-full", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      {selectedVideo ? (
        <div className="space-y-4">
          <div className="relative bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <Video className="h-8 w-8 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {selectedVideo.name}
                </p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(selectedVideo.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveVideo}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* 视频预览 */}
            <div className="mt-3">
              <video
                src={URL.createObjectURL(selectedVideo)}
                className="w-full h-56 object-cover rounded border"
                controls
                muted
              />
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFileDialog}
          className={cn(
            "relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors min-h-[200px] flex items-center justify-center",
            isDragging 
              ? "border-orange-500 bg-orange-50" 
              : "border-gray-300 hover:border-gray-400",
            isChecking && "cursor-wait"
          )}
        >
          <div className="space-y-4">
            <div className="mx-auto">
              {isChecking ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto" />
              ) : (
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
              )}
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-900">
                {isChecking ? t('processingVideo') : t('clickUploadOrDragVideo')}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {t('videoFormatSupport')}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mt-2 flex items-center space-x-2 text-red-600 bg-red-50 p-2 rounded-md">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {processingInfo && (
        <div className="mt-2 flex items-center space-x-2 text-blue-600 bg-blue-50 p-2 rounded-md">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">📹 {processingInfo}</p>
        </div>
      )}
    </div>
  );
}