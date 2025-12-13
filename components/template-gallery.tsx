"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  image: string;
  category: string;
  prompt: string;
  featured?: boolean;
}

// 示例模板数据 - 实际使用时可以从API获取
const TEMPLATES: Template[] = [
  {
    id: "1",
    name: "专业商务头像",
    image: "/templates/business-1.jpg",
    category: "商务",
    prompt: "professional business headshot, corporate style, clean background, confident expression",
    featured: true
  },
  {
    id: "2", 
    name: "艺术肖像",
    image: "/templates/artistic-1.jpg",
    category: "艺术",
    prompt: "artistic portrait, oil painting style, dramatic lighting, renaissance inspired"
  },
  {
    id: "3",
    name: "时尚头像",
    image: "/templates/fashion-1.jpg", 
    category: "时尚",
    prompt: "fashion portrait, modern style, studio lighting, trendy aesthetic"
  },
  {
    id: "4",
    name: "休闲风格",
    image: "/templates/casual-1.jpg",
    category: "休闲", 
    prompt: "casual portrait, natural lighting, relaxed expression, outdoor setting"
  },
  {
    id: "5",
    name: "复古风格",
    image: "/templates/vintage-1.jpg",
    category: "复古",
    prompt: "vintage portrait, retro style, film photography aesthetic, classic composition"
  },
  {
    id: "6",
    name: "创意概念",
    image: "/templates/creative-1.jpg",
    category: "创意",
    prompt: "creative conceptual portrait, surreal elements, artistic interpretation, unique perspective"
  }
];

const CATEGORIES = ["全部", "商务", "艺术", "时尚", "休闲", "复古", "创意"];

interface TemplateGalleryProps {
  onTemplateSelect: (template: Template) => void;
  selectedTemplateId?: string;
}

export function TemplateGallery({ onTemplateSelect, selectedTemplateId }: TemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState("全部");

  const filteredTemplates = TEMPLATES.filter(
    template => selectedCategory === "全部" || template.category === selectedCategory
  );

  return (
    <div className="space-y-6">
      {/* 分类筛选 */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* 模板网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-lg",
              selectedTemplateId === template.id && "ring-2 ring-blue-500"
            )}
            onClick={() => onTemplateSelect(template)}
          >
            <CardContent className="p-0">
              <div className="relative">
                {/* 模板图片 */}
                <div className="aspect-square bg-gray-200 rounded-t-lg overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                    <span className="text-gray-600 text-sm">模板示例</span>
                  </div>
                </div>
                
                {/* 特色标签 */}
                {template.featured && (
                  <Badge className="absolute top-2 left-2" variant="secondary">
                    推荐
                  </Badge>
                )}
                
                {/* 选中状态 */}
                {selectedTemplateId === template.id && (
                  <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center rounded-t-lg">
                    <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center">
                      ✓
                    </div>
                  </div>
                )}
              </div>
              
              {/* 模板信息 */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">{template.name}</h3>
                  <Badge variant="outline" className="text-xs">
                    {template.category}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">
                  {template.prompt}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}