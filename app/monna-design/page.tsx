"use client";

import { FigmaInspiredGallery } from "@/components/figma-inspired-gallery";

const MonnaDesignPage = () => {
  const handleTemplateSelect = (template: any) => {
    console.log("Template selected:", template);
    // 可以在这里添加模板选择后的逻辑
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <FigmaInspiredGallery onTemplateSelect={handleTemplateSelect} />
    </div>
  );
};

export default MonnaDesignPage;