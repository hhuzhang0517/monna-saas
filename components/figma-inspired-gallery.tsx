"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Heart, Download, Share2, Star } from "lucide-react";

interface FigmaTemplate {
  id: string;
  name: string;
  image: string;
  category: string;
  prompt: string;
  featured?: boolean;
  tags: string[];
  likes: number;
  downloads: number;
}

// 基于您的 Figma 设计稿的模板数据
const FIGMA_TEMPLATES: FigmaTemplate[] = [
  {
    id: "figma-template-1",
    name: "商务专业头像",
    image: "/figma-designs/generated-design.png",
    category: "商务",
    prompt: "professional business headshot, corporate executive style, navy blue suit, clean studio background, confident expression, high resolution, corporate photography",
    featured: true,
    tags: ["专业", "商务", "正装"],
    likes: 324,
    downloads: 1205
  },
  {
    id: "figma-template-2",
    name: "时尚创意头像",
    image: "/figma-designs/generated-design.png",
    category: "时尚",
    prompt: "fashion portrait, artistic style, dramatic lighting, modern aesthetic, creative composition, editorial photography, high fashion",
    featured: false,
    tags: ["时尚", "创意", "个性"],
    likes: 486,
    downloads: 1754
  },
  {
    id: "figma-template-3",
    name: "艺术肖像风格",
    image: "/figma-designs/generated-design.png",
    category: "艺术",
    prompt: "artistic portrait, oil painting style, dramatic lighting, renaissance inspired, creative interpretation, unique perspective",
    featured: false,
    tags: ["艺术", "肖像", "品牌"],
    likes: 397,
    downloads: 1106
  },
  {
    id: "figma-template-4",
    name: "休闲自然风格",
    image: "/figma-designs/generated-design.png",
    category: "休闲",
    prompt: "casual lifestyle portrait, natural lighting, relaxed expression, outdoor setting, authentic feel, contemporary style",
    featured: false,
    tags: ["休闲", "自然", "亲和"],
    likes: 527,
    downloads: 687
  },
  {
    id: "figma-template-5",
    name: "复古经典风格",
    image: "/figma-designs/generated-design.png",
    category: "复古",
    prompt: "vintage portrait, retro aesthetic, film photography style, classic composition, nostalgic feel, timeless elegance",
    featured: false,
    tags: ["复古", "经典", "怀旧"],
    likes: 678,
    downloads: 1543
  },
  {
    id: "figma-template-6",
    name: "现代简约头像",
    image: "/figma-designs/generated-design.png",
    category: "简约",
    prompt: "modern minimal portrait, clean lines, simple background, contemporary style, geometric elements, minimalist aesthetic",
    featured: false,
    tags: ["现代", "简约", "几何"],
    likes: 734,
    downloads: 1987
  }
];

const CATEGORIES = ["全部", "商务", "时尚", "艺术", "休闲", "复古", "简约"];

interface FigmaInspiredGalleryProps {
  onTemplateSelect: (template: FigmaTemplate) => void;
  selectedTemplateId?: string;
}

export function FigmaInspiredGallery({ onTemplateSelect, selectedTemplateId }: FigmaInspiredGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState("全部");
  const [likedTemplates, setLikedTemplates] = useState<Set<string>>(new Set());

  const filteredTemplates = FIGMA_TEMPLATES.filter(
    template => selectedCategory === "全部" || template.category === selectedCategory
  );

  const handleLike = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newLiked = new Set(likedTemplates);
    if (newLiked.has(templateId)) {
      newLiked.delete(templateId);
    } else {
      newLiked.add(templateId);
    }
    setLikedTemplates(newLiked);
  };

  return (
    <div className="space-y-8">
      {/* Hero Section - Figma Style */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
          AI 头像模板库
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          精选高质量模板，一键生成专业头像作品
        </p>
      </div>

      {/* Category Filter - Figma Inspired */}
      <div className="flex flex-wrap gap-2 justify-center">
        {CATEGORIES.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className={cn(
              "rounded-full px-6 transition-all duration-200",
              selectedCategory === category && "shadow-lg scale-105"
            )}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Templates Grid - Figma Style Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            className={cn(
              "group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2",
              "border border-gray-200 overflow-hidden bg-white",
              selectedTemplateId === template.id && "ring-2 ring-purple-500 shadow-lg"
            )}
            onClick={() => onTemplateSelect(template)}
          >
            <CardContent className="p-0">
              {/* Template Image */}
              <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                {/* 模拟图片占位符 */}
                <div className="w-full h-full bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-purple-200 rounded-full mx-auto flex items-center justify-center">
                      <Star className="h-8 w-8 text-purple-600" />
                    </div>
                    <p className="text-sm text-gray-600 font-medium">{template.name}</p>
                  </div>
                </div>
                
                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white/90 hover:bg-white text-black"
                    onClick={(e) => {
                      e.stopPropagation();
                      // 预览功能
                    }}
                  >
                    预览
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary" 
                    className="bg-white/90 hover:bg-white text-black"
                    onClick={(e) => handleLike(template.id, e)}
                  >
                    <Heart className={cn(
                      "h-4 w-4",
                      likedTemplates.has(template.id) && "fill-red-500 text-red-500"
                    )} />
                  </Button>
                </div>

                {/* Featured Badge */}
                {template.featured && (
                  <Badge className="absolute top-3 left-3 bg-gradient-to-r from-purple-500 to-pink-500">
                    精选
                  </Badge>
                )}
                
                {/* Selection Indicator */}
                {selectedTemplateId === template.id && (
                  <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                    <div className="bg-purple-500 text-white rounded-full w-10 h-10 flex items-center justify-center">
                      ✓
                    </div>
                  </div>
                )}
              </div>
              
              {/* Template Info */}
              <div className="p-4 space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg text-gray-900">{template.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                  </div>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Heart className="h-4 w-4" />
                      <span>{template.likes}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Download className="h-4 w-4" />
                      <span>{template.downloads}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More Button */}
      <div className="text-center pt-8">
        <Button variant="outline" size="lg" className="px-8">
          加载更多模板
        </Button>
      </div>
    </div>
  );
}