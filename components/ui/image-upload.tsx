"use client";

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/contexts/language-context";

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  selectedImage?: File | null;
  className?: string;
  label?: string; // 自定义上传按钮文本
}

export function ImageUpload({ onImageSelect, selectedImage, className, label }: ImageUploadProps) {
  const { t } = useTranslation();
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        onImageSelect(file);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith("image/")) {
        onImageSelect(file);
      }
    }
    // 清空input value，允许重复选择相同文件
    e.target.value = '';
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "relative border-2 border-dashed border-gray-300 rounded-lg p-6 transition-colors",
          dragActive && "border-blue-500 bg-blue-50",
          "hover:border-gray-400"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleChange}
        />

        {selectedImage ? (
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={URL.createObjectURL(selectedImage)}
                alt="Selected"
                className="w-24 h-24 object-cover rounded-lg"
              />
              <Button
                size="sm"
                variant="destructive"
                className="absolute -top-2 -right-2 w-6 h-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onImageSelect(null as any);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {selectedImage.name}
              </p>
              <p className="text-xs text-gray-500">
                {(selectedImage.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <Button type="button" onClick={onButtonClick}>
                <Upload className="mr-2 h-4 w-4" />
                {label || t('uploadPortraitPhoto')}
              </Button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {t('dragImageHere')}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {t('imageFormatSupport')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}