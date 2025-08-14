"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* 直接展示您的 Figma 设计稿 */}
      <div className="w-full flex justify-center bg-gray-50">
        <div className="relative max-w-[1500px] w-full">
          {/* 您的 Figma 设计稿作为背景/主要内容 */}
          <img 
            src="/figma-designs/generated-design.png" 
            alt="Monna AI 设计稿" 
            className="w-full h-auto object-contain"
            style={{ maxHeight: "100vh", objectFit: "contain" }}
          />
          
          {/* 在设计稿上覆盖交互元素 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* 如果需要在设计稿上添加交互按钮，可以在这里添加 */}
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-lg max-w-md w-full mx-4 mt-auto mb-20">
              <h2 className="text-2xl font-bold text-center mb-4 text-gray-900">
                开始 AI 头像生成
              </h2>
              <Link href="/generate">
                <Button className="w-full" size="lg">
                  立即开始
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}