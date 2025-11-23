"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown, User, LogOut, Image, Video } from "lucide-react";
import { useAuthStatus } from "@/lib/hooks/use-auth";
import { useUserStats } from "@/lib/hooks/use-user-stats";
import { useTranslation } from "@/lib/contexts/language-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { signOut } from "@/app/(login)/actions";
import { LoginModal } from "@/components/auth/login-modal";

// Figma assets (placeholder - replace with actual assets when available)
const imgFrame = "/assets/play-icon.svg";
const imgFrame1 = "/assets/dropdown-icon.svg";
 
export default function HomePage() {
  const { user, loading } = useAuthStatus();
  const { t } = useTranslation();
  const {
    totalImageGenerations,
    totalVideoGenerations,
    imageQuota,
    videoQuota,
    remainingCredits,
    planName
  } = useUserStats();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 微信浏览器视频自动播放处理
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // 检测是否在微信浏览器中
    const isWeChat = /MicroMessenger/i.test(navigator.userAgent);

    // 尝试自动播放
    const playVideo = async () => {
      try {
        await video.play();
        console.log('[HomePage] Video autoplay started');
      } catch (error) {
        console.warn('[HomePage] Video autoplay failed, will retry on user interaction:', error);

        // 如果自动播放失败，在用户首次交互时播放
        const playOnInteraction = () => {
          video.play().then(() => {
            console.log('[HomePage] Video started after user interaction');
            // 移除事件监听器
            document.removeEventListener('touchstart', playOnInteraction);
            document.removeEventListener('click', playOnInteraction);
          }).catch(err => {
            console.error('[HomePage] Video play failed even after interaction:', err);
          });
        };

        // 监听用户交互
        document.addEventListener('touchstart', playOnInteraction, { once: true });
        document.addEventListener('click', playOnInteraction, { once: true });
      }
    };

    // 在微信中延迟一点再播放，增加成功率
    if (isWeChat) {
      setTimeout(playVideo, 300);
    } else {
      playVideo();
    }

    // 清理
    return () => {
      document.removeEventListener('touchstart', () => {});
      document.removeEventListener('click', () => {});
    };
  }, []);

  // 获取用户显示名称（优先使用 name，否则使用 email，最后使用 Anonymous）
  const getUserDisplayName = (user: any) => {
    if (user.name && user.name !== 'Anonymous') {
      return user.name;
    }
    if (user.email) {
      return user.email;
    }
    return 'Anonymous';
  };

  // 获取用户头像首字母
  const getUserInitial = (user: any) => {
    const displayName = user.name || user.email || 'Anonymous';
    return displayName.charAt(0).toUpperCase();
  };

  // 处理退出登录
  const handleSignOut = async () => {
    try {
      await signOut();
      // 强制刷新页面以清除所有客户端状态
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
      // 即使出错也尝试刷新页面
      window.location.href = '/';
    }
  };

  return (
    <div className="bg-[#ffffff] relative w-full min-h-screen overflow-hidden" data-name="index" data-node-id="86:2">
      {/* Header Navigation */}
      <header className="absolute top-0 left-0 right-0 z-[100] pointer-events-none">
        {/* Monna AI Logo - Left Side */}
        <div className="absolute left-4 top-4 pointer-events-auto">
          <h1 className="font-bold text-white text-[32px] drop-shadow-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
            Monna AI
          </h1>
        </div>
        
        {/* Language Switcher - Left Side (moved right) */}
        <div className="absolute left-50 top-6 pointer-events-auto" data-name="Rectangle" data-node-id="86:29">
          <LanguageSwitcher variant="minimal" theme="dark" />
        </div>

        {/* Auth Buttons - Right Side */}
        <div className="absolute right-4 top-4 flex items-center space-x-2 pointer-events-auto">
          {loading ? (
            <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
          ) : user ? (
            <>
              {/* Pricing Button - 优化响应速度：使用内联 touchAction 和精确过渡 */}
              <Link
                href="/pricing"
                className="bg-white h-9 rounded-lg shadow-md px-4 flex items-center hover:bg-gray-100 active:scale-95 transition-shadow cursor-pointer"
                style={{ touchAction: 'manipulation' }}
              >
                <span className="font-medium text-sm text-gray-900" style={{ fontFamily: 'Inter, Noto Sans, sans-serif' }}>
                  {t('pricing')}
                </span>
              </Link>

              {/* User Avatar Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:opacity-80">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-orange-600 text-white font-semibold">
                        {getUserInitial(user)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64" align="end">
                  <div className="px-3 py-2">
                    <div className="text-sm font-medium text-gray-900">{getUserDisplayName(user)}</div>
                    <div className="flex items-center mt-1">
                      <Crown className="h-3 w-3 text-orange-600 mr-1" />
                      <Badge variant="secondary" className="text-xs">
                        {planName === 'free' ? t('freeUser') : `${planName.toUpperCase()} 用户`}
                      </Badge>
                    </div>
                    {/* 剩余 Credit */}
                    <div className="text-xs text-gray-600 mt-2">
                      剩余 Credit: <span className="font-semibold text-orange-600">{remainingCredits}</span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" />
                      {t('personalInfo')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              {/* Pricing Button - 优化响应速度：使用内联 touchAction 和精确过渡 */}
              <Link
                href="/pricing"
                className="bg-white h-9 rounded-lg shadow-md px-4 flex items-center hover:bg-gray-100 active:scale-95 transition-shadow cursor-pointer"
                style={{ touchAction: 'manipulation' }}
              >
                <span className="font-medium text-sm text-gray-900" style={{ fontFamily: 'Inter, Noto Sans, sans-serif' }}>
                  {t('pricing')}
                </span>
              </Link>

              {/* Login Button */}
              <button
                onClick={() => setLoginModalOpen(true)}
                className="bg-white h-9 rounded-lg shadow-md px-4 flex items-center hover:bg-gray-100 transition-colors"
              >
                <span className="font-medium text-sm text-gray-900" style={{ fontFamily: 'Inter, Noto Sans, sans-serif' }}>
                  {t('signIn')}
                </span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Full Screen Video Background */}
      <div
        className="absolute inset-0 w-full h-full overflow-hidden"
        style={{ zIndex: 1, pointerEvents: 'none' }}
        data-name="Rectangle"
        data-node-id="86:7"
        role="img"
        aria-label="Monna AI 产品演示视频"
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          webkit-playsinline="true"
          x5-playsinline="true"
          x5-video-player-type="h5"
          x5-video-player-fullscreen="false"
          preload="auto"
          style={{ pointerEvents: 'none' }}
          aria-label="Monna AI AI图片和视频生成平台产品演示"
          title="Monna AI 产品演示"
        >
          <source src="/figma-designs/demo1.mp4" type="video/mp4" />
          <track kind="captions" src="/captions/demo1-zh.vtt" srcLang="zh" label="中文字幕" />
          您的浏览器不支持视频播放。
        </video>
      </div>

      {/* Content Overlay */}
      <div className="relative flex items-center justify-center min-h-screen" style={{ zIndex: 100, pointerEvents: 'none' }}>
        {/* Get Started Button */}
        <div className="flex justify-center items-center" style={{ marginTop: '70vh', pointerEvents: 'auto' }}>
          {user ? (
            <Link href="/generate">
              <div
                className="bg-white h-12 px-8 rounded-full shadow-lg flex items-center justify-center hover:shadow-2xl transition-shadow cursor-pointer active:scale-95"
                style={{
                  minWidth: '300px',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  touchAction: 'manipulation'
                }}
                data-name="Rectangle"
              >
                <span
                  className="font-bold text-black text-base text-center"
                  style={{ fontFamily: 'Inter, Noto Sans, sans-serif' }}
                >
                  {t('getStarted')}
                </span>
              </div>
            </Link>
          ) : (
            <button
              onClick={() => setLoginModalOpen(true)}
              className="bg-white h-12 px-8 rounded-full shadow-lg flex items-center justify-center hover:shadow-2xl transition-shadow cursor-pointer active:scale-95"
              style={{
                minWidth: '300px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                touchAction: 'manipulation'
              }}
            >
              <span
                className="font-bold text-black text-base text-center"
                style={{ fontFamily: 'Inter, Noto Sans, sans-serif' }}
              >
                {t('getStarted')}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
    </div>
  );
}