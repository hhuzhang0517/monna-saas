"use client";

import { useState, useEffect } from "react";
import { Heart, Play, Eye, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
}

interface MonnnaCommunityProps {
  onClose?: () => void;
}

export function MonnaCommunity({ onClose }: MonnnaCommunityProps) {
  const [shares, setShares] = useState<CommunityShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<CommunityShare | null>(null);

  useEffect(() => {
    fetchShares();
  }, [page, sortBy]);

  const fetchShares = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/community/shares?page=${page}&limit=12&sortBy=${sortBy}`);
      if (response.ok) {
        const data = await response.json();
        setShares(data.shares || []);
        setTotalPages(data.totalPages || 1);
      } else {
        console.error('Failed to fetch community shares');
      }
    } catch (error) {
      console.error('Error fetching community shares:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (shareId: string) => {
    try {
      const response = await fetch('/api/community/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId })
      });

      if (response.ok) {
        const data = await response.json();
        // 更新本地状态
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

        // 如果当前正在查看该视频，也更新详情
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

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Monna AI Community</h2>
            <p className="text-sm text-gray-500 mt-1">探索用户创作的精彩角色迁移作品</p>
          </div>

          {/* Sort Options */}
          <div className="flex gap-2">
            <Button
              variant={sortBy === 'latest' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSortBy('latest');
                setPage(1);
              }}
            >
              最新
            </Button>
            <Button
              variant={sortBy === 'popular' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSortBy('popular');
                setPage(1);
              }}
            >
              最热门
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : shares.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-500">暂无分享内容</p>
              <p className="text-sm text-gray-400 mt-2">成为第一个分享作品的用户！</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {shares.map((share) => (
              <div
                key={share.id}
                className="group cursor-pointer relative"
                onMouseEnter={() => setHoveredId(share.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => handleVideoClick(share)}
              >
                <div className="relative overflow-hidden rounded-lg border border-gray-200 hover:border-orange-500 transition-all duration-300 bg-white shadow-sm hover:shadow-md">
                  {/* Video Thumbnail */}
                  <div className="relative w-full aspect-[9/16] bg-gray-100">
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
                        {share.thumbnailUrl ? (
                          <img
                            src={share.thumbnailUrl}
                            alt={share.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-pink-100">
                            <Play className="h-12 w-12 text-orange-500" />
                          </div>
                        )}
                      </>
                    )}

                    {/* Play Icon Overlay */}
                    {hoveredId !== share.id && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/50 rounded-full p-3">
                          <Play className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info Overlay on Hover */}
                  {hoveredId === share.id && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-3">
                      <div className="text-white">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4" />
                          <span className="text-xs font-medium truncate">{share.author.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <Heart className={`h-4 w-4 ${share.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                            <span>{share.likesCount}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span>{share.viewsCount}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              上一页
            </Button>
            <span className="text-sm text-gray-600">
              第 {page} / {totalPages} 页
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              下一页
            </Button>
          </div>
        </div>
      )}

      {/* Video Detail Dialog */}
      {selectedVideo && (
        <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedVideo.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Video Player */}
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  src={selectedVideo.videoUrl}
                  className="w-full h-full object-contain"
                  controls
                  autoPlay
                />
              </div>

              {/* Author and Stats */}
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

                <div className="flex items-center gap-4">
                  <Button
                    variant={selectedVideo.isLiked ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleLike(selectedVideo.id)}
                    className="gap-2"
                  >
                    <Heart className={`h-4 w-4 ${selectedVideo.isLiked ? 'fill-current' : ''}`} />
                    <span>{selectedVideo.likesCount}</span>
                  </Button>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Eye className="h-4 w-4" />
                    <span>{selectedVideo.viewsCount}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedVideo.description && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-700">{selectedVideo.description}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
