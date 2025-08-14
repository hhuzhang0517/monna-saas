"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Upload, Wand2 } from "lucide-react";

export default function MonnaDesignPage() {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {/* 完整展示您的 Figma 设计稿 */}
      <div className="relative w-full">
        {/* 您的 Figma 设计稿 - 完整尺寸展示 */}
        <div className="w-full flex justify-center">
          <img 
            src="/figma-designs/generated-design.png" 
            alt="Monna AI - 完整设计稿" 
            className="w-full max-w-[1500px] h-auto"
            style={{ 
              display: "block",
              margin: "0 auto"
            }}
          />
        </div>

        {/* 浮动操作面板 - 基于设计稿位置调整 */}
        <div className="fixed bottom-8 right-8 z-50">
          <Card className="w-80 shadow-2xl border-2 border-purple-200">
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  快速开始 AI 生成
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  上传您的照片，选择风格，一键生成专业头像
                </p>
              </div>

              {/* 快速上传区域 */}
              <div className="space-y-3">
                <ImageUpload
                  onImageSelect={setUploadedImage}
                  selectedImage={uploadedImage}
                  className="!h-24"
                />
                
                <div className="flex space-x-2">
                  <Link href="/generate" className="flex-1">
                    <Button className="w-full" size="sm">
                      <Wand2 className="mr-2 h-4 w-4" />
                      开始生成
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" className="px-3">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 顶部导航栏 - 透明悬浮 */}
        <div className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div className="text-xl font-bold text-gray-900">
              Monna AI
            </div>
            <div className="flex space-x-4">
              <Link href="/generate">
                <Button variant="ghost" size="sm">
                  生成头像
                </Button>
              </Link>
              <Link href="/gallery">
                <Button variant="ghost" size="sm">
                  作品展示
                </Button>
              </Link>
              <Button size="sm">
                立即开始
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}