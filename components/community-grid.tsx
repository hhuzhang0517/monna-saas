"use client";

import { useState, useEffect, useRef } from "react";
import { Heart, Play, User, Sparkles, MoreVertical, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CommunityShare {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  title: string;
  description?: string;
  likesCount: number;
  viewsCount: number;
  createdAt: string;
  isLiked: boolean;
  author: {
    id: string;
    name: string;
  };
  canDelete?: boolean; // 用户是否有权限删除
}

interface VideoMetadata {
  width: number;
  height: number;
  aspectRatio: number;
}

interface CommunityGridProps {
  limit?: number;
  refreshTrigger?: number; // 用于触发刷新
  sortBy?: 'latest' | 'popular'; // 排序方式
  onImageSelect?: (imageUrl: string) => void; // 选择图片的回调（用于电影制作）
  compact?: boolean; // 紧凑模式（显示更少内容）
  maxDisplay?: number; // 最大显示数量（用于紧凑模式）
}

export function CommunityGrid({
  limit = 100,
  refreshTrigger = 0,
  sortBy = 'popular',
  onImageSelect,
  compact = false,
  maxDisplay = 6
}: CommunityGridProps) {
  const [shares, setShares] = useState<CommunityShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<CommunityShare | null>(null);
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const [videoMetadata, setVideoMetadata] = useState<Map<string, VideoMetadata>>(new Map());

  // 生成同款功能相关状态
  const [showRemakeDialog, setShowRemakeDialog] = useState(false);
  const [remakeImage, setRemakeImage] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // 删除功能相关状态
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [shareToDelete, setShareToDelete] = useState<CommunityShare | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    console.log('[CommunityGrid] Fetching shares, refreshTrigger:', refreshTrigger);
    const init = async () => {
      const { userId, isSuperAdmin } = await fetchCurrentUser();
      await fetchShares(userId, isSuperAdmin);
    };
    init();
  }, [refreshTrigger]);

  // 提取视频首帧作为缩略图，并保存视频元数据
  useEffect(() => {
    shares.forEach((share) => {
      if (!thumbnails.has(share.id) && share.videoUrl) {
        extractVideoThumbnail(share.videoUrl, share.id);
      }
    });
  }, [shares]);

  const extractVideoThumbnail = (videoUrl: string, shareId: string) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
    video.currentTime = 0.5; // 提取第0.5秒的帧
    video.muted = true;

    video.onloadeddata = () => {
      try {
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const aspectRatio = videoWidth / videoHeight;

        // 保存视频元数据
        setVideoMetadata(prev => new Map(prev).set(shareId, {
          width: videoWidth,
          height: videoHeight,
          aspectRatio: aspectRatio
        }));

        // 创建缩略图 - 保持原始宽高比
        const canvas = document.createElement('canvas');
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
          setThumbnails(prev => new Map(prev).set(shareId, thumbnailUrl));
        }
      } catch (error) {
        console.error('[CommunityGrid] ❌ Failed to extract thumbnail:', error);
        // 即使提取失败，也设置一个空的元数据避免重试
        setVideoMetadata(prev => new Map(prev).set(shareId, {
          width: 9,
          height: 16,
          aspectRatio: 9/16
        }));
      }
    };

    video.onerror = (e) => {
      console.warn('[CommunityGrid] ⚠️ Video load failed (URL may be expired), shareId:', shareId);
      // 设置默认元数据，避免无限重试
      setVideoMetadata(prev => new Map(prev).set(shareId, {
        width: 9,
        height: 16,
        aspectRatio: 9/16
      }));
    };
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/user');
      if (response.ok) {
        const user = await response.json();
        console.log('[CommunityGrid] Current user data:', user);
        const userId = user?.id || null;
        const isSuperAdmin = user?.role === 'super_admin';
        setCurrentUserId(userId);
        setIsSuperAdmin(isSuperAdmin);
        console.log('[CommunityGrid] Set userId:', userId, 'isSuperAdmin:', isSuperAdmin);
        return { userId, isSuperAdmin };
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
    return { userId: null, isSuperAdmin: false };
  };

  const fetchShares = async (userId: string | null = null, isAdmin: boolean = false) => {
    setLoading(true);
    try {
      console.log('[CommunityGrid] 🚀 Starting fetch, params:', { limit, sortBy, userId, isAdmin });

      const response = await fetch(`/api/community/shares?page=1&limit=${limit}&sortBy=${sortBy}`);

      console.log('[CommunityGrid] 📡 Response status:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('[CommunityGrid] ✅ API Success:', {
          totalShares: data.shares?.length || 0,
          total: data.total,
          page: data.page,
          totalPages: data.totalPages
        });

        // 调试：查看完整响应数据
        if (data.shares && data.shares.length > 0) {
          console.log('[CommunityGrid] 📦 First share sample:', data.shares[0]);
        } else {
          console.warn('[CommunityGrid] ⚠️ API returned empty shares array');
        }

        // 为每个分享添加删除权限标识
        const sharesWithPermissions = data.shares?.map((share: CommunityShare) => {
          const canDelete = userId && (share.author.id === userId || isAdmin);
          return {
            ...share,
            canDelete
          };
        }) || [];

        console.log('[CommunityGrid] 🎯 Setting shares state:', sharesWithPermissions.length);
        setShares(sharesWithPermissions);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[CommunityGrid] ❌ API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
      }
    } catch (error) {
      console.error('[CommunityGrid] 💥 Exception:', error);
    } finally {
      setLoading(false);
      console.log('[CommunityGrid] 🏁 Fetch complete');
    }
  };

  const handleLike = async (shareId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch('/api/community/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId })
      });

      if (response.ok) {
        const data = await response.json();
        setShares(prevShares =>
          prevShares.map(share => {
            if (share.id === shareId) {
              return {
                ...share,
                isLiked: data.liked,
                likesCount: data.liked ? share.likesCount + 1 : share.likesCount - 1
              };
            }
            return share;
          })
        );

        if (selectedVideo && selectedVideo.id === shareId) {
          setSelectedVideo(prev => prev ? {
            ...prev,
            isLiked: data.liked,
            likesCount: data.liked ? prev.likesCount + 1 : prev.likesCount - 1
          } : null);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleVideoClick = (share: CommunityShare) => {
    setSelectedVideo(share);
  };

  // 处理生成同款按钮点击
  const handleRemakeClick = () => {
    setShowRemakeDialog(true);
  };

  // 处理生成同款提交 - 传递数据到父组件触发角色迁移流程
  const handleRemakeSubmit = () => {
    if (!remakeImage || !selectedVideo) {
      alert("请先上传人像图片");
      return;
    }

    // 将视频URL和图片存储到sessionStorage，供generate页面读取
    sessionStorage.setItem('remakeData', JSON.stringify({
      videoUrl: selectedVideo.videoUrl,
      videoTitle: selectedVideo.title
    }));

    // 创建一个新的File对象（图片），将其转换为可序列化的格式
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        sessionStorage.setItem('remakeImage', JSON.stringify({
          name: remakeImage.name,
          type: remakeImage.type,
          size: remakeImage.size,
          dataUrl: e.target.result
        }));

        // 跳转到generate页面并触发角色迁移
        window.location.href = "/generate?action=remake";
      }
    };
    reader.readAsDataURL(remakeImage);
  };

  // 处理删除按钮点击
  const handleDeleteClick = (share: CommunityShare, e: React.MouseEvent) => {
    e.stopPropagation();
    setShareToDelete(share);
    setShowDeleteDialog(true);
  };

  // 确认删除
  const handleDeleteConfirm = async () => {
    if (!shareToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/community/shares/${shareToDelete.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // 删除成功，从列表中移除
        setShares(prevShares => prevShares.filter(s => s.id !== shareToDelete.id));
        setShowDeleteDialog(false);
        setShareToDelete(null);

        // 如果删除的是当前查看的视频，关闭详情弹窗
        if (selectedVideo?.id === shareToDelete.id) {
          setSelectedVideo(null);
        }
      } else {
        const data = await response.json();
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('Error deleting share:', error);
      alert('删除失败，请稍后重试');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(limit)].map((_, i) => (
          <div key={i} className="aspect-[9/16] bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (shares.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">暂无社区作品</p>
        <p className="text-sm text-gray-400 mt-2">成为第一个分享作品的用户！</p>
      </div>
    );
  }

  // 根据模式决定显示的数据
  const displayShares = compact ? shares.slice(0, maxDisplay) : shares;

  return (
    <>
      {/* 使用CSS Grid瀑布流布局，自动根据宽高比紧凑排列 */}
      <div className={compact ? "grid grid-cols-3 md:grid-cols-6 gap-2" : "columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4"}>
        {displayShares.map((share) => {
          const thumbnail = thumbnails.get(share.id);
          const metadata = videoMetadata.get(share.id);

          return (
            <div
              key={share.id}
              className={`group cursor-pointer relative ${compact ? '' : 'break-inside-avoid mb-4'}`}
              onMouseEnter={() => setHoveredId(share.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => {
                if (onImageSelect && thumbnail) {
                  // 紧凑模式：点击选择缩略图
                  onImageSelect(thumbnail);
                } else {
                  // 正常模式：打开视频详情
                  handleVideoClick(share);
                }
              }}
            >
              <div className="relative overflow-hidden rounded-lg border-2 border-transparent hover:border-orange-500 transition-all duration-300 bg-black shadow-lg hover:shadow-2xl">
                {/* 三点菜单按钮 - 右上角，紧凑模式下隐藏 */}
                {!compact && share.canDelete && (
                  <div className="absolute top-2 right-2 z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="bg-black/50 hover:bg-black/70 text-white rounded-full p-2 backdrop-blur-sm transition-all"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => handleDeleteClick(share, e as any)}
                          className="text-red-600 focus:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                {/* 视频预览区域 - 根据视频实际宽高比自适应 */}
                <div
                  className="relative w-full"
                  style={{
                    aspectRatio: metadata ? `${metadata.width}/${metadata.height}` : '9/16'
                  }}
                >
                  {hoveredId === share.id && share.videoUrl ? (
                    <video
                      src={share.videoUrl}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <>
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={share.title}
                          className="w-full h-full object-cover"
                        />
                      ) : share.thumbnailUrl ? (
                        <img
                          src={share.thumbnailUrl}
                          alt={share.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                          <Play className="h-16 w-16 text-gray-400" />
                        </div>
                      )}
                    </>
                  )}

                  {/* 播放图标 - 紧凑模式下隐藏 */}
                  {!compact && hoveredId !== share.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/50 rounded-full p-4">
                        <Play className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  )}

                  {/* 紧凑模式：显示选择提示 */}
                  {compact && hoveredId === share.id && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="text-white text-xs text-center px-2">
                        点击选择
                      </div>
                    </div>
                  )}

                  {/* 悬停信息层 - 紧凑模式下隐藏 */}
                  {!compact && hoveredId === share.id && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end p-4">
                      <div className="text-white">
                        <div className="flex items-center gap-2 mb-3">
                          <User className="h-4 w-4" />
                          <span className="text-sm font-medium truncate">
                            {share.author.name || share.author.id.substring(0, 8) || '未知用户'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <button
                            onClick={(e) => handleLike(share.id, e)}
                            className="flex items-center gap-2 hover:scale-110 transition-transform"
                          >
                            <Heart
                              className={`h-5 w-5 ${share.isLiked ? 'fill-red-500 text-red-500' : ''}`}
                            />
                            <span>{share.likesCount}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 视频详情弹窗 */}
      {selectedVideo && (
        <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedVideo.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* 视频播放器 */}
              <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ height: '600px' }}>
                <video
                  src={selectedVideo.videoUrl}
                  className="w-full h-full object-contain"
                  controls
                  autoPlay
                />
              </div>

              {/* 作者和统计 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-gray-100 rounded-full p-2">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{selectedVideo.author.name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(selectedVideo.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>

                <Button
                  variant={selectedVideo.isLiked ? "default" : "outline"}
                  size="sm"
                  onClick={(e) => handleLike(selectedVideo.id, e)}
                  className="gap-2"
                >
                  <Heart className={`h-4 w-4 ${selectedVideo.isLiked ? 'fill-current' : ''}`} />
                  <span>{selectedVideo.likesCount}</span>
                </Button>
              </div>

              {/* 生成同款按钮 */}
              <div className="border-t pt-4">
                <Button
                  onClick={handleRemakeClick}
                  className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white gap-2"
                  size="lg"
                >
                  <Sparkles className="h-5 w-5" />
                  生成同款
                </Button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  上传你的人像照片，AI将为你生成同款视频
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 删除确认对话框 */}
      {showDeleteDialog && shareToDelete && (
        <Dialog open={showDeleteDialog} onOpenChange={() => !isDeleting && setShowDeleteDialog(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                确定要删除这个分享吗？此操作无法撤销。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* 显示要删除的视频预览 */}
              <div className="bg-gray-100 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-900 mb-2">{shareToDelete.title}</p>
                <p className="text-xs text-gray-500">
                  作者：{shareToDelete.author.name}
                </p>
                <p className="text-xs text-gray-500">
                  发布时间：{new Date(shareToDelete.createdAt).toLocaleDateString('zh-CN')}
                </p>
              </div>

              {isSuperAdmin && shareToDelete.author.id !== currentUserId && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-800">
                    <strong>管理员操作：</strong>您正在删除其他用户的分享
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setShareToDelete(null);
                  }}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? "删除中..." : "确认删除"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 生成同款 - 人像上传对话框 */}
      {showRemakeDialog && selectedVideo && (
        <Dialog open={showRemakeDialog} onOpenChange={() => setShowRemakeDialog(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>生成同款视频</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>提示：</strong>请上传清晰的人像照片
                </p>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li>照片中需要包含清晰可见的人脸</li>
                  <li>建议使用正面照片，光线充足</li>
                  <li>支持 JPG、PNG、WebP 格式</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  上传人像照片
                </label>
                <ImageUpload
                  onImageSelect={setRemakeImage}
                  selectedImage={remakeImage}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRemakeDialog(false);
                    setRemakeImage(null);
                  }}
                  disabled={isGenerating}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  onClick={handleRemakeSubmit}
                  disabled={!remakeImage || isGenerating}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                >
                  {isGenerating ? "生成中..." : "开始生成"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
