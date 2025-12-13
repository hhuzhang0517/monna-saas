"use client";

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/contexts/language-context";

interface DualImageUploadProps {
  onImage1Select: (image: File | null) => void;
  onImage2Select: (image: File | null) => void;
  selectedImage1?: File | null;
  selectedImage2?: File | null;
  className?: string;
}

export function DualImageUpload({
  onImage1Select,
  onImage2Select,
  selectedImage1,
  selectedImage2,
  className
}: DualImageUploadProps) {
  const { t } = useTranslation();
  const [dragActive1, setDragActive1] = useState(false);
  const [dragActive2, setDragActive2] = useState(false);
  const inputRef1 = useRef<HTMLInputElement>(null);
  const inputRef2 = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent, isFirst: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      if (isFirst) {
        setDragActive1(true);
      } else {
        setDragActive2(true);
      }
    } else if (e.type === "dragleave") {
      if (isFirst) {
        setDragActive1(false);
      } else {
        setDragActive2(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent, isFirst: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFirst) {
      setDragActive1(false);
    } else {
      setDragActive2(false);
    }

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        if (isFirst) {
          onImage1Select(file);
        } else {
          onImage2Select(file);
        }
      }
    }
  };


  const onButtonClick = (isFirst: boolean) => {
    if (isFirst) {
      inputRef1.current?.click();
    } else {
      inputRef2.current?.click();
    }
  };

  const removeImage = (isFirst: boolean) => {
    if (isFirst) {
      onImage1Select(null);
    } else {
      onImage2Select(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, isFirst: boolean) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith("image/")) {
        if (isFirst) {
          onImage1Select(file);
        } else {
          onImage2Select(file);
        }
      }
    }
    // 清空input value，允许重复选择相同文件
    e.target.value = '';
  };

  const ImageUploadArea = ({
    isFirst,
    dragActive,
    selectedImage,
    inputRef
  }: {
    isFirst: boolean;
    dragActive: boolean;
    selectedImage: File | null | undefined;
    inputRef: React.RefObject<HTMLInputElement>;
  }) => (
      <div className="flex-1">
        <div
          className={cn(
            "relative border-2 border-dashed border-gray-300 rounded-lg p-4 transition-colors h-32",
            dragActive && "border-blue-500 bg-blue-50",
            "hover:border-gray-400"
          )}
          onDragEnter={(e) => handleDrag(e, isFirst)}
          onDragLeave={(e) => handleDrag(e, isFirst)}
          onDragOver={(e) => handleDrag(e, isFirst)}
          onDrop={(e) => handleDrop(e, isFirst)}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => handleChange(e, isFirst)}
          />

        {selectedImage ? (
          <div className="h-full flex items-center justify-center relative">
            <img
              src={URL.createObjectURL(selectedImage)}
              alt={`图片${isFirst ? '1' : '2'}`}
              className="max-h-full max-w-full object-contain rounded"
            />
            <Button
              size="sm"
              variant="destructive"
              className="absolute -top-2 -right-2 w-6 h-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                removeImage(isFirst);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
            <Button
              type="button"
              size="sm"
              onClick={() => onButtonClick(isFirst)}
              className="mb-1"
            >
              <Upload className="mr-1 h-3 w-3" />
              {isFirst ? t('uploadImage1') : t('uploadImage2')}
            </Button>
            <p className="text-xs text-gray-400">
              {t('dragOrClickUpload')}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-3">
        <h4 className="text-sm font-medium text-gray-900 mb-1">{t('uploadTwoOriginalImages')}</h4>
        <p className="text-xs text-gray-500">{t('uploadTwoImagesForAnimeStyle')}</p>
      </div>

      <div className="flex gap-4">
        <ImageUploadArea
          isFirst={true}
          dragActive={dragActive1}
          selectedImage={selectedImage1}
          inputRef={inputRef1}
        />

        <ImageUploadArea
          isFirst={false}
          dragActive={dragActive2}
          selectedImage={selectedImage2}
          inputRef={inputRef2}
        />
      </div>
    </div>
  );
}