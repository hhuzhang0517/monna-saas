"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown, User, LogOut } from "lucide-react";
import { useAuthStatus } from "@/lib/hooks/use-auth";
import { useTranslation } from "@/lib/contexts/language-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { signOut } from "@/app/(login)/actions";

// Figma assets (placeholder - replace with actual assets when available)
const imgFrame = "/assets/play-icon.svg";
const imgFrame1 = "/assets/dropdown-icon.svg";

export default function HomePage() {
  const { user, loading } = useAuthStatus();
  const { t } = useTranslation();
  
  // 获取用户邮箱首字母
  const getUserInitial = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  return (
    <div className="bg-[#ffffff] relative size-full min-h-screen" data-name="index" data-node-id="86:2">
      {/* Header Navigation */}
      <header className="absolute top-0 left-0 right-0 z-20">
        {/* Monna AI Logo - Left Side */}
        <div className="absolute left-4 top-4">
          <h1 className="font-['Inter:Bold',_sans-serif] font-bold text-white text-[32px] drop-shadow-lg">
            Monna AI
          </h1>
        </div>
        
        {/* Language Switcher - Left Side (moved right) */}
        <div className="absolute left-50 top-6" data-name="Rectangle" data-node-id="86:29">
          <LanguageSwitcher variant="minimal" theme="dark" />
        </div>

        {/* Auth Buttons - Right Side */}
        <div className="absolute right-4 top-4 flex items-center space-x-2">
          {loading ? (
            <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
          ) : user ? (
            <>
              {/* Pricing Button */}
              <div className="h-9 rounded-[7.6px] px-4 flex items-center bg-white/10 backdrop-blur-sm border border-white/20">
                <span className="font-['Inter:Medium',_'Noto_Sans_JP:Regular',_'Noto_Sans_SC:Regular',_sans-serif] font-medium text-white text-[14px] drop-shadow-md">
                  <Link href="/pricing" className="hover:text-blue-200 transition-colors">{t('pricing')}</Link>
                </span>
              </div>
              
              {/* User Avatar Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-white/20">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-orange-600 text-white font-semibold">
                        {getUserInitial(user.email)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64" align="end">
                  <div className="px-3 py-2">
                    <div className="text-sm font-medium text-gray-900">{user.email}</div>
                    <div className="flex items-center mt-1">
                      <Crown className="h-3 w-3 text-orange-600 mr-1" />
                      <Badge variant="secondary" className="text-xs">{t('freeUser')}</Badge>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {t('generationCount')}: <span className="font-semibold text-orange-600">3/5 {t('times')}</span>
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
                  <DropdownMenuItem onClick={signOut} className="text-red-600 cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              {/* Pricing Button */}
              <div className="h-9 rounded-[7.6px] px-4 flex items-center bg-white/10 backdrop-blur-sm border border-white/20">
                <span className="font-['Inter:Medium',_'Noto_Sans_JP:Regular',_'Noto_Sans_SC:Regular',_sans-serif] font-medium text-white text-[14px] drop-shadow-md">
                  <Link href="/pricing" className="hover:text-blue-200 transition-colors">{t('pricing')}</Link>
                </span>
              </div>
              
              {/* Login Button */}
              <div className="h-9 rounded-[7.6px] px-4 flex items-center bg-white/20 backdrop-blur-sm border border-white/30">
                <span className="font-['Inter:Medium',_'Noto_Sans_JP:Regular',_'Noto_Sans_SC:Regular',_sans-serif] font-medium text-white text-[14px] drop-shadow-md">
                  <Link href="/sign-in" className="hover:text-blue-200 transition-colors">{t('signIn')}</Link>
                </span>
              </div>
              
              {/* Register Button */}
              <div className="bg-white h-9 rounded-[7.6px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] px-4 flex items-center hover:bg-gray-100 transition-colors">
                <span className="font-['Inter:Medium',_'Noto_Sans_JP:Regular',_sans-serif] font-medium text-[14px] text-gray-900">
                  <Link href="/sign-up">{t('signUp')}</Link>
                </span>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Full Screen Video Background */}
      <div 
        className="absolute inset-0 top-0 left-0 w-full h-full overflow-hidden"
        data-name="Rectangle"
        data-node-id="86:7"
      >
        <video
          className="w-full h-full object-cover"
          controls
          autoPlay
          muted
          loop
        >
          <source src="/figma-designs/demo1.mp4" type="video/mp4" />
          您的浏览器不支持视频播放。
        </video>
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        {/* Get Started Button */}
        <div className="flex justify-center items-center mt-[70vh]">
          <Link href="/generate">
            <div 
              className="bg-[#ffffff] h-[47px] w-[300px] rounded-full shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1),0px_10px_15px_0px_rgba(0,0,0,0.1)] flex items-center justify-center hover:shadow-xl transition-shadow cursor-pointer backdrop-blur-sm"
              data-name="Rectangle"
            >
              <span 
                className="font-['Inter:Bold',_'Noto_Sans_SC:Bold',_'Noto_Sans_JP:Bold',_sans-serif] font-bold text-[#000000] text-[16px] text-center"
              >
                {t('getStarted')}
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}