"use client";

import { useState } from "react";
import { ImageUpload } from "@/components/ui/image-upload";
import { GenerationModal } from "@/components/generation-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface FigmaTemplate {
  id: string;
  name: string;
  image: string;
  category: string;
  prompt: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// 从 Figma 获取的真实图片区域数据
const FIGMA_IMAGE_AREAS: FigmaTemplate[] = [
  { id: "figma-img-1", name: "图片1", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 11, y: 0, width: 284, height: 160 },
  { id: "figma-img-2", name: "图片2", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 297, y: 0, width: 284, height: 427 },
  { id: "figma-img-3", name: "图片3", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 584, y: 0, width: 284, height: 427 },
  { id: "figma-img-4", name: "图片4", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 870, y: 0, width: 284, height: 506 },
  { id: "figma-img-5", name: "图片5", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 1157, y: 0, width: 284, height: 160 },
  { id: "figma-img-6", name: "图片6", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 11, y: 162, width: 284, height: 506 },
  { id: "figma-img-7", name: "图片7", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 1157, y: 162, width: 284, height: 284 },
  { id: "figma-img-8", name: "图片8", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 297, y: 429, width: 284, height: 427 },
  { id: "figma-img-9", name: "图片9", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 584, y: 429, width: 284, height: 427 },
  { id: "figma-img-10", name: "图片10", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 1157, y: 448, width: 284, height: 160 },
  { id: "figma-img-11", name: "图片11", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 870, y: 508, width: 284, height: 506 },
  { id: "figma-img-12", name: "图片12", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 1157, y: 610, width: 284, height: 506 },
  { id: "figma-img-13", name: "图片13", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 11, y: 670, width: 284, height: 506 },
  { id: "figma-img-14", name: "图片14", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 297, y: 858, width: 284, height: 506 },
  { id: "figma-img-15", name: "图片15", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 584, y: 858, width: 284, height: 506 },
  { id: "figma-img-16", name: "图片16", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 870, y: 1015, width: 284, height: 213 },
  { id: "figma-img-17", name: "图片17", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 1157, y: 1118, width: 284, height: 506 },
  { id: "figma-img-18", name: "图片18", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 11, y: 1177, width: 284, height: 190 },
  { id: "figma-img-19", name: "图片19", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 870, y: 1231, width: 284, height: 506 },
  { id: "figma-img-20", name: "图片20", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 297, y: 1365, width: 284, height: 160 },
  { id: "figma-img-21", name: "图片21", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 584, y: 1366, width: 284, height: 284 },
  { id: "figma-img-22", name: "图片22", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 11, y: 1369, width: 284, height: 379 },
  { id: "figma-img-23", name: "图片23", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 297, y: 1527, width: 284, height: 506 },
  { id: "figma-img-24", name: "图片24", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 1157, y: 1626, width: 284, height: 506 },
  { id: "figma-img-25", name: "图片25", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 584, y: 1652, width: 284, height: 506 },
  { id: "figma-img-26", name: "图片26", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 870, y: 1738, width: 284, height: 284 },
  { id: "figma-img-27", name: "图片27", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 11, y: 1750, width: 284, height: 506 },
  { id: "figma-img-28", name: "图片28", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 870, y: 2025, width: 284, height: 506 },
  { id: "figma-img-29", name: "图片29", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 297, y: 2035, width: 284, height: 284 },
  { id: "figma-img-30", name: "图片30", image: "/figma-designs/generated-design.png", category: "头像", prompt: "professional portrait, high quality headshot", x: 1157, y: 2133, width: 284, height: 427 }
];

// 主设计稿尺寸
const MAIN_FRAME_SIZE = { width: 1452, height: 2561 };

export default function GeneratePage() {
  const [selectedTemplate, setSelectedTemplate] = useState<FigmaTemplate | null>(null);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>("openai");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const handleTemplateClick = (template: FigmaTemplate) => {
    setSelectedTemplate(template);
    setShowUploadDialog(true);
  };

  const handleGenerate = async () => {
    if (!selectedTemplate || !uploadedImage) {
      alert("请选择模板和上传人像照片");
      return;
    }

    setIsGenerating(true);
    setShowUploadDialog(false);
    
    try {
      // 构建生成提示，结合模板和用户上传的图片
      const enhancedPrompt = `${selectedTemplate.prompt}, based on uploaded portrait, maintain facial features and identity, high quality, professional result`;
      
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: selectedProvider,
          type: "image",
          prompt: enhancedPrompt,
          template_id: selectedTemplate.id,
          template_name: selectedTemplate.name,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentJobId(data.id);
        setShowModal(true);
      } else {
        const error = await response.json();
        alert(`生成失败: ${error.error}`);
      }
    } catch (error) {
      console.error("Generation failed:", error);
      alert("网络错误，请稍后重试");
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = selectedTemplate && uploadedImage && !isGenerating;

  return (
    <div className="container mx-auto px-4 py-6">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            创建你的AI头像
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto">
            精选高质量模板，一键生成专业头像作品
          </p>
        </div>

        {/* 您的 Figma 设计稿 - 真实图片区域 */}
        <div className="w-full flex justify-center mb-8">
          <div className="relative max-w-[1452px] w-full">
            {/* 您的 Figma 设计稿作为背景 */}
            <img 
              src="/figma-designs/generated-design.png" 
              alt="Monna AI 设计稿" 
              className="w-full h-auto object-contain"
              style={{ aspectRatio: `${MAIN_FRAME_SIZE.width}/${MAIN_FRAME_SIZE.height}` }}
            />
            
            {/* 每张图片的可点击区域 - 使用真实坐标 */}
            {FIGMA_IMAGE_AREAS.map((imageArea) => (
              <button
                key={imageArea.id}
                onClick={() => handleTemplateClick(imageArea)}
                className="absolute bg-transparent hover:bg-blue-500/20 border-2 border-transparent hover:border-blue-500 transition-all duration-200 rounded group"
                style={{
                  left: `${(imageArea.x / MAIN_FRAME_SIZE.width) * 100}%`,
                  top: `${(imageArea.y / MAIN_FRAME_SIZE.height) * 100}%`,
                  width: `${(imageArea.width / MAIN_FRAME_SIZE.width) * 100}%`,
                  height: `${(imageArea.height / MAIN_FRAME_SIZE.height) * 100}%`,
                }}
                title="点击选择此模板"
              >
                {/* 悬停时显示点击提示 */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500/10 rounded">
                  <div className="bg-white/90 backdrop-blur-sm rounded px-2 py-1 text-xs font-medium text-gray-900">
                    点击选择
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

      {/* 上传照片弹窗 */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {selectedTemplate?.name}
              <Button
                variant="ghost" 
                size="sm"
                onClick={() => setShowUploadDialog(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              上传您的人像照片，AI将基于选择的模板风格生成头像
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 模板预览 */}
            {selectedTemplate && (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">选中模板：{selectedTemplate.category}</p>
              </div>
            )}
            
            {/* 图片上传 */}
            <div>
              <ImageUpload
                onImageSelect={setUploadedImage}
                selectedImage={uploadedImage}
              />
            </div>

            {/* AI 引擎选择 */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                选择 AI 引擎
              </label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI DALL-E 3</SelectItem>
                  <SelectItem value="ideogram">Ideogram 3.0</SelectItem>
                  <SelectItem value="gemini" disabled>
                    Gemini (即将推出)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 生成按钮 */}
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  生成中...
                </>
              ) : (
                "开始生成头像"
              )}
            </Button>

            {!canGenerate && !isGenerating && (
              <p className="text-sm text-gray-500 text-center">
                {!uploadedImage && "请先上传人像照片"}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 生成进度弹窗 */}
      <GenerationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        jobId={currentJobId}
        templateName={selectedTemplate?.name}
      />
    </div>
  );
}