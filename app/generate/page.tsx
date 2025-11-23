"use client";

import { useState, useEffect, useRef } from "react";
import { ImageUpload } from "@/components/ui/image-upload";
import { DualImageUpload } from "@/components/ui/dual-image-upload";
import { VideoUpload } from "@/components/ui/video-upload";
import { GenerationModal } from "@/components/generation-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Crown, Zap, User, CreditCard, RefreshCw, LogOut, Image, Video, ImagePlus, Trash2, Send, Check, Share2, Users } from "lucide-react";
import { ImageComparisonSlider } from "@/components/ui/image-comparison-slider";
import { MonnaCommunity } from "@/components/monna-community";
import { CommunityGrid } from "@/components/community-grid";
import { useAuthStatus } from "@/lib/hooks/use-auth";
import { usePendingTasks } from "@/lib/hooks/use-pending-tasks";
import { useUserStats } from "@/lib/hooks/use-user-stats";
import { useTranslation, useLanguage } from "@/lib/contexts/language-context";
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signOut } from "@/app/(login)/actions";
import { LoginModal } from "@/components/auth/login-modal";
import { ChatwootWidget } from "@/components/chatwoot-widget";

interface FigmaTemplate {
  id: string;
  image: string;
  afterImage?: string; // AI生成后的图片（用于对比展示）
  category: string;
  prompt: string;
}

interface VideoTemplate {
  id: string;
  thumbnail: string;
  video: string;
  category: string;
  prompt: string;
  fixedImage?: string; // 可选的固定图片路径
  imageToVideo?: boolean; // 是否为图片转视频模式（用户上传图片而非视频）
}

// 图片分类定义
const getCategoriesWithTranslation = (t: any) => ({
  expression: { name: t('expression'), icon: "" },
  artistic: { name: t('artistic'), icon: "" },
  wearing: { name: t('wearing'), icon: "" },
  anime: { name: t('anime'), icon: "" }
});

// 视频分类定义
const getVideoCategoriesWithTranslation = (t: any) => ({
  effects: { name: t('videoEffects'), icon: "" },
  animation: { name: t('videoAnimation'), icon: "" },
  fantasy: { name: t('videoFantasy'), icon: "" }
});

// 各分类的图片模板数据
const TEMPLATE_DATA = {
  expression: [
    { id: "portrait-1", image: "/figma-designs/portrait/IMAGE-1.jpg", afterImage: "/figma-designs/portrait/IMAGE-1-after.png", category: "laughing", prompt: "让图中的人物大笑" },
    { id: "portrait-2", image: "/figma-designs/portrait/IMAGE-2.jpg", afterImage: "/figma-designs/portrait/IMAGE-2-after.png", category: "serious", prompt: "让图中的人物表情变得严肃" },
    { id: "portrait-3", image: "/figma-designs/portrait/IMAGE-3.jpg", afterImage: "/figma-designs/portrait/IMAGE-3-after.png", category: "smiling", prompt: "让图中的人物表情变得微笑" },
    { id: "portrait-4", image: "/figma-designs/portrait/IMAGE-4.jpg", afterImage: "/figma-designs/portrait/IMAGE-4-after.png", category: "sad", prompt: "让图中的人物表情变得悲伤并流着泪" },
    { id: "portrait-5", image: "/figma-designs/portrait/IMAGE-5.jpg", afterImage: "/figma-designs/portrait/IMAGE-5-after.png", category: "crying", prompt: "让图中的人物表情变成大哭" },
    { id: "portrait-6", image: "/figma-designs/portrait/IMAGE-6.jpg", afterImage: "/figma-designs/portrait/IMAGE-6-after.png", category: "disgusted", prompt: "让图中的人物表情变成厌恶的表情" },
    { id: "portrait-7", image: "/figma-designs/portrait/IMAGE-7.jpg", afterImage: "/figma-designs/portrait/IMAGE-7-after.png", category: "angry", prompt: "让图中的人物表情变成愤怒的表情" },
    { id: "portrait-8", image: "/figma-designs/portrait/IMAGE-8.jpg", afterImage: "/figma-designs/portrait/IMAGE-8-after.png", category: "surprised", prompt: "让图中的人物表情变成惊讶" },
	{ id: "portrait-9", image: "/figma-designs/portrait/IMAGE-9.jpg", afterImage: "/figma-designs/portrait/IMAGE-9-after.png", category: "disappointed", prompt: "让图中的人物表情变成失望" }
  ],
  artistic: [
    { id: "artistic-1", image: "/figma-designs/artistic/IMAGE-1.png", afterImage: "/figma-designs/artistic/IMAGE-1-after.png", category: "removeAcne", prompt: "去掉图中人物脸上的青春痘或雀斑" },
    { id: "artistic-2", image: "/figma-designs/artistic/IMAGE-2.jpg", afterImage: "/figma-designs/artistic/IMAGE-2-after.png", category: "removeGlasses", prompt: "去掉图中人物眼睛上眼镜" },
    { id: "artistic-3", image: "/figma-designs/artistic/IMAGE-3.jpg", afterImage: "/figma-designs/artistic/IMAGE-3-after.png", category: "removeTattoo", prompt: "去掉图中的人物身上所有的纹身痕迹" },
    { id: "artistic-4", image: "/figma-designs/artistic/IMAGE-4.jpg", afterImage: "/figma-designs/artistic/IMAGE-4-after.png", category: "shaveBeard", prompt: "去除图中男人脸上的胡子" },
    { id: "artistic-5", image: "/figma-designs/artistic/IMAGE-5.jpg", afterImage: "/figma-designs/artistic/IMAGE-5-after.png", category: "removeWrinkles", prompt: "去除图中人物脸上的皱纹，使人物变得更年轻" },
    { id: "artistic-6", image: "/figma-designs/artistic/IMAGE-6.jpg", afterImage: "/figma-designs/artistic/IMAGE-6-after.png", category: "makeThinner", prompt: "Make the characters in the picture thinner 50%, and looks like more symmetrical" },
    { id: "artistic-7", image: "/figma-designs/artistic/IMAGE-7.png", afterImage: "/figma-designs/artistic/IMAGE-7-after.png", category: "addMuscle", prompt: "让图中的人物显得非常有肌肉感" },
    { id: "artistic-8", image: "/figma-designs/artistic/IMAGE-8.jpg", afterImage: "/figma-designs/artistic/IMAGE-8-after.png", category: "restorePhoto", prompt: "修复破损的照片，并保持颜色与原照片一致" },
	{ id: "artistic-9", image: "/figma-designs/artistic/IMAGE-9.jpg", afterImage: "/figma-designs/artistic/IMAGE-9-after.png", category: "colorizePhoto", prompt: "给老照片上色，保持光线正常" }  ],
  anime: [
    { id: "anime-1", originalImage1: "/figma-designs/anime/IMAGE-1-source1.png", originalImage2: "/figma-designs/anime/IMAGE-1-source2.jpg", mergedImage: "/figma-designs/anime/IMAGE-1-after.png", category: "kissing", prompt: "让两张图片中的人物拥抱亲吻，两人相对镜头均侧脸，请确保两人的身体比例协调、真实，姿势自然，场景户外，光线自然柔和" },
    { id: "anime-2", originalImage1: "/figma-designs/anime/IMAGE-2-source1.jpg", originalImage2: "/figma-designs/anime/IMAGE-2-source2.jpg", mergedImage: "/figma-designs/anime/IMAGE-2-after.png", category: "groupPhoto", prompt: "让两张图片中的人物合影，请确保两人的身体比例协调、真实，户外场景，光线柔和自然" },
    { id: "anime-3", originalImage1: "/figma-designs/anime/IMAGE-3-source1.jpg", originalImage2: "/figma-designs/anime/IMAGE-3-source2.jpg", mergedImage: "/figma-designs/anime/IMAGE-3-after.png", category: "hugging", prompt: "将两张图片中的人物进行合影，要求男的从后面搂抱着女的，侧身面对镜头，请确保两人的身体比例协调、真实，户外场景，光线柔和自然" },
    { id: "anime-4", originalImage1: "/figma-designs/anime/IMAGE-4-source1.png", originalImage2: "/figma-designs/anime/IMAGE-4-source2.jpg", mergedImage: "/figma-designs/anime/IMAGE-4-after.png", category: "holdingHandsSide", prompt: "将两张图片中的人物进行合影，要求两人间隔一定的距离牵手，两人相对镜头侧向，相互面对着微笑，请确保两人的身体比例协调、真实，姿势自然，户外场景，光线柔和自然" },
    { id: "anime-5", originalImage1: "/figma-designs/anime/IMAGE-5-source1.png", originalImage2: "/figma-designs/anime/IMAGE-5-source2.jpg", mergedImage: "/figma-designs/anime/IMAGE-5-after.png", category: "holdingHandsFront", prompt: "将两张图片中的人物进行合影，要求两人间隔一定的距离牵手，面对镜头微笑，请确保两人的身体比例协调、真实，姿势自然，户外场景，光线柔和自然" },
    { id: "anime-6", originalImage1: "/figma-designs/anime/IMAGE-6-source1.png", originalImage2: "/figma-designs/anime/IMAGE-6-source2.jpg", mergedImage: "/figma-designs/anime/IMAGE-6-after.png", category: "liftAndGaze", prompt: "融合两张图的色彩方案创造和谐的动漫图像" },
    { id: "anime-7", originalImage1: "/figma-designs/anime/IMAGE-7-source1.jpg", originalImage2: "/figma-designs/anime/IMAGE-7-source2.jpg", mergedImage: "/figma-designs/anime/IMAGE-7-after.png", category: "sittingBackToBack", prompt: "将不同时空的动漫元素合并到同一画面" },
    { id: "anime-8", originalImage1: "/figma-designs/anime/IMAGE-8-source1.jpg", originalImage2: "/figma-designs/anime/IMAGE-8-source2.png", mergedImage: "/figma-designs/anime/IMAGE-8-after.png", category: "proposing", prompt: "将两张图片中的人物进行合影，要求男人单膝跪地向女人做出求婚的姿势，两人侧向镜头，都面带微笑，请确保两人的身体比例协调、真实，姿势自然，户外场景，光线柔和自然" },
    { id: "anime-9", originalImage1: "/figma-designs/anime/IMAGE-9-source1.png", originalImage2: "/figma-designs/anime/IMAGE-9-source2.png", mergedImage: "/figma-designs/anime/IMAGE-9-after.png", category: "handshake", prompt: "将两张图片的人物握手，两人均面向镜头，请确保两人的身体比例协调、真实，姿势自然，户外场景，光线柔和自然" }
  ],
  wearing: [
    { id: "wearing-1", originalImage1: "/figma-designs/wearing/IMAGE-1-source1.png", originalImage2: "/figma-designs/wearing/IMAGE-1-source2.png", mergedImage: "/figma-designs/wearing/IMAGE-1-after.png", category: "necklace", prompt: "给其中一张有人脸的图佩戴上项链，项链采用另一张图中的款式，并保持项链与有人脸的图光线一致，让项链看起来很自然地戴在人的脖子上" },
    { id: "wearing-2", originalImage1: "/figma-designs/wearing/IMAGE-2-source1.jpg", originalImage2: "/figma-designs/wearing/IMAGE-2-source2.png", mergedImage: "/figma-designs/wearing/IMAGE-2-after.png", category: "earrings", prompt: "给其中一张有人脸的图佩戴上耳环，耳环采用另一张图中的款式，并保持耳环与有人脸的图光线一致，让耳环看起来很自然地戴在人的耳朵上" },
    { id: "wearing-3", originalImage1: "/figma-designs/wearing/IMAGE-3-source1.jpg", originalImage2: "/figma-designs/wearing/IMAGE-3-source2.png", mergedImage: "/figma-designs/wearing/IMAGE-3-after.png", category: "glasses", prompt: "给其中一张有人脸的图佩戴上眼镜，眼镜采用另一张图中的款式，并保持眼镜与有人脸的图光线一致，让眼镜看起来很自然地戴在人脸上" },
    { id: "wearing-4", originalImage1: "/figma-designs/wearing/IMAGE-4-source1.jpg", originalImage2: "/figma-designs/wearing/IMAGE-4-source2.png", mergedImage: "/figma-designs/wearing/IMAGE-4-after.png", category: "lipstick", prompt: "给其中一张图的女人嘴唇涂上口红，口红采用另一张图中的颜色" },
    { id: "wearing-5", originalImage1: "/figma-designs/wearing/IMAGE-5-source1.jpg", originalImage2: "/figma-designs/wearing/IMAGE-5-source2.png", mergedImage: "/figma-designs/wearing/IMAGE-5-after.png", category: "hat", prompt: "给其中一张有人脸的图佩戴上帽子，帽子采用另一张图中的款式，并保持帽子与有人脸的图光线一致，让帽子看起来很自然地戴在人头上" },
    { id: "wearing-6", originalImage1: "/figma-designs/wearing/IMAGE-6-source1.jpg", originalImage2: "/figma-designs/wearing/IMAGE-6-source2.png", mergedImage: "/figma-designs/wearing/IMAGE-6-after.png", category: "clothing", prompt: "给其中一张有人脸的图换上另一件衣服，另一件采用另一张图中的款式，并保持衣服与有人脸的图光线一致，让衣服看起来很自然地穿在人身上" },
    { id: "wearing-7", originalImage1: "/figma-designs/wearing/IMAGE-7-source1.jpg", originalImage2: "/figma-designs/wearing/IMAGE-7-source2.png", mergedImage: "/figma-designs/wearing/IMAGE-7-after.png", category: "pants", prompt: "给其中一张有人脸的图换上另一条裤子，裤子采用另一张图中的款式，并保持裤子与有人脸的图光线一致，让裤子看起来很自然地穿在人身上" },
    { id: "wearing-8", originalImage1: "/figma-designs/wearing/IMAGE-8-source1.jpg", originalImage2: "/figma-designs/wearing/IMAGE-8-source2.png", mergedImage: "/figma-designs/wearing/IMAGE-8-after.png", category: "shoes", prompt: "给其中一张图中的人的脚上换一双鞋子，鞋子采用另一张图中的款式，并保持鞋子与有周边的图光线一致，让鞋子看起来很自然地穿在人脚上" }
  ],
  landscape: [
    { id: "landscape-1", image: "/figma-designs/landscape/IMAGE-1.png", afterImage: "/figma-designs/landscape/IMAGE-1-after.png", category: "mountains", prompt: "将图片背景替换为壮观的山景，保持人物不变，添加自然光照效果" },
    { id: "landscape-2", image: "/figma-designs/landscape/IMAGE-2.png", afterImage: "/figma-designs/landscape/IMAGE-2-after.png", category: "ocean", prompt: "将图片背景替换为美丽的海景，保持人物不变，添加海风和自然光照效果" },
    { id: "landscape-3", image: "/figma-designs/landscape/IMAGE-3.png", afterImage: "/figma-designs/landscape/IMAGE-3-after.png", category: "forest", prompt: "将图片背景替换为茂密的森林景观，保持人物不变，添加自然绿色光照" },
    { id: "landscape-4", image: "/figma-designs/landscape/IMAGE-4.png", afterImage: "/figma-designs/landscape/IMAGE-4-after.png", category: "city", prompt: "将图片背景替换为现代城市景观，保持人物不变，添加城市灯光效果" },
    { id: "landscape-5", image: "/figma-designs/landscape/IMAGE-5.png", afterImage: "/figma-designs/landscape/IMAGE-5-after.png", category: "sunset", prompt: "将图片背景替换为美丽的日落景色，保持人物不变，添加温暖的黄金时刻光照" },
    { id: "landscape-6", image: "/figma-designs/landscape/IMAGE-6.png", afterImage: "/figma-designs/landscape/IMAGE-6-after.png", category: "countryside", prompt: "将图片背景替换为宁静的田园风光，保持人物不变，添加自然柔和光照" },
    { id: "landscape-7", image: "/figma-designs/landscape/IMAGE-7.png", afterImage: "/figma-designs/landscape/IMAGE-7-after.png", category: "starryNight", prompt: "将图片背景替换为美丽的星空夜景，保持人物不变，添加夜晚光照效果" },
    { id: "landscape-8", image: "/figma-designs/landscape/IMAGE-8.png", afterImage: "/figma-designs/landscape/IMAGE-8-after.png", category: "desert", prompt: "将图片背景替换为广阔的沙漠景观，保持人物不变，添加沙漠特有的光照效果" }
  ],
  abstract: [
    { id: "abstract-1", image: "/figma-designs/abstract/IMAGE-1.png", category: "abstract", prompt: "abstract geometric patterns, modern design, colorful composition" },
    { id: "abstract-2", image: "/figma-designs/abstract/IMAGE-2.png", category: "abstract", prompt: "fluid abstract art, organic shapes, flowing design, dynamic movement" },
    { id: "abstract-3", image: "/figma-designs/abstract/IMAGE-3.png", category: "abstract", prompt: "minimalist abstract, clean lines, simple composition, elegant design" },
    { id: "abstract-4", image: "/figma-designs/abstract/IMAGE-4.png", category: "abstract", prompt: "psychedelic abstract, vibrant colors, surreal patterns, mind-bending design" },
    { id: "abstract-5", image: "/figma-designs/abstract/IMAGE-5.png", category: "abstract", prompt: "fractal abstract art, mathematical beauty, complex patterns, infinite detail" },
    { id: "abstract-6", image: "/figma-designs/abstract/IMAGE-6.png", category: "abstract", prompt: "color field abstract, gradient transitions, atmospheric composition" },
    { id: "abstract-7", image: "/figma-designs/abstract/IMAGE-7.png", category: "abstract", prompt: "textural abstract art, mixed media appearance, tactile visual experience" },
    { id: "abstract-8", image: "/figma-designs/abstract/IMAGE-8.png", category: "abstract", prompt: "digital abstract art, technological aesthetic, futuristic design" }
  ]
};

// 视频模板数据
const VIDEO_TEMPLATE_DATA = {
  effects: [
    { id: "effects-1", thumbnail: "/figma-designs/videos/effects/11-frame1.png", video: "/figma-designs/videos/effects/11.mp4", category: "switchToWinter", prompt: "change the video background to cold snowing scene at half of the video" },
    { id: "effects-2", thumbnail: "/figma-designs/videos/effects/22-frame1.png", video: "/figma-designs/videos/effects/22.mp4", category: "switchToAutumn", prompt: "change the video background to The Autumn forest scene at half of the video" },
    { id: "effects-3", thumbnail: "/figma-designs/videos/effects/33-frame1.png", video: "/figma-designs/videos/effects/33.mp4", category: "switchToSpring", prompt: "change the video background to The prairie full of spring scene at half of the video" },
    { id: "effects-4", thumbnail: "/figma-designs/videos/effects/car_1-frame1.png", video: "/figma-designs/videos/effects/car_1.mp4", category: "switchToSandstorm", prompt: "从视频的第3秒开始将原背景换成沙尘暴背景" },
    { id: "effects-5", thumbnail: "/figma-designs/videos/effects/rain-frame1.png", video: "/figma-designs/videos/effects/rain.mp4", category: "switchToRain", prompt: "将视频从第2秒开始由当前天气切换到下雨天" },
    { id: "effects-6", thumbnail: "/figma-designs/videos/effects/sunset-frame1.png", video: "/figma-designs/videos/effects/sunset.mp4", category: "switchToSunset", prompt: "背景切换到日落" },
    { id: "effects-7", thumbnail: "/figma-designs/videos/effects/ocean-frame1.png", video: "/figma-designs/videos/effects/ocean.mp4", category: "switchToOcean", prompt: "change the video background to deep ocean underwater scene" },
    { id: "effects-8", thumbnail: "/figma-designs/videos/effects/space-frame1.jpg", video: "/figma-designs/videos/effects/space.mp4", category: "switchToSpace", prompt: "change the video background to outer space with stars and galaxies" },
    { id: "effects-9", thumbnail: "/figma-designs/videos/effects/forest-frame1.png", video: "/figma-designs/videos/effects/forest.mp4", category: "switchToForest", prompt: "change the video background to dense mystical forest scene" },
    { id: "effects-10", thumbnail: "/figma-designs/videos/effects/citynight-frame1.png", video: "/figma-designs/videos/effects/citynight.mp4", category: "switchToCityNight", prompt: "change the video background to city night scene with neon lights" },
    { id: "effects-11", thumbnail: "/figma-designs/videos/effects/mountain-frame1.png", video: "/figma-designs/videos/effects/mountain.mp4", category: "switchToMountain", prompt: "change the video background to majestic mountain peaks with clouds" },
    { id: "effects-12", thumbnail: "/figma-designs/videos/effects/fire-frame1.png", video: "/figma-designs/videos/effects/fire.mp4", category: "addFireEffect", prompt: "add dramatic fire effects around the subject" },
    { id: "effects-13", thumbnail: "/figma-designs/videos/effects/lightning-frame1.png", video: "/figma-designs/videos/effects/lightning.mp4", category: "addLightningEffect", prompt: "add lightning effects in the background with storm atmosphere" },
    { id: "effects-14", thumbnail: "/figma-designs/videos/effects/spotlight-frame1.png", video: "/figma-designs/videos/effects/spotlight.mp4", category: "spotlightEffect", prompt: "add mysterious smoke effects flowing around the scene" },
    { id: "effects-15", thumbnail: "/figma-designs/videos/effects/fireworks-frame1.png", video: "/figma-designs/videos/effects/fireworks.mp4", category: "addFireworksEffect", prompt: "add magical glowing particles floating around" },
    { id: "effects-16", thumbnail: "/figma-designs/videos/effects/fireplace-frame1.png", video: "/figma-designs/videos/effects/fireplace.mp4", category: "addFireplace", prompt: "add flowing water effects with realistic physics" },
    { id: "effects-17", thumbnail: "/figma-designs/videos/effects/stockmarket-frame1.png", video: "/figma-designs/videos/effects/stockmarket.mp4", category: "stockMarket", prompt: "add strong wind effects with objects being blown" },
    { id: "effects-18", thumbnail: "/figma-designs/videos/effects/cashflying-frame1.png", video: "/figma-designs/videos/effects/cashflying.mp4", category: "flyingCash", prompt: "add digital glitch effects with distortion" },
    { id: "effects-19", thumbnail: "/figma-designs/videos/effects/dancing-frame1.png", video: "/figma-designs/videos/effects/dancing.mp4", category: "nightclub", prompt: "transform the video into holographic projection style" },
    { id: "effects-20", thumbnail: "/figma-designs/videos/effects/clocking-frame1.png", video: "/figma-designs/videos/effects/clocking.mp4", category: "timeFlowing", prompt: "add epic explosion effects in the background" },
    { id: "effects-21", thumbnail: "/figma-designs/videos/effects/driverpov-frame1.png", video: "/figma-designs/videos/effects/driverpov.mp4", category: "cityElevatedRoad", prompt: "add magical portal effects with swirling energy" },
    { id: "effects-22", thumbnail: "/figma-designs/videos/effects/nightsky-frame1.png", video: "/figma-designs/videos/effects/nightsky.mp4", category: "arcticNightSky", prompt: "create mirror clone effects with multiple versions" },
    { id: "effects-23", thumbnail: "/figma-designs/videos/effects/floatingCloud-frame1.png", video: "/figma-designs/videos/effects/floatingCloud.mp4", category: "valleyMist", prompt: "add time reversal effects with temporal distortion" },
    { id: "effects-24", thumbnail: "/figma-designs/videos/effects/beach-frame1.png", video: "/figma-designs/videos/effects/beach.mp4", category: "sunnyBeach", prompt: "add powerful energy wave effects radiating outward" }
  ],
  animation: [
    { id: "animation-1", thumbnail: "/figma-designs/videos/animation/replace_face_demo-frame1.png", video: "/figma-designs/videos/animation/replace_face_demo.mp4", category: "videoAnimation", prompt: "replace the face in the Video with face in image, The mouth shape and facial expression remain unchanged when speaking" },
    { id: "animation-2", thumbnail: "/figma-designs/videos/animation/replace_face_orign-frame1.png", video: "/figma-designs/videos/animation/replace_face_orign.mp4", category: "videoAnimation", prompt: "3D animation sequence, realistic motion, professional quality" }
  ],
  fantasy: [
    { id: "fantasy-8", thumbnail: "/figma-designs/videos/fantasy/thumbnail-8.jpg", video: "/figma-designs/videos/fantasy/video-8.mp4", category: "petalDissolve", prompt: "将视频中的人物从肩膀和脸部开始以花瓣飞扬的效果消散，肩膀和脸部开始，随着她的手逐渐消散，玫瑰花滑落向下坠落，移出了画面，身形继续一点一点地消失，整个过程流畅自然。" },
	{ id: "fantasy-7", thumbnail: "/figma-designs/videos/fantasy/thumbnail-7.jpg", video: "/figma-designs/videos/fantasy/video-7.mp4", category: "changeClothes", prompt: "将视频中人物穿着换成如图片所展示的衣服" },
	{ id: "fantasy-3", thumbnail: "/figma-designs/videos/fantasy/thumbnail-3.jpg", video: "/figma-designs/videos/fantasy/video-3.mp4", category: "oldPhotoAnimation", prompt: "bring the photo to life with subtle realistic movements, gentle animation effects, make the scene come alive naturally, cinematic quality", imageToVideo: true },
	{ id: "fantasy-1", thumbnail: "/figma-designs/videos/fantasy/thumbnail-1.jpg", video: "/figma-designs/videos/fantasy/video-1.mp4", category: "generateFireballs", prompt: "generate magical fire balls floating around the subject, mystical fire magic effects, fantasy flame elements, cinematic lighting" },
    { id: "fantasy-2", thumbnail: "/figma-designs/videos/fantasy/thumbnail-2.jpg", video: "/figma-designs/videos/fantasy/video-2.mp4", category: "explosion", prompt: "create dramatic explosion effects in the video scene, dynamic blast effects, cinematic destruction", fixedImage: "/figma-designs/videos/fantasy/thumbnail-2.jpg" },
    { id: "fantasy-4", thumbnail: "/figma-designs/videos/fantasy/thumbnail-4.jpg", video: "/figma-designs/videos/fantasy/video-4.mp4", category: "removePeople", prompt: "remove all people in thie Video" },
    { id: "fantasy-5", thumbnail: "/figma-designs/videos/fantasy/thumbnail-5.jpg", video: "/figma-designs/videos/fantasy/video-5.mp4", category: "burningHand", prompt: "Add a special effect to the hand in the video, making it appear as if it is gradually burning." },
    { id: "fantasy-6", thumbnail: "/figma-designs/videos/fantasy/thumbnail-6.jpg", video: "/figma-designs/videos/fantasy/video-6.mp4", category: "changeAngle", prompt: "Change the camera angle to a back view of the person" },
    { id: "fantasy-9", thumbnail: "/figma-designs/videos/fantasy/thumbnail-9.jpg", video: "/figma-designs/videos/fantasy/video-9.mp4", category: "animeStyleVideo", prompt: "将视频转换成动漫风格" },
    { id: "fantasy-10", thumbnail: "/figma-designs/videos/fantasy/thumbnail-10.jpg", video: "/figma-designs/videos/fantasy/video-10.mp4", category: "puppetStyle", prompt: "将视频转换成木偶风格" },
    { id: "fantasy-11", thumbnail: "/figma-designs/videos/fantasy/thumbnail-11.jpg", video: "/figma-designs/videos/fantasy/video-11.mp4", category: "sketchLines", prompt: "将视频转换成简单黑白线条风格" },
    { id: "fantasy-12", thumbnail: "/figma-designs/videos/fantasy/thumbnail-12.jpg", video: "/figma-designs/videos/fantasy/video-12.mp4", category: "clayStyle", prompt: "Transform the video into a claymation style, with all elements appearing as if made from clay." },
    { id: "fantasy-13", thumbnail: "/figma-designs/videos/fantasy/thumbnail-13.jpg", video: "/figma-designs/videos/fantasy/video-13.mp4", category: "plantGrowth", prompt: "视频中的植物逐渐生长，看起来像快进，要求整个植物看起来很自然地快速长高，变得枝繁叶茂" },
    { id: "fantasy-14", thumbnail: "/figma-designs/videos/fantasy/thumbnail-14.jpg", video: "/figma-designs/videos/fantasy/video-14.mp4", category: "mechanicalAnimal", prompt: "将视频中的动物换成是由机械零件组成的模样" },
    { id: "fantasy-15", thumbnail: "/figma-designs/videos/fantasy/thumbnail-15.jpg", video: "/figma-designs/videos/fantasy/video-15.mp4", category: "futureWarrior", prompt: "将视频中的人物变成像未来战士一样的机器人" },

  ],
  product: [
    { id: "product-1", thumbnail: "/figma-designs/videos/product/thumbnail-1.jpg", video: "/figma-designs/videos/product/video-1.mp4", category: "videoProduct", prompt: "elegant product showcase, rotating display, premium presentation" },
    { id: "product-2", thumbnail: "/figma-designs/videos/product/thumbnail-2.jpg", video: "/figma-designs/videos/product/video-2.mp4", category: "videoProduct", prompt: "smartphone commercial style, sleek design focus, modern aesthetics" },
    { id: "product-3", thumbnail: "/figma-designs/videos/product/thumbnail-3.jpg", video: "/figma-designs/videos/product/video-3.mp4", category: "videoProduct", prompt: "luxury watch advertisement, detailed close-up, sophisticated presentation" },
    { id: "product-4", thumbnail: "/figma-designs/videos/product/thumbnail-4.jpg", video: "/figma-designs/videos/product/video-4.mp4", category: "videoProduct", prompt: "food commercial style, appetizing presentation, professional food photography" },
    { id: "product-5", thumbnail: "/figma-designs/videos/product/thumbnail-5.jpg", video: "/figma-designs/videos/product/video-5.mp4", category: "videoProduct", prompt: "cosmetics advertisement, beauty product showcase, elegant styling" },
    { id: "product-6", thumbnail: "/figma-designs/videos/product/thumbnail-6.jpg", video: "/figma-designs/videos/product/video-6.mp4", category: "videoProduct", prompt: "car commercial style, dynamic vehicle showcase, automotive excellence" },
    { id: "product-7", thumbnail: "/figma-designs/videos/product/thumbnail-7.jpg", video: "/figma-designs/videos/product/video-7.mp4", category: "videoProduct", prompt: "fashion clothing display, model showcase, style presentation" },
    { id: "product-8", thumbnail: "/figma-designs/videos/product/thumbnail-8.jpg", video: "/figma-designs/videos/product/video-8.mp4", category: "videoProduct", prompt: "jewelry commercial, sparkling gems, luxury accessories" },
    { id: "product-9", thumbnail: "/figma-designs/videos/product/thumbnail-9.jpg", video: "/figma-designs/videos/product/video-9.mp4", category: "videoProduct", prompt: "sports equipment showcase, athletic gear, performance focus" },
    { id: "product-10", thumbnail: "/figma-designs/videos/product/thumbnail-10.jpg", video: "/figma-designs/videos/product/video-10.mp4", category: "videoProduct", prompt: "electronic gadget presentation, tech innovation, modern lifestyle" },
    { id: "product-11", thumbnail: "/figma-designs/videos/product/thumbnail-11.jpg", video: "/figma-designs/videos/product/video-11.mp4", category: "videoProduct", prompt: "furniture showcase, home decor, interior design aesthetics" },
    { id: "product-12", thumbnail: "/figma-designs/videos/product/thumbnail-12.jpg", video: "/figma-designs/videos/product/video-12.mp4", category: "videoProduct", prompt: "beverage commercial, refreshing drinks, lifestyle marketing" },
    { id: "product-13", thumbnail: "/figma-designs/videos/product/thumbnail-13.jpg", video: "/figma-designs/videos/product/video-13.mp4", category: "videoProduct", prompt: "perfume advertisement, fragrance essence, sensual presentation" },
    { id: "product-14", thumbnail: "/figma-designs/videos/product/thumbnail-14.jpg", video: "/figma-designs/videos/product/video-14.mp4", category: "videoProduct", prompt: "toy commercial, playful presentation, child-friendly appeal" },
    { id: "product-15", thumbnail: "/figma-designs/videos/product/thumbnail-15.jpg", video: "/figma-designs/videos/product/video-15.mp4", category: "videoProduct", prompt: "kitchen appliance demo, culinary tools, cooking lifestyle" },
    { id: "product-16", thumbnail: "/figma-designs/videos/product/thumbnail-16.jpg", video: "/figma-designs/videos/product/video-16.mp4", category: "videoProduct", prompt: "book publishing showcase, literary presentation, knowledge appeal" },
    { id: "product-17", thumbnail: "/figma-designs/videos/product/thumbnail-17.jpg", video: "/figma-designs/videos/product/video-17.mp4", category: "videoProduct", prompt: "gaming console commercial, entertainment focus, tech excitement" },
    { id: "product-18", thumbnail: "/figma-designs/videos/product/thumbnail-18.jpg", video: "/figma-designs/videos/product/video-18.mp4", category: "videoProduct", prompt: "musical instrument showcase, artistic expression, creative inspiration" },
    { id: "product-19", thumbnail: "/figma-designs/videos/product/thumbnail-19.jpg", video: "/figma-designs/videos/product/video-19.mp4", category: "videoProduct", prompt: "outdoor gear presentation, adventure equipment, exploration spirit" },
    { id: "product-20", thumbnail: "/figma-designs/videos/product/thumbnail-20.jpg", video: "/figma-designs/videos/product/video-20.mp4", category: "videoProduct", prompt: "health supplement commercial, wellness focus, healthy lifestyle" },
    { id: "product-21", thumbnail: "/figma-designs/videos/product/thumbnail-21.jpg", video: "/figma-designs/videos/product/video-21.mp4", category: "videoProduct", prompt: "art supplies showcase, creative tools, artistic inspiration" },
    { id: "product-22", thumbnail: "/figma-designs/videos/product/thumbnail-22.jpg", video: "/figma-designs/videos/product/video-22.mp4", category: "videoProduct", prompt: "pet product commercial, animal care, loving companion focus" },
    { id: "product-23", thumbnail: "/figma-designs/videos/product/thumbnail-23.jpg", video: "/figma-designs/videos/product/video-23.mp4", category: "videoProduct", prompt: "cleaning product demo, household efficiency, spotless results" },
    { id: "product-24", thumbnail: "/figma-designs/videos/product/thumbnail-24.jpg", video: "/figma-designs/videos/product/video-24.mp4", category: "videoProduct", prompt: "travel gear showcase, journey essentials, adventure preparation" }
  ],
  expression: [
    { id: "expression-1", thumbnail: "/figma-designs/videos/expression/thumbnail-1.jpg", video: "/figma-designs/videos/expression/video-1.mp4", category: "videoExpression", prompt: "joyful laughter expression, happy emotions, genuine smile" },
    { id: "expression-2", thumbnail: "/figma-designs/videos/expression/thumbnail-2.jpg", video: "/figma-designs/videos/expression/video-2.mp4", category: "videoExpression", prompt: "surprised expression, wide eyes, shock and amazement" },
    { id: "expression-3", thumbnail: "/figma-designs/videos/expression/thumbnail-3.jpg", video: "/figma-designs/videos/expression/video-3.mp4", category: "videoExpression", prompt: "contemplative thinking, thoughtful expression, deep in thought" },
    { id: "expression-4", thumbnail: "/figma-designs/videos/expression/thumbnail-4.jpg", video: "/figma-designs/videos/expression/video-4.mp4", category: "videoExpression", prompt: "confident pose, determined expression, strong personality" },
    { id: "expression-5", thumbnail: "/figma-designs/videos/expression/thumbnail-5.jpg", video: "/figma-designs/videos/expression/video-5.mp4", category: "videoExpression", prompt: "playful wink, flirtatious expression, charming personality" },
    { id: "expression-6", thumbnail: "/figma-designs/videos/expression/thumbnail-6.jpg", video: "/figma-designs/videos/expression/video-6.mp4", category: "videoExpression", prompt: "sad crying expression, emotional tears, heartfelt sorrow" },
    { id: "expression-7", thumbnail: "/figma-designs/videos/expression/thumbnail-7.jpg", video: "/figma-designs/videos/expression/video-7.mp4", category: "videoExpression", prompt: "angry face, intense fury, dramatic rage" },
    { id: "expression-8", thumbnail: "/figma-designs/videos/expression/thumbnail-8.jpg", video: "/figma-designs/videos/expression/video-8.mp4", category: "videoExpression", prompt: "fearful expression, scared eyes, anxious worry" },
    { id: "expression-9", thumbnail: "/figma-designs/videos/expression/thumbnail-9.jpg", video: "/figma-designs/videos/expression/video-9.mp4", category: "videoExpression", prompt: "romantic loving gaze, tender affection, warm intimacy" },
    { id: "expression-10", thumbnail: "/figma-designs/videos/expression/thumbnail-10.jpg", video: "/figma-designs/videos/expression/video-10.mp4", category: "videoExpression", prompt: "disgusted reaction, repulsed face, strong aversion" },
    { id: "expression-11", thumbnail: "/figma-designs/videos/expression/thumbnail-11.jpg", video: "/figma-designs/videos/expression/video-11.mp4", category: "videoExpression", prompt: "bored expression, uninterested face, weary tiredness" },
    { id: "expression-12", thumbnail: "/figma-designs/videos/expression/thumbnail-12.jpg", video: "/figma-designs/videos/expression/video-12.mp4", category: "videoExpression", prompt: "excited enthusiasm, energetic joy, vibrant excitement" },
    { id: "expression-13", thumbnail: "/figma-designs/videos/expression/thumbnail-13.jpg", video: "/figma-designs/videos/expression/video-13.mp4", category: "videoExpression", prompt: "confused puzzlement, bewildered face, questioning look" },
    { id: "expression-14", thumbnail: "/figma-designs/videos/expression/thumbnail-14.jpg", video: "/figma-designs/videos/expression/video-14.mp4", category: "videoExpression", prompt: "shy embarrassment, bashful blush, timid modesty" },
    { id: "expression-15", thumbnail: "/figma-designs/videos/expression/thumbnail-15.jpg", video: "/figma-designs/videos/expression/video-15.mp4", category: "videoExpression", prompt: "proud satisfaction, accomplished smile, victorious triumph" },
    { id: "expression-16", thumbnail: "/figma-designs/videos/expression/thumbnail-16.jpg", video: "/figma-designs/videos/expression/video-16.mp4", category: "videoExpression", prompt: "jealous envy, bitter resentment, competitive rivalry" },
    { id: "expression-17", thumbnail: "/figma-designs/videos/expression/thumbnail-17.jpg", video: "/figma-designs/videos/expression/video-17.mp4", category: "videoExpression", prompt: "peaceful serenity, calm tranquility, meditative stillness" },
    { id: "expression-18", thumbnail: "/figma-designs/videos/expression/thumbnail-18.jpg", video: "/figma-designs/videos/expression/video-18.mp4", category: "videoExpression", prompt: "mischievous grin, playful trouble, cheeky humor" },
    { id: "expression-19", thumbnail: "/figma-designs/videos/expression/thumbnail-19.jpg", video: "/figma-designs/videos/expression/video-19.mp4", category: "videoExpression", prompt: "sleepy drowsiness, tired yawn, relaxed fatigue" },
    { id: "expression-20", thumbnail: "/figma-designs/videos/expression/thumbnail-20.jpg", video: "/figma-designs/videos/expression/video-20.mp4", category: "videoExpression", prompt: "intense concentration, focused determination, laser-sharp attention" },
    { id: "expression-21", thumbnail: "/figma-designs/videos/expression/thumbnail-21.jpg", video: "/figma-designs/videos/expression/video-21.mp4", category: "videoExpression", prompt: "nostalgic remembrance, wistful memory, bittersweet reflection" },
    { id: "expression-22", thumbnail: "/figma-designs/videos/expression/thumbnail-22.jpg", video: "/figma-designs/videos/expression/video-22.mp4", category: "videoExpression", prompt: "hopeful optimism, bright anticipation, positive expectation" },
    { id: "expression-23", thumbnail: "/figma-designs/videos/expression/thumbnail-23.jpg", video: "/figma-designs/videos/expression/video-23.mp4", category: "videoExpression", prompt: "suspicious doubt, skeptical questioning, cautious wariness" },
    { id: "expression-24", thumbnail: "/figma-designs/videos/expression/thumbnail-24.jpg", video: "/figma-designs/videos/expression/video-24.mp4", category: "videoExpression", prompt: "dramatic performance, theatrical emotion, artistic expression" }
  ]
};


export default function GeneratePage() {
  const [selectedTemplate, setSelectedTemplate] = useState<FigmaTemplate | null>(null);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedImage1, setUploadedImage1] = useState<File | null>(null); // 动漫合成第一张图
  const [uploadedImage2, setUploadedImage2] = useState<File | null>(null); // 动漫合成第二张图
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof TEMPLATE_DATA>("expression");
  const [selectedVideoCategory, setSelectedVideoCategory] = useState<keyof typeof VIDEO_TEMPLATE_DATA>("effects");
  const [selectedVideoTemplate, setSelectedVideoTemplate] = useState<VideoTemplate | null>(null);
  const [generationType, setGenerationType] = useState<'image' | 'shortvideo' | 'longvideo'>('image'); // 新增：生成类型
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);
  const [longVideoPrompt, setLongVideoPrompt] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [longVideoAttachedImages, setLongVideoAttachedImages] = useState<File[]>([]);
  // 编辑规划状态
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    videoUrl?: string;
    progress?: number;
    status?: 'generating' | 'completed' | 'failed';
    shotPlan?: any; // 镜头规划数据
    attachedImages?: string[]; // 附加图片URL
    originalPrompt?: string; // 原始提示词
  }>>([]);
  
  // 角色迁移功能相关状态
  const [showFaceSwapModal, setShowFaceSwapModal] = useState(false);
  const [faceSwapVideo, setFaceSwapVideo] = useState<File | null>(null);
  const [faceSwapImage, setFaceSwapImage] = useState<File | null>(null);
  const [showFaceSwapResult, setShowFaceSwapResult] = useState(false);
  const [faceSwapResult, setFaceSwapResult] = useState<{
    originalVideo: string;
    swappedVideo: string;
    jobId?: string;
  } | null>(null);

  // Community 相关状态
  const [shareLoading, setShareLoading] = useState(false);
  const [communityRefreshKey, setCommunityRefreshKey] = useState(0);

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

  // 换衣服功能相关状态
  const [showChangeClothesModal, setShowChangeClothesModal] = useState(false);
  const [changeClothesVideo, setChangeClothesVideo] = useState<File | null>(null);
  const [changeClothesImage, setChangeClothesImage] = useState<File | null>(null);
  
  const { user, loading, refresh } = useAuthStatus();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  // Helper function to get translated category
  // Now category is already a translation key, so we can directly translate it
  const getTranslatedCategory = (category: string) => {
    return t(category as any) || category;
  };

  // Check for OAuth success and refresh auth state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const oauthSuccess = document.cookie.includes('oauth-success=1');
      if (oauthSuccess) {
        // Clear the flag
        document.cookie = 'oauth-success=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';

        // Test API call with credentials
        console.log('🧪 Testing API call with credentials after OAuth...');
        fetch('/api/user/stats', { credentials: 'include' })
          .then(res => {
            console.log('🧪 Direct API test result:', {
              status: res.status,
              ok: res.ok,
              headers: Object.fromEntries(res.headers.entries())
            });
            return res.json();
          })
          .then(data => console.log('🧪 Direct API data:', data))
          .catch(err => console.error('🧪 Direct API error:', err));

        // Force refresh auth status
        refresh();
      }
    }
  }, [refresh]);

  // 处理从Community生成同款跳转过来的情况
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const action = urlParams.get('action');

      if (action === 'remake') {
        console.log('🎬 Detected remake action from Community');

        // 读取sessionStorage中的数据
        const remakeDataStr = sessionStorage.getItem('remakeData');
        const remakeImageStr = sessionStorage.getItem('remakeImage');

        if (remakeDataStr && remakeImageStr) {
          try {
            const remakeData = JSON.parse(remakeDataStr);
            const imageData = JSON.parse(remakeImageStr);

            console.log('📦 Remake data loaded:', remakeData);

            // 将dataUrl转换回File对象
            fetch(imageData.dataUrl)
              .then(res => res.blob())
              .then(blob => {
                const imageFile = new File([blob], imageData.name, { type: imageData.type });
                const videoFile = new File([], 'community-video.mp4', { type: 'video/mp4' });

                // 设置角色迁移的数据
                setFaceSwapImage(imageFile);
                setFaceSwapVideo(videoFile as any); // 用一个占位的File对象

                // 清除sessionStorage
                sessionStorage.removeItem('remakeData');
                sessionStorage.removeItem('remakeImage');

                // 清除URL参数
                window.history.replaceState({}, '', '/generate');

                // 自动触发角色迁移流程
                setTimeout(() => {
                  handleRemakeFaceSwap(remakeData.videoUrl, imageFile);
                }, 500);
              });
          } catch (error) {
            console.error('❌ Failed to parse remake data:', error);
            sessionStorage.removeItem('remakeData');
            sessionStorage.removeItem('remakeImage');
          }
        }
      }
    }
  }, []);

  // 使用ref存储interval，避免重复创建
  const faceSwapMonitorInterval = useRef<NodeJS.Timeout | null>(null);
  // 永久停止标志，防止分享后重新开始监听
  const shouldStopMonitoring = useRef<boolean>(false);

  // 监听角色迁移任务完成
  useEffect(() => {
    // 检查永久停止标志
    if (shouldStopMonitoring.current) {
      console.log("⛔ Monitoring permanently stopped by flag, skipping...");
      if (faceSwapMonitorInterval.current) {
        clearInterval(faceSwapMonitorInterval.current);
        faceSwapMonitorInterval.current = null;
      }
      return;
    }

    if (!currentJobId || currentJobId === "generating" || !faceSwapResult || !faceSwapResult.originalVideo) {
      // 清理已有的interval
      if (faceSwapMonitorInterval.current) {
        console.log("🧹 Clearing face swap monitor due to missing conditions");
        clearInterval(faceSwapMonitorInterval.current);
        faceSwapMonitorInterval.current = null;
      }
      return;
    }

    console.log("🔍 Starting face swap result monitoring for job:", currentJobId);

    const checkFaceSwapResult = async () => {
      try {
        const response = await fetch(`/api/jobs/pending`, {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.ok) {
          const jobs = await response.json();
          console.log("📋 Checking jobs for face swap result:", jobs.length);
          
          const currentJob = jobs.find((job: any) => job.id === currentJobId);
          
          if (currentJob) {
            console.log("🎯 Found current job:", {
              id: currentJob.id,
              status: currentJob.status,
              hasResultUrl: !!currentJob.result_url
            });
            
            if (currentJob.status === 'done' && currentJob.result_url) {
              console.log("✅ Face swap completed successfully:", currentJob.result_url);

              // 检查是否应该停止监听（用户已分享）
              if (shouldStopMonitoring.current) {
                console.log("⛔ shouldStopMonitoring is true, not showing result dialog");
                return true; // 停止监听，不更新状态
              }

              // 只有当faceSwapResult还存在时才更新和显示
              setFaceSwapResult(prev => {
                if (!prev) {
                  console.log("⚠️ faceSwapResult is null, skipping update");
                  return null;
                }
                return {
                  ...prev,
                  swappedVideo: currentJob.result_url,
                  jobId: currentJob.id
                };
              });

              // 只有当faceSwapResult存在时才显示弹窗
              if (faceSwapResult) {
                setShowFaceSwapResult(true);
              }
              // setShowModal(false); // 关闭生成进度弹窗 - 不自动关闭，让用户手动关闭
              return true; // 表示任务已完成，停止监听
            } else if (currentJob.status === 'failed') {
              console.error("❌ Face swap failed: Unknown error");
              alert(t('faceSwapFailed'));
              // setShowModal(false); // 不自动关闭，让用户手动关闭
              return true; // 停止监听
            }
          } else {
            console.warn("⚠️ Job not found in pending jobs list");
          }
        } else {
          console.error("❌ Failed to fetch pending jobs:", response.status, response.statusText);
        }
      } catch (error) {
        console.error("❌ Error checking face swap result:", error);
      }
      return false; // 继续监听
    };

    // 清理已有的interval（如果有）
    if (faceSwapMonitorInterval.current) {
      clearInterval(faceSwapMonitorInterval.current);
      faceSwapMonitorInterval.current = null;
    }

    // 立即检查一次
    checkFaceSwapResult().then(completed => {
      if (completed) return;

      // 定期检查任务状态
      faceSwapMonitorInterval.current = setInterval(async () => {
        const completed = await checkFaceSwapResult();
        if (completed && faceSwapMonitorInterval.current) {
          clearInterval(faceSwapMonitorInterval.current);
          faceSwapMonitorInterval.current = null;
        }
      }, 3000); // 3秒间隔
    });

    // 清理函数
    return () => {
      console.log("🧹 Cleaning up face swap monitoring for job:", currentJobId);
      if (faceSwapMonitorInterval.current) {
        clearInterval(faceSwapMonitorInterval.current);
        faceSwapMonitorInterval.current = null;
      }
    };
  }, [currentJobId, faceSwapResult]);
  const { hasPendingTasks, pendingCount, pendingJobs, clearPendingJobs, refreshPendingJobs } = usePendingTasks();
  const {
    totalImageGenerations,
    totalVideoGenerations,
    imageQuota,
    videoQuota,
    remainingImageGenerations,
    remainingVideoGenerations,
    remainingCredits,
    planName
  } = useUserStats();
  const router = useRouter();
  const searchParams = useSearchParams();
  
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

  // 处理电影制作图片附件上传
  const handleLongVideoImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxFileSize = 10 * 1024 * 1024; // 10MB limit
    const maxImages = 10; // 最多10张图片
    
    // 检查当前已有图片数量
    if (longVideoAttachedImages.length >= maxImages) {
      alert(`最多只能上传${maxImages}张图片`);
      return;
    }
    
    const validFiles: File[] = [];
    
    // 处理多个文件
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // 检查文件类型
      if (!allowedTypes.includes(file.type)) {
        alert(`文件 "${file.name}" 格式不支持，仅支持 JPG、PNG、WEBP 格式的图片`);
        continue;
      }
      
      // 检查文件大小
      if (file.size > maxFileSize) {
        alert(`文件 "${file.name}" 大小超过 10MB 限制`);
        continue;
      }
      
      // 检查总数量限制
      if (longVideoAttachedImages.length + validFiles.length >= maxImages) {
        alert(`最多只能上传${maxImages}张图片`);
        break;
      }
      
      validFiles.push(file);
    }
    
    // 添加有效的文件
    if (validFiles.length > 0) {
      setLongVideoAttachedImages(prev => [...prev, ...validFiles]);
    }
    
    // 清空input以便重复选择相同文件
    event.target.value = '';
  };

  // 移除附加的图片
  const removeLongVideoImage = (index: number) => {
    setLongVideoAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  // 处理电影制作生成（第一阶段：规划）
  const handleLongVideoGenerate = async () => {
    if (!longVideoPrompt.trim()) {
      alert(t('pleaseEnterVideoDescription'));
      return;
    }
    
    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();
    
    // 添加用户消息
    const userMessage = {
      id: userMessageId,
      type: 'user' as const,
      content: longVideoPrompt,
      timestamp: new Date()
    };
    
    // 添加助手规划中消息
    const assistantMessage = {
      id: assistantMessageId,
      type: 'assistant' as const,
      content: t('analyzingRequirements'),
      timestamp: new Date(),
      status: 'generating' as const,
      progress: 0
    };
    
    setChatMessages(prev => [...prev, userMessage, assistantMessage]);
    setIsGenerating(true);
    
    // 保存当前输入和附件供后续使用
    const currentPrompt = longVideoPrompt;
    const currentImages = [...longVideoAttachedImages];
    
    // 清空输入框
    setLongVideoPrompt('');
    setLongVideoAttachedImages([]);
    
    try {
      // 上传附加的图片
      const attachedImageUrls: string[] = [];
      
      if (currentImages.length > 0) {
        setChatMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: t('uploadingAttachedImages'), progress: 10 }
            : msg
        ));
        
        for (let i = 0; i < currentImages.length; i++) {
          const image = currentImages[i];
          
          const formData = new FormData();
          formData.append("file", image);
          
          const uploadResponse = await fetch("/api/upload/image", {
            method: "POST",
            body: formData,
          });
          
          if (!uploadResponse.ok) {
            throw new Error(t('imageUploadFailedWithNumber', { number: i + 1 }));
          }
          
          const uploadData = await uploadResponse.json();
          attachedImageUrls.push(uploadData.url);
        }
      }
      
      // 请求镜头规划
      setChatMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: t('generatingShotPlan'), progress: 30 }
          : msg
      ));
      
      const response = await fetch("/api/jobs/long-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: currentPrompt,
          attachedImages: attachedImageUrls,
          provider: "gemini",
          model: "veo3.1", // Runway的VEO3.1模型名称
          action: "plan"
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || errorData.error || t('shotPlanFailed');
        throw new Error(errorMessage);
      }
      
      const planData = await response.json();
      console.log("📋 Shot plan received:", planData.shotPlan);
      
      // 临时禁用翻译功能，直接使用英文镜头规划
      let finalShotPlan = planData.shotPlan;
      console.log("📋 Using English shot plan directly (translation disabled)");
      
      // 更新助手消息显示镜头规划结果
      setChatMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { 
              ...msg, 
              content: t('shotPlanCompleted'),
              status: 'completed' as const,
              progress: 100,
              shotPlan: finalShotPlan,
              attachedImages: attachedImageUrls,
              originalPrompt: currentPrompt
            }
          : msg
      ));
      
      setIsGenerating(false);
      
    } catch (error) {
      console.error("❌ Shot planning failed:", error);
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      
      setChatMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { 
              ...msg, 
              content: t('shotPlanFailedWithError', { error: errorMessage }), 
              status: 'failed' as const,
              progress: 0 
            }
          : msg
      ));
      
      setIsGenerating(false);
    }
  };

  // 用户确认镜头规划并开始生成视频
  const handleConfirmShotPlan = async (messageId: string, shotPlan: any, attachedImages: string[], originalPrompt: string) => {
    // 确保发送给视频生成模型的是原始英文内容
    const englishShotPlan = {
      ...shotPlan,
      shots: shotPlan.shots.map((shot: any) => ({
        ...shot,
        prompt: shot.originalPrompt || shot.prompt // 使用原始英文描述
      }))
    };
    const assistantMessageId = crypto.randomUUID();
    
    // 添加新的助手消息显示生成进度
    const generatingMessage = {
      id: assistantMessageId,
      type: 'assistant' as const,
      content: t('generatingMovie'),
      timestamp: new Date(),
      status: 'generating' as const,
      progress: 0
    };
    
    setChatMessages(prev => [...prev, generatingMessage]);
    setIsGenerating(true);
    
    try {
      // 调用生成阶段API
      const response = await fetch("/api/jobs/long-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: originalPrompt,
          attachedImages: attachedImages,
          provider: "gemini",
          model: "veo3.1", // Runway的VEO3.1模型名称
          action: "generate",
          shotPlan: englishShotPlan // 使用英文版本的镜头规划
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || errorData.error || t('videoGenerationFailed');
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setCurrentJobId(data.id);
      
      console.log("🎬 Long video generation job created:", data.id);
      
      // 开始轮询任务状态
      await pollLongVideoJobStatusForChat(data.id, assistantMessageId);
      
    } catch (error) {
      console.error("❌ Long video generation failed:", error);
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      
      setChatMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { 
              ...msg, 
              content: t('videoGenerationFailedWithError', { error: errorMessage }), 
              status: 'failed' as const,
              progress: 0 
            }
          : msg
      ));
      
      setIsGenerating(false);
    }
  };

  // 用户修改镜头规划
  const handleEditShotPlan = (messageId: string, newShotPlan: any) => {
    setChatMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, shotPlan: newShotPlan }
        : msg
    ));
  };

  // 自动调整输入框高度
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // 重置高度以获取正确的scrollHeight
      textarea.style.height = 'auto';
      // 设置最小高度80px，最大高度200px
      const minHeight = 80;
      const maxHeight = 200;
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      
      // 设置高度
      textarea.style.height = `${newHeight}px`;
      
      // 如果内容超过最大高度，显示滚动条
      if (scrollHeight > maxHeight) {
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.overflowY = 'hidden';
      }
    }
  };

  // 处理输入框内容变化
  const handleLongVideoPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLongVideoPrompt(e.target.value);
    // 延迟调整高度，确保内容已更新
    setTimeout(adjustTextareaHeight, 0);
  };

  // 初始化时调整高度
  useEffect(() => {
    adjustTextareaHeight();
  }, [longVideoPrompt]);


  // 镜头描述组件（支持编辑模式）
  const ShotDescriptionComponent = ({ 
    shot, 
    index, 
    isEditing = false, 
    onShotChange 
  }: { 
    shot: any; 
    index: number; 
    isEditing?: boolean;
    onShotChange?: (shotId: number, field: string, value: any) => void;
  }) => {
    const [tempPrompt, setTempPrompt] = useState(shot.prompt);
    const [tempDuration, setTempDuration] = useState(shot.duration_s);
    const [tempCamera, setTempCamera] = useState(shot.camera);

    const handlePromptChange = (value: string) => {
      setTempPrompt(value);
      if (onShotChange) {
        onShotChange(shot.id, 'prompt', value);
      }
    };

    const handleDurationChange = (value: number) => {
      setTempDuration(value);
      if (onShotChange) {
        onShotChange(shot.id, 'duration_s', value);
      }
    };

    const handleCameraChange = (value: string) => {
      setTempCamera(value);
      if (onShotChange) {
        onShotChange(shot.id, 'camera', value);
      }
    };

    if (isEditing) {
      return (
        <div className="bg-white rounded-lg p-4 border border-blue-300 border-2 w-full">
          <div className="flex items-start justify-between mb-3 w-full">
            <span className="font-medium text-sm text-gray-700">
              Shot {shot.id}
            </span>
            <div className="flex gap-2 items-center">
              <select
                value={tempDuration}
                onChange={(e) => handleDurationChange(parseInt(e.target.value))}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
              >
                <option value={2}>2s</option>
                <option value={5}>5s</option>
                <option value={8}>8s</option>
              </select>
            </div>
          </div>

          <div className="w-full">
            <label className="text-xs text-gray-500 block mb-1">{t('shotDescription')}</label>
            <textarea
              value={tempPrompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              className="w-full text-base border border-gray-300 rounded px-4 py-3 focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
              rows={4}
              placeholder={t('describeShotContent')}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200 w-full">
        <div className="flex items-start justify-between mb-2 w-full">
          <span className="font-medium text-sm text-gray-700">
            Shot {shot.id}
          </span>
          <div className="flex gap-2 text-xs text-gray-500">
            <span>{shot.duration_s}s</span>
            <span>·</span>
            <span>{shot.camera}</span>
          </div>
        </div>
        
        <div className="text-base text-gray-7000 leading-relaxed">
          <p className="text-base text-gray-7000 whitespace-pre-wrap">
            {shot.prompt}
          </p>
        </div>
      </div>
    );
  };

  // 编辑规划相关函数
  const handleEditPlan = (messageId: string) => {
    setIsEditingPlan(true);
    setEditingMessageId(messageId);
  };

  const handleCancelEdit = () => {
    setIsEditingPlan(false);
    setEditingMessageId(null);
  };

  const handleShotChange = (messageId: string, shotId: number, field: string, value: any) => {
    setChatMessages(prev => prev.map(msg => 
      msg.id === messageId && msg.shotPlan 
        ? {
            ...msg,
            shotPlan: {
              ...msg.shotPlan,
              shots: msg.shotPlan.shots.map((shot: any) =>
                shot.id === shotId
                  ? { ...shot, [field]: value }
                  : shot
              ),
              total_seconds: field === 'duration_s' 
                ? msg.shotPlan.shots.reduce((sum: number, shot: any) => 
                    sum + (shot.id === shotId ? value : shot.duration_s), 0)
                : msg.shotPlan.total_seconds
            }
          }
        : msg
    ));
  };

  const handleSaveEdit = (messageId: string) => {
    setIsEditingPlan(false);
    setEditingMessageId(null);
    
    // 找到编辑的消息
    const editedMessage = chatMessages.find(msg => msg.id === messageId);
    if (editedMessage && editedMessage.shotPlan) {
      // 更新消息内容，显示编辑完成
      setChatMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: t('shotPlanUpdated') }
          : msg
      ));
    }
  };
  
  // 为聊天界面轮询电影制作任务状态
  const pollLongVideoJobStatusForChat = async (jobId: string, messageId: string) => {
    const maxAttempts = 120; // 最多等待10分钟
    let attempts = 0;
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/jobs/long-video?jobId=${jobId}`);
        
        if (!response.ok) {
          throw new Error(t('getTaskStatusFailed'));
        }
        
        const jobData = await response.json();
        console.log(`📊 Long video job ${jobId} status:`, jobData.status, `${jobData.progress}%`);
        
        // 更新聊天消息的进度
        setChatMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { 
                ...msg, 
                content: jobData.message || jobData.currentStep || t('makingMovie'),
                progress: jobData.progress || 0
              }
            : msg
        ));
        
        if (jobData.status === 'done') {
          console.log("🎉 Long video generation completed!");
          
          // 更新聊天消息为完成状态
          setChatMessages(prev => prev.map(msg =>
            msg.id === messageId
              ? {
                  ...msg,
                  content: t('movieCompleted'),
                  status: 'completed' as const,
                  progress: 100,
                  videoUrl: jobData.result_url
                }
              : msg
          ));
          
          setIsGenerating(false);
          return;
        } else if (jobData.status === 'failed') {
          throw new Error(t('movieProductionFailed'));
        } else if (jobData.status === 'processing' || jobData.status === 'queued') {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000); // 5秒后重试
          } else {
            throw new Error(t('movieProductionTimeout'));
          }
        }
      } catch (error) {
        console.error("❌ Polling error:", error);
        const errorMessage = error instanceof Error ? error.message : t('unknownError');

        // 更新聊天消息为错误状态
        setChatMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? {
                ...msg,
                content: `${t('movieProductionError')}：${errorMessage}`,
                status: 'failed' as const,
                progress: 0
              }
            : msg
        ));
        
        setIsGenerating(false);
      }
    };
    
    poll();
  };
  
  // 原有的轮询函数（保留用于弹窗模式）
  const pollLongVideoJobStatus = async (jobId: string) => {
    const maxAttempts = 120; // 最多等待10分钟
    let attempts = 0;
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/jobs/long-video?jobId=${jobId}`);
        
        if (!response.ok) {
          throw new Error(t('getTaskStatusFailed'));
        }
        
        const jobData = await response.json();
        console.log(`📊 Long video job ${jobId} status:`, jobData.status, `${jobData.progress}%`);
        
        if (jobData.status === 'done') {
          console.log("🎉 Long video generation completed!");
          setIsGenerating(false);
          return;
        } else if (jobData.status === 'failed') {
          throw new Error(t('movieProductionFailed'));
        } else if (jobData.status === 'processing' || jobData.status === 'queued') {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000); // 5秒后重试
          } else {
            throw new Error(t('movieProductionTimeout'));
          }
        }
      } catch (error) {
        console.error("❌ Polling error:", error);
        const errorMessage = error instanceof Error ? error.message : t('unknownError');
        alert(`${t('movieProductionError')}: ${errorMessage}`);
        setIsGenerating(false);
        // setShowModal(false); // 不自动关闭，让用户手动关闭
      }
    };
    
    poll();
  };
  
  // 获取翻译后的分类
  const categories = getCategoriesWithTranslation(t);
  const videoCategories = getVideoCategoriesWithTranslation(t);
  
  // 获取当前分类的模板并更新分类名称
  const currentTemplates = TEMPLATE_DATA[selectedCategory].map(template => ({
    ...template,
    category: template.category
  }));

  // 获取当前视频分类的模板并更新分类名称
  const currentVideoTemplates = VIDEO_TEMPLATE_DATA[selectedVideoCategory].map(template => ({
    ...template,
    category: template.category
  }));
  
  // 添加调试信息
  console.log('🔍 Generate page state:', { 
    user: user?.email || 'No user', 
    loading,
    hasUser: !!user 
  });

  const handleTemplateClick = (template: FigmaTemplate) => {
    // 只有在切换不同模板时才清空图片状态
    if (selectedTemplate?.id !== template.id) {
      // 清除图片状态，避免不同模板间的状态混淆
      setUploadedImage(null);
      setUploadedImage1(null);
      setUploadedImage2(null);
    }

    setSelectedTemplate(template);
    setSelectedVideoTemplate(null); // 清除视频模板选择
    setShowUploadDialog(true);
  };

  const handleVideoTemplateClick = (template: VideoTemplate) => {
    console.log("🎥 Video template clicked:", template.category, "selectedVideoCategory:", selectedVideoCategory);
    
    // 只有在切换不同模板时才清空文件状态
    if (selectedVideoTemplate?.id !== template.id) {
      // 清除文件状态，避免不同模板间的状态混淆
      setUploadedImage(null);
      setUploadedVideo(null);
      setVideoDuration(null);
    }

    setSelectedVideoTemplate(template);
    setSelectedTemplate(null); // 清除图片模板选择

    // 如果是换衣服功能，打开专门的换衣服弹窗
    if (template.category === "changeClothes") {
      setShowChangeClothesModal(true);
    } else {
      setShowUploadDialog(true);
    }
    
    console.log("🎥 After template click - generationType:", 'shortvideo', "selectedVideoCategory:", selectedVideoCategory);
  };

  const handleGenerate = async () => {
    // ✅ 前端计划检查：短视频生成需要专业档或至尊档，电影制作需要至尊档
    if (generationType === 'shortvideo') {
      const currentPlan = planName || 'free';
      const supportsVideo = currentPlan === 'professional' || currentPlan === 'enterprise';

      if (!supportsVideo) {
        console.log('[Plan Check] Short video generation blocked - current plan:', currentPlan);
        setShowUpgradeDialog(true);
        return;
      }
    }

    if (generationType === 'longvideo') {
      const currentPlan = planName || 'free';
      const supportsLongVideo = currentPlan === 'enterprise';

      if (!supportsLongVideo) {
        console.log('[Plan Check] Long video generation blocked - current plan:', currentPlan);
        setShowUpgradeDialog(true);
        return;
      }
    }

    // 检查是否选择了模板
    const currentTemplate = generationType === 'image' ? selectedTemplate : selectedVideoTemplate;

    // 检查上传文件
    if (generationType === 'image') {
      if (!currentTemplate) {
        alert("请选择模板");
        return;
      }

      // 动漫类别和穿戴类别检查两张图片
      if ((selectedCategory === 'anime' || selectedCategory === 'wearing') && (!uploadedImage1 || !uploadedImage2)) {
        const message = selectedCategory === 'anime' ? "请上传两张原始图片进行合成" :
                       "请上传两张图片进行穿戴搭配";
        alert(message);
        return;
      }
      // 其他类别检查单张图片
      if (selectedCategory !== 'anime' && selectedCategory !== 'wearing' && !uploadedImage) {
        alert("请选择模板和上传人像照片");
        return;
      }
    }
    
    if (generationType === 'shortvideo') {
      // 检查是否为图片转视频模式
      const videoTemplate = currentTemplate as VideoTemplate | undefined;
      if (videoTemplate?.imageToVideo) {
        // 图片转视频需要图片文件
        if (!uploadedImage) {
          alert("请上传一张照片进行视频生成");
          return;
        }
      } else {
        // 对于特效和奇幻类别，需要上传视频；其他类别上传图片
        const needsVideo = selectedVideoCategory === 'effects' || selectedVideoCategory === 'fantasy';
        const requiredFile = needsVideo ? uploadedVideo : uploadedImage;
        const requiredFileType = needsVideo ? "视频" : "参考图片";
        
        if (!currentTemplate || !requiredFile) {
          alert(`请选择视频模板和上传${requiredFileType}`);
          return;
        }
      }
    }
    
    if (generationType === 'longvideo') {
      await handleLongVideoGenerate();
      return;
    }

    setIsGenerating(true);
    setShowUploadDialog(false);

    // 立即显示对话框，使用临时ID
    setCurrentJobId("generating");
    setShowModal(true);
    
    try {
      let referenceUrl = "";
      let referenceUrl2 = ""; // 动漫类别的第二张图片

      const videoTemplate = currentTemplate as VideoTemplate | undefined;
      if (generationType === 'image' || (generationType === 'shortvideo' && (selectedVideoCategory !== 'effects' && selectedVideoCategory !== 'fantasy')) || (generationType === 'shortvideo' && videoTemplate?.imageToVideo)) {
        if (generationType === 'image' && (selectedCategory === 'anime' || selectedCategory === 'wearing')) {
          // 动漫类别和穿戴类别：上传两张图片
          const categoryName = selectedCategory === 'anime' ? 'anime' : 'wearing';
          console.log(`📁 Uploading first ${categoryName} image...`);
          const formData1 = new FormData();
          formData1.append("file", uploadedImage1!);

          const uploadResponse1 = await fetch("/api/upload/image", {
            method: "POST",
            body: formData1,
          });

          if (!uploadResponse1.ok) {
            const uploadError1 = await uploadResponse1.json();
            throw new Error(`第一张图片上传失败: ${uploadError1.error}`);
          }

          const { url: url1 } = await uploadResponse1.json();
          referenceUrl = url1;

          console.log(`📁 Uploading second ${categoryName} image...`);
          const formData2 = new FormData();
          formData2.append("file", uploadedImage2!);

          const uploadResponse2 = await fetch("/api/upload/image", {
            method: "POST",
            body: formData2,
          });

          if (!uploadResponse2.ok) {
            const uploadError2 = await uploadResponse2.json();
            throw new Error(`第二张图片上传失败: ${uploadError2.error}`);
          }

          const { url: url2 } = await uploadResponse2.json();
          referenceUrl2 = url2;
        } else {
          // 其他类别：上传单张图片
          console.log("📁 Uploading reference image...");
          const formData = new FormData();
          formData.append("file", uploadedImage!);

          const uploadResponse = await fetch("/api/upload/image", {
            method: "POST",
            body: formData,
          });

          if (!uploadResponse.ok) {
            const uploadError = await uploadResponse.json();
            throw new Error(`图片上传失败: ${uploadError.error}`);
          }

          const { url } = await uploadResponse.json();
          referenceUrl = url;
        }
      } else {
        // 上传视频（特效和奇幻类别）
        console.log("📁 Uploading reference video...");
        const formData = new FormData();
        formData.append("file", uploadedVideo!);
        
        const uploadResponse = await fetch("/api/upload/video", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json();
          throw new Error(`视频上传失败: ${uploadError.error}`);
        }
        
        const { url } = await uploadResponse.json();
        referenceUrl = url;
      }

      console.log("✅ Reference file uploaded:", referenceUrl);

      // 构建生成提示
      let basePrompt;
      if (generationType === 'image' && currentTemplate) {
        basePrompt = currentTemplate.prompt;
      } else if (generationType === 'shortvideo' && currentTemplate) {
        const videoTpl = currentTemplate as VideoTemplate;
        const fileType = (selectedVideoCategory === 'effects' || (selectedVideoCategory === 'fantasy' && !videoTpl.imageToVideo)) ? "video" : "reference image";
        basePrompt = `${currentTemplate.prompt}, based on uploaded ${fileType}, create dynamic video content, high quality, professional result`;
      } else {
        basePrompt = "Generate high quality content based on uploaded reference";
      }
      
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: generationType === 'shortvideo' ? 'runway' : 'gemini',
          type: generationType === 'shortvideo' ? 'video' : generationType,
          prompt: basePrompt,
          referenceImageUrl: referenceUrl,
          referenceImageUrl2: selectedCategory === 'anime' && generationType === 'image' ? referenceUrl2 : undefined,
          template_id: currentTemplate?.id,
          videoDuration: generationType === 'shortvideo' && selectedVideoCategory === 'effects' ? videoDuration : undefined,
          fixedImagePath: generationType === 'shortvideo' && 'fixedImage' in currentTemplate ? currentTemplate.fixedImage : undefined,
          imageToVideo: generationType === 'shortvideo' && videoTemplate?.imageToVideo ? true : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentJobId(data.id);

        // 如果是同步模式且已有结果，弹窗会自动显示完成状态
        if (data.status === 'done' && data.result_url) {
          console.log("✅ 同步生成完成，弹窗将显示结果");
        } else {
          console.log("⏳ 异步任务已开始，弹窗将显示进度");
        }
      } else {
        const error = await response.json();
        // 优先显示 message 字段，如果没有则显示 error 字段
        const errorMessage = error.message || error.error || "生成失败，请稍后重试";
        alert(`生成失败: ${errorMessage}`);
        setShowModal(false); // 失败时关闭modal
      }
    } catch (error) {
      console.error("Generation failed:", error);
      const errorMessage = error instanceof Error ? error.message : "网络错误，请稍后重试";
      alert(errorMessage);
      setShowModal(false); // 错误时关闭modal
    } finally {
      setIsGenerating(false);
    }
  };

  // 角色迁移处理函数
  const handleFaceSwap = async () => {
    // ✅ 前端计划检查：角色迁移需要专业档或企业档
    const currentPlan = planName || 'free';
    const supportsVideo = currentPlan === 'professional' || currentPlan === 'enterprise';

    if (!supportsVideo) {
      console.log('[Plan Check] Face swap blocked - current plan:', currentPlan);
      setShowFaceSwapModal(false);
      setShowUpgradeDialog(true);
      return;
    }

    if (!faceSwapVideo || !faceSwapImage) {
      alert("请上传视频和图片");
      return;
    }

    // 重置监听停止标志，允许新任务的监听
    shouldStopMonitoring.current = false;
    console.log("🔄 Reset shouldStopMonitoring flag for new face swap task");

    setShowFaceSwapModal(false);
    setIsGenerating(true);

    // 立即显示对话框，使用临时ID
    setCurrentJobId("generating");
    setShowModal(true);

    try {
      // 上传视频文件
      console.log("📁 Uploading face swap video...");
      const videoFormData = new FormData();
      videoFormData.append("file", faceSwapVideo);
      
      // 添加处理参数
      if ((faceSwapVideo as any).needsProcessing) {
        videoFormData.append("needsProcessing", "true");
        if ((faceSwapVideo as any).originalDuration > 10) {
          videoFormData.append("targetDuration", "10");
        }
        if ((faceSwapVideo as any).targetResolution) {
          videoFormData.append("targetResolution", JSON.stringify((faceSwapVideo as any).targetResolution));
        }
      }
      
      const videoUploadResponse = await fetch("/api/upload/video", {
        method: "POST",
        body: videoFormData,
      });

      if (!videoUploadResponse.ok) {
        const videoError = await videoUploadResponse.json();
        throw new Error(`视频上传失败: ${videoError.error}`);
      }
      
      const { url: videoUrl } = await videoUploadResponse.json();
      console.log("✅ Video uploaded:", videoUrl);

      // 上传图片文件
      console.log("📁 Uploading face swap image...");
      const imageFormData = new FormData();
      imageFormData.append("file", faceSwapImage);
      
      const imageUploadResponse = await fetch("/api/upload/image", {
        method: "POST",
        body: imageFormData,
      });

      if (!imageUploadResponse.ok) {
        const imageError = await imageUploadResponse.json();
        throw new Error(`图片上传失败: ${imageError.error}`);
      }
      
      const { url: imageUrl } = await imageUploadResponse.json();
      console.log("✅ Image uploaded:", imageUrl);

      // 调用角色迁移API
      console.log("🔄 Starting face swap...");
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "video",
          prompt: "Just replace the face in the video with the face in the image, leaving the rest of the video unchanged",
          referenceImageUrl: imageUrl,  // 角色迁移的目标人脸图片
          referenceVideoUrl: videoUrl,  // 原始视频
          provider: "runway",
          model: "act_two",
          duration: 10,
          ratio: "1280:720"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || errorData.error || "角色迁移请求失败";
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("✅ Face swap job result:", result);

      const jobId = result.id || result.jobId;

      // 检查任务是否已经同步完成
      if (result.status === "done" && result.result_url) {
        // 任务已经完成，直接显示结果
        console.log("🎉 Face swap completed immediately:", result.result_url);
        setFaceSwapResult({
          originalVideo: videoUrl,
          swappedVideo: result.result_url,
          jobId: jobId
        });
        setShowFaceSwapResult(true);
        // setShowModal(false); // 不自动关闭，让用户手动关闭
      } else {
        // 任务还在处理中，需要轮询等待
        console.log("⏳ Face swap job queued, will wait for completion:", jobId);
        setCurrentJobId(jobId);
        // 设置原始视频URL到结果状态中
        setFaceSwapResult({
          originalVideo: videoUrl,
          swappedVideo: '',
          jobId: jobId
        });
      }

    } catch (error) {
      console.error("❌ Face swap failed:", error);
      alert((error as Error).message || "角色迁移失败，请重试");
      setShowModal(false);
    } finally {
      setIsGenerating(false);
    }
  };

  // 换衣服处理函数
  const handleChangeClothes = async () => {
    // ✅ 前端计划检查：换衣服需要专业档或企业档
    const currentPlan = planName || 'free';
    const supportsVideo = currentPlan === 'professional' || currentPlan === 'enterprise';

    if (!supportsVideo) {
      console.log('[Plan Check] Change clothes blocked - current plan:', currentPlan);
      setShowChangeClothesModal(false);
      setShowUpgradeDialog(true);
      return;
    }

    if (!changeClothesVideo || !changeClothesImage) {
      alert(t('uploadVideoAndClothesImage'));
      return;
    }

    setShowChangeClothesModal(false);
    setIsGenerating(true);

    // 立即显示对话框，使用临时ID
    setCurrentJobId("generating");
    setShowModal(true);

    try {
      // 上传视频文件
      console.log("📁 Uploading video for clothes change...");
      const videoFormData = new FormData();
      videoFormData.append("file", changeClothesVideo);
      
      // 添加处理参数
      if ((changeClothesVideo as any).needsProcessing) {
        videoFormData.append("needsProcessing", "true");
        if ((changeClothesVideo as any).originalDuration > 10) {
          videoFormData.append("targetDuration", "10");
        }
        if ((changeClothesVideo as any).targetResolution) {
          videoFormData.append("targetResolution", JSON.stringify((changeClothesVideo as any).targetResolution));
        }
      }
      
      const videoUploadResponse = await fetch("/api/upload/video", {
        method: "POST",
        body: videoFormData,
      });

      if (!videoUploadResponse.ok) {
        const videoError = await videoUploadResponse.json();
        throw new Error(`视频上传失败: ${videoError.error}`);
      }
      
      const { url: videoUrl } = await videoUploadResponse.json();
      console.log("✅ Video uploaded:", videoUrl);

      // 上传衣服图片文件
      console.log("📁 Uploading clothes image...");
      const imageFormData = new FormData();
      imageFormData.append("file", changeClothesImage);
      
      const imageUploadResponse = await fetch("/api/upload/image", {
        method: "POST",
        body: imageFormData,
      });

      if (!imageUploadResponse.ok) {
        const imageError = await imageUploadResponse.json();
        throw new Error(`衣服图片上传失败: ${imageError.error}`);
      }
      
      const { url: imageUrl } = await imageUploadResponse.json();
      console.log("✅ Clothes image uploaded:", imageUrl);

      // 调用换衣服API
      console.log("🔄 Starting clothes change...");
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "video",
          prompt: selectedVideoTemplate?.prompt || "将视频中人物穿着换成如图片所展示的衣服",
          referenceImageUrl: imageUrl,  // 衣服图片
          referenceVideoUrl: videoUrl,  // 原始视频
          provider: "runway",
          model: "gen3",
          duration: 10,
          ratio: "1280:720"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || errorData.error || "换衣服请求失败";
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("✅ Change clothes job result:", result);

      const jobId = result.id || result.jobId;
      setCurrentJobId(jobId);

      // 检查任务是否已经同步完成
      if (result.status === "done" && result.result_url) {
        console.log("🎉 Clothes change completed immediately:", result.result_url);
      } else {
        console.log("⏳ Clothes change job queued, will wait for completion:", jobId);
      }

    } catch (error) {
      console.error("❌ Clothes change failed:", error);
      alert((error as Error).message || "换衣服失败，请重试");
      setShowModal(false);
    } finally {
      setIsGenerating(false);
      // 清空上传的文件
      setChangeClothesVideo(null);
      setChangeClothesImage(null);
    }
  };

  // Community生成同款处理函数（直接使用视频URL，无需上传）
  const handleRemakeFaceSwap = async (videoUrl: string, imageFile: File) => {
    // 重置监听停止标志，允许新任务的监听
    shouldStopMonitoring.current = false;
    console.log("🔄 Reset shouldStopMonitoring flag for remake task");

    // 设置为短视频生成类型，确保弹窗显示正确
    setGenerationType('shortvideo');
    setIsGenerating(true);

    // 立即显示对话框，使用临时ID
    setCurrentJobId("generating");
    setShowModal(true);

    try {
      // 上传图片文件
      console.log("📁 Uploading face image for remake...");
      const imageFormData = new FormData();
      imageFormData.append("file", imageFile);

      const imageUploadResponse = await fetch("/api/upload/image", {
        method: "POST",
        body: imageFormData,
      });

      if (!imageUploadResponse.ok) {
        const imageError = await imageUploadResponse.json();
        throw new Error(`图片上传失败: ${imageError.error}`);
      }

      const { url: imageUrl } = await imageUploadResponse.json();
      console.log("✅ Image uploaded:", imageUrl);

      // 调用角色迁移API，直接使用Community视频URL
      console.log("🔄 Starting remake with Community video...");
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "video",
          prompt: "Replace the face in the video with the face in the image, maintaining the original video's style and motion",
          referenceImageUrl: imageUrl,  // 用户上传的人像图片
          referenceVideoUrl: videoUrl,  // Community作品视频URL
          provider: "runway",
          model: "act_two",
          duration: 10,
          ratio: "1280:720"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || errorData.error || "生成同款失败";
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("✅ Remake job result:", result);

      const jobId = result.id || result.jobId;

      // 检查任务是否已经同步完成
      if (result.status === "done" && result.result_url) {
        // 任务已经完成，直接显示结果
        console.log("🎉 Remake completed immediately:", result.result_url);
        setFaceSwapResult({
          originalVideo: videoUrl,
          swappedVideo: result.result_url,
          jobId: jobId
        });
        setShowFaceSwapResult(true);
      } else {
        // 任务还在处理中，需要轮询等待
        console.log("⏳ Remake job queued, will wait for completion:", jobId);
        setCurrentJobId(jobId);
        // 设置原始视频URL到结果状态中
        setFaceSwapResult({
          originalVideo: videoUrl,
          swappedVideo: '',
          jobId: jobId
        });
      }

    } catch (error) {
      console.error("❌ Remake failed:", error);
      alert((error as Error).message || "生成同款失败，请重试");
      setShowModal(false);
    } finally {
      setIsGenerating(false);
    }
  };

  // 分享到Community功能
  const handleShareToCommunity = async () => {
    if (!faceSwapResult?.swappedVideo || !faceSwapResult?.jobId) {
      alert("没有可分享的视频");
      return;
    }

    setShareLoading(true);
    try {
      console.log('[Share] Sending share request...');
      const response = await fetch('/api/community/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: faceSwapResult.jobId,
          videoUrl: faceSwapResult.swappedVideo,
          thumbnailUrl: faceSwapResult.originalVideo, // 使用原视频作为缩略图
          title: '角色迁移作品'
        })
      });

      console.log('[Share] Response status:', response.status, response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('[Share] Success response:', result);

        // 永久停止监听，防止重新开始
        shouldStopMonitoring.current = true;
        console.log("🛑 Set shouldStopMonitoring flag to permanently stop monitoring");

        // 清理interval
        if (faceSwapMonitorInterval.current) {
          clearInterval(faceSwapMonitorInterval.current);
          faceSwapMonitorInterval.current = null;
        }

        // 清理状态，防止轮询重新打开弹窗
        setFaceSwapResult(null);
        setCurrentJobId('');

        // 关闭所有弹窗
        setShowFaceSwapResult(false);
        setShowModal(false);

        // 切换到角色迁移页面（animation分类）
        setGenerationType('shortvideo');
        setSelectedVideoCategory('animation');

        // 触发Community组件刷新
        setCommunityRefreshKey(prev => prev + 1);

        // 不再显示成功提示弹窗，直接关闭即可
        console.log("✅ Share completed successfully, dialogs closed");
      } else {
        const error = await response.json();
        console.error('[Share] Error response:', error);
        alert(error.error || "分享失败，请重试");
      }
    } catch (error) {
      console.error('Error sharing to community:', error);
      alert("分享失败，请重试");
    } finally {
      setShareLoading(false);
    }
  };

  const canGenerate = (() => {
    if (generationType === 'longvideo') return longVideoPrompt.trim().length > 0; // 电影制作需要输入内容

    const currentTemplate = generationType === 'image' ? selectedTemplate : selectedVideoTemplate;
    if (!currentTemplate || isGenerating) return false;

    if (generationType === 'image') {
      // 动漫类别和穿戴类别需要两张图片
      if (selectedCategory === 'anime' || selectedCategory === 'wearing') {
        return !!(uploadedImage1 && uploadedImage2);
      }
      // 其他类别需要一张图片
      return !!uploadedImage;
    } else if (generationType === 'shortvideo') {
      // 短视频生成：检查是否为特殊的图片转视频模式
      const videoTpl = currentTemplate as VideoTemplate | undefined;
      if (videoTpl?.imageToVideo) {
        return !!uploadedImage; // 图片转视频需要图片
      }
      // 特效和奇幻类别需要视频文件，其他类别需要图片文件
      const needsVideo = selectedVideoCategory === 'effects' || selectedVideoCategory === 'fantasy';
      return needsVideo ? !!uploadedVideo : !!uploadedImage;
    }

    return false;
  })();

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </div>
    );
  }

  // 如果确认未登录，跳转到首页（首页会显示登录弹窗）
  if (!loading && !user) {
    console.log('🔄 No user detected, redirecting to homepage');
    window.location.replace('/');
    return null;
  }

  // 如果还在加载中，显示loading
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <span className="ml-2">检查登录状态...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
        {/* 新的顶部导航栏 */}
        <div className="flex items-center justify-between mb-8">
          {/* Logo */}
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <h1 className="text-2xl font-bold text-gray-900 cursor-pointer">Monna AI</h1>
          </Link>
          
          {/* 右侧按钮组 */}
          <div className="flex items-center space-x-2">
            {/* Pricing 按钮 */}
            <div className="bg-white h-9 rounded-lg shadow-md px-4 flex items-center hover:bg-gray-100 transition-colors">
              <span className="font-medium text-sm text-gray-900" style={{ fontFamily: 'Inter, Noto Sans, sans-serif' }}>
                <Link href="/pricing">{t('pricing')}</Link>
              </span>
            </div>

            {/* 用户信息下拉菜单 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:opacity-80">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-orange-600 text-white font-semibold">
                      {getUserInitial(user)}
                    </AvatarFallback>
                  </Avatar>
                  {/* 红点提示：有待处理任务时显示 */}
                  {hasPendingTasks && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                      {pendingCount}
                    </span>
                  )}
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
                {/* 待处理任务提示 */}
                {hasPendingTasks && (
                  <div className="text-xs text-orange-600 mt-2 flex items-center justify-between">
                    <div className="flex items-center">
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      有 {pendingCount} 个任务正在生成中
                    </div>
                    <button
                      onClick={clearPendingJobs}
                      className="text-xs text-gray-500 hover:text-red-500 underline ml-2"
                      title="清理任务状态"
                    >
                      清理
                    </button>
                  </div>
                )}
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
          </div>
        </div>

        {/* 生成类型切换 */}
        <div className="text-center mb-8">
          <Tabs value={generationType} onValueChange={(value: string) => setGenerationType(value as 'image' | 'shortvideo' | 'longvideo')} className="w-full">
            <div className="flex flex-col items-center space-y-4">
              <TabsList className="grid w-full max-w-3xl grid-cols-3">
                <TabsTrigger value="image" className="flex items-center space-x-2">
                  <Image className="h-4 w-4" />
                  <span>{t('imageGeneration')}</span>
                </TabsTrigger>
                <TabsTrigger value="shortvideo" className="flex items-center space-x-2">
                  <Video className="h-4 w-4" />
                  <span>{t('shortVideoGeneration')}</span>
                </TabsTrigger>
                <TabsTrigger value="longvideo" className="flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span>{t('movieProduction')}</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="image" className="w-full space-y-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {t('createAIImage')}
                  </h1>
                  <p className="text-gray-600 max-w-xl mx-auto">
                    {t('selectDifferentStyles')}
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="shortvideo" className="w-full space-y-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {t('createShortVideo')}
                  </h1>
                  <p className="text-gray-600 max-w-xl mx-auto">
                    {t('selectShortVideoStyles')}
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="longvideo" className="w-full space-y-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {t('createMovieOrAd')}
                  </h1>
                  <p className="text-gray-600 max-w-xl mx-auto">
                    {t('createMovieOrAdDesc')}
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* 根据生成类型显示不同内容 */}
        {generationType === 'image' && (
          <>
            {/* 分类选择标签 */}
            <div className="w-full mb-6">
              <div className="flex flex-wrap justify-center gap-2 md:gap-4">
                {Object.entries(categories).map(([key, category]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key as keyof typeof TEMPLATE_DATA)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                      selectedCategory === key
                        ? 'bg-orange-600 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                    }`}
                  >
                    <span>{category.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 图片模板网格 */}
            <div className="w-full mb-8">
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                {currentTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="group cursor-pointer"
                    onClick={() => handleTemplateClick(template)}
                  >
                    <div className="relative overflow-hidden rounded-lg border-2 border-transparent hover:border-orange-500 transition-all duration-300 bg-white shadow-md hover:shadow-lg">
                      {/* 动漫类别和穿戴类别显示两张原始图和一张合并图 */}
                      {(selectedCategory === 'anime' || selectedCategory === 'wearing') && 'originalImage1' in template && 'originalImage2' in template && 'mergedImage' in template ? (
                        <div className="w-full h-96 p-2">
                          {/* 上方两张原始图 */}
                          <div className="flex gap-1 h-28">
                            <div className="flex-1 relative overflow-hidden rounded bg-gray-50 flex items-center justify-center">
                              <img
                                src={template.originalImage1}
                                className="max-w-full max-h-full object-contain"
                                alt="原始图1"
                              />
                            </div>
                            <div className="flex-1 relative overflow-hidden rounded bg-gray-50 flex items-center justify-center">
                              <img
                                src={template.originalImage2}
                                className="max-w-full max-h-full object-contain"
                                alt="原始图2"
                              />
                            </div>
                          </div>

                          {/* 箭头指示区域 */}
                          <div className="relative flex justify-center items-center h-12">
                            {/* 左侧45度箭头 */}
                            <div className="absolute left-1/4 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                              <svg className="w-10 h-10 text-black transform rotate-45" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M2 10h16l-4-4v3H2v2h12v3l4-4z" strokeWidth="2"/>
                              </svg>
                            </div>

                            {/* 右侧45度箭头 */}
                            <div className="absolute right-1/4 top-1/2 transform translate-x-1/2 -translate-y-1/2">
                              <svg className="w-10 h-10 text-black transform -rotate-45 scale-x-[-1]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M2 10h16l-4-4v3H2v2h12v3l4-4z" strokeWidth="2"/>
                              </svg>
                            </div>
                          </div>

                          {/* 下方合并图 */}
                          <div className="h-52 relative overflow-hidden rounded bg-gray-50 flex items-center justify-center">
                            <img
                              src={template.mergedImage}
                              className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                              alt="合并效果图"
                            />
                          </div>
                        </div>
                      ) : (selectedCategory === 'expression' || selectedCategory === 'artistic') && 'afterImage' in template && template.afterImage ? (
                        <div className="w-full h-96">
                          <ImageComparisonSlider
                            beforeImage={template.image}
                            afterImage={template.afterImage}
                            beforeLabel={t('original') || '原图'}
                            afterLabel={t('aiGenerated') || 'AI生成'}
                            autoPlay={true}
                            className="w-full h-full"
                          />
                        </div>
                      ) : (
                        <>
                          <img
                            src={template.image}
                            className="w-full h-96 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          
                          {/* 悬停遮罩层 */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-end justify-center pb-24">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
                                <p className="text-sm font-medium text-gray-900">{t('generateSimilar')}</p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                      
                      {/* 图片信息 */}
                      <div className="p-3">
                        <p className="text-xs text-gray-500">{getTranslatedCategory(template.category)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 短视频生成区域 */}
        {generationType === 'shortvideo' && (
          <>
            {/* 视频分类选择标签 */}
            <div className="w-full mb-6">
              <div className="flex flex-wrap justify-center gap-2 md:gap-4">
                {Object.entries(videoCategories).map(([key, category]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedVideoCategory(key as keyof typeof VIDEO_TEMPLATE_DATA)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                      selectedVideoCategory === key
                        ? 'bg-orange-600 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                    }`}
                  >
                    <span>{category.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 视频模板网格 - 为animation分类创建特殊布局 */}
            <div className="w-full mb-8">
              {selectedVideoCategory === 'animation' ? (
                /* Face swap page layout */
                <div className="max-w-6xl mx-auto">
                  {/* Face swap demo video */}
                  <div className="flex flex-col items-center mb-8">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('faceSwapEffectDemo')}</h3>
                    <div className="relative w-full max-w-md bg-gray-100 rounded-lg overflow-hidden shadow-lg">
                      <div className="aspect-[16/9] bg-gray-200 flex items-center justify-center">
                        <video
                          src="/figma-designs/videos/animation/character_switch_demo.mp4"
                          className="w-full h-full object-cover"
                          controls
                          muted
                          playsInline
                          poster="/figma-designs/videos/animation/character_switch_demo-frame1.png"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2 text-center">{t('clickToViewFaceSwapEffect')}</p>
                  </div>

                  {/* Start face swap button */}
                  <div className="flex justify-center mb-8">
                    <Button
                      onClick={() => setShowFaceSwapModal(true)}
                      className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors duration-200"
                      size="lg"
                    >
                      {t('faceSwap')}
                    </Button>
                  </div>

                  {/* Monna AI Community - Direct display of community videos */}
                  <div className="mt-12 border-t border-gray-200 pt-8">
                    <div className="mb-8 text-center">
                      <h2 className="text-4xl md:text-5xl font-black mb-3" style={{
                        color: '#c5f82a',
                        textShadow: '0 0 20px rgba(197, 248, 42, 0.5), 0 0 40px rgba(197, 248, 42, 0.3)',
                        letterSpacing: '0.05em'
                      }}>
                        MONNA AI COMMUNITY
                      </h2>
                      <p className="text-sm text-gray-500">
                        {t('exploreFaceSwapCreations')}
                      </p>
                    </div>
                    <CommunityGrid refreshTrigger={communityRefreshKey} sortBy="latest" />
                  </div>
                </div>
              ) : (
                /* 其他分类的标准网格布局 */
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                {currentVideoTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="group cursor-pointer"
                    onClick={() => handleVideoTemplateClick(template)}
                    onMouseEnter={() => setHoveredVideoId(template.id)}
                    onMouseLeave={() => setHoveredVideoId(null)}
                  >
                    <div className="relative overflow-hidden rounded-lg border-2 border-transparent hover:border-orange-500 transition-all duration-300 bg-white shadow-md hover:shadow-lg">
                      {/* 视频预览区域 */}
                      <div className="relative w-full h-96">
                        {hoveredVideoId === template.id ? (
                          <video
                            src={template.video}
                            className="w-full h-full object-cover"
                            autoPlay
                            muted
                            loop
                            playsInline
                          />
                        ) : (
                          <img
                            src={template.thumbnail}
                            alt={template.category}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        )}
                        
                        {/* 播放图标覆盖层 */}
                        {hoveredVideoId !== template.id && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black/50 rounded-full p-3">
                              <Video className="h-8 w-8 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                      
                        {/* 悬停遮罩层 - 只在非animation分类显示 */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-end justify-center pb-24">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-sm font-medium text-gray-900">{t('generateSimilar')}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* 视频信息 */}
                      <div className="p-3">
                        <p className="text-xs text-gray-500">{getTranslatedCategory(template.category)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </>
        )}
        
                {/* 电影制作聊天对话界面 */}
        {generationType === 'longvideo' && (
          <div className="w-full max-w-6xl mx-auto h-[70vh] flex flex-col">
            {/* 聊天消息区域 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {chatMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Video className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium mb-2">{t('startCreatingMovieOrAd')}</p>
                    <p className="text-sm">{t('describeVideoContent')}</p>
                  </div>
                </div>
              ) : (
                chatMessages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`${message.shotPlan ? 'max-w-[98%]' : 'max-w-[100%]'} rounded-lg px-4 py-3 ${
                      message.type === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white border border-gray-200'
                    }`}>
                      <div className="text-sm">{message.content}</div>
                      
                      {/* 助手消息的进度条 */}
                      {message.type === 'assistant' && message.status === 'generating' && (
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${message.progress || 0}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {message.progress || 0}% 完成
                          </div>
                        </div>
                      )}
                      
                      {/* 镜头规划显示和确认 */}
                      {message.type === 'assistant' && message.status === 'completed' && message.shotPlan && !message.videoUrl && (
                        <div className="mt-3 w-full">
                          <div className="bg-gray-50 rounded-lg p-4 w-full">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-800">
                                {currentLanguage === 'zh' ? '镜头规划' : 
                                 currentLanguage === 'ja' ? 'ショットプラン' : 
                                 'Shot Plan'}
                              </h4>
                              <span className="text-xs text-gray-500">
                                {currentLanguage === 'zh' ? 
                                  `总时长: ${message.shotPlan.total_seconds}秒 | 共${message.shotPlan.shots?.length || 0}个镜头` :
                                 currentLanguage === 'ja' ? 
                                  `総時間: ${message.shotPlan.total_seconds}秒 | ${message.shotPlan.shots?.length || 0}ショット` :
                                  `Total: ${message.shotPlan.total_seconds}s | ${message.shotPlan.shots?.length || 0} shots`
                                }
                              </span>
                            </div>
                            
                            <div className="space-y-3 max-h-96 overflow-y-auto w-full">
                              {message.shotPlan.shots?.map((shot: any, index: number) => (
                                <ShotDescriptionComponent 
                                  key={shot.id} 
                                  shot={shot} 
                                  index={index}
                                  isEditing={isEditingPlan && editingMessageId === message.id}
                                  onShotChange={(shotId, field, value) => 
                                    handleShotChange(message.id, shotId, field, value)
                                  }
                                />
                              ))}
                            </div>
                            
                            <div className="flex gap-3 mt-4">
                              {isEditingPlan && editingMessageId === message.id ? (
                                <>
                                  <button
                                    onClick={() => handleSaveEdit(message.id)}
                                    className="bg-green-500 hover:bg-green-600 text-white px-45 py-2 rounded-lg text-sm font-medium transition-colors"
                                  >
                                    {currentLanguage === 'zh' ? '保存编辑' : 
                                     currentLanguage === 'ja' ? '編集を保存' : 
                                     'Save Edit'}
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="px-45 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                  >
                                    {currentLanguage === 'zh' ? '取消' : 
                                     currentLanguage === 'ja' ? 'キャンセル' : 
                                     'Cancel'}
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleConfirmShotPlan(
                                      message.id, 
                                      message.shotPlan, 
                                      message.attachedImages || [], 
                                      message.originalPrompt || ''
                                    )}
                                    disabled={isGenerating}
                                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                                  >
                                    {isGenerating ? 
                                      (currentLanguage === 'zh' ? '生成中...' : 
                                       currentLanguage === 'ja' ? '生成中...' : 
                                       'Generating...') : 
                                      (currentLanguage === 'zh' ? '确认并开始生成' : 
                                       currentLanguage === 'ja' ? '確認して生成開始' : 
                                       'Confirm & Generate')
                                    }
                                  </button>
                                  <button
                                    onClick={() => handleEditPlan(message.id)}
                                    disabled={isGenerating}
                                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                                  >
                                    {currentLanguage === 'zh' ? '编辑规划' : 
                                     currentLanguage === 'ja' ? 'プラン編集' : 
                                     'Edit Plan'}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* 完成状态的视频播放器 */}
                      {message.type === 'assistant' && message.status === 'completed' && message.videoUrl && (
                        <div className="mt-3">
                          <video
                            src={message.videoUrl}
                            controls
                            autoPlay
                            loop
                            muted
                            className="w-full rounded-lg shadow-lg max-w-md"
                            style={{ maxHeight: '300px' }}
                          >
                            您的浏览器不支持视频播放
                          </video>
                          <div className="mt-2 flex gap-2">
                            <a
                              href={message.videoUrl}
                              download={`monna-long-video-${Date.now()}.mp4`}
                              className="text-xs text-blue-500 hover:text-blue-600 underline"
                            >
                              下载视频
                            </a>
                          </div>
                        </div>
                      )}
                      
                      {/* 时间戳 */}
                      <div className={`text-xs mt-2 ${
                        message.type === 'user' ? 'text-blue-100' : 'text-gray-400'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* 输入区域 */}
            <div className="border-t border-gray-200 bg-white p-4">
              <div className="relative">
                <div className="relative flex flex-col border border-gray-300 rounded-xl bg-white focus-within:border-blue-500 transition-colors">
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={longVideoPrompt}
                      onChange={handleLongVideoPromptChange}
                      style={{
                        outline: 'none',
                        resize: 'none',
                        minHeight: '80px',
                        maxHeight: '200px'
                      }}
                      className="w-full px-4 py-3 bg-transparent border-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-500 align-top leading-normal text-gray-900"
                      placeholder={t('createMovieOrAdDesc') + '...'}
                      disabled={isGenerating}
                      onInput={adjustTextareaHeight}
                    />
                    
                    {/* 附加图片预览区域 */}
                    {longVideoAttachedImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 px-4 pb-3">
                        {longVideoAttachedImages.map((image, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={URL.createObjectURL(image)}
                              alt={`附加图片 ${index + 1}`}
                              className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                            />
                            <button
                              onClick={() => removeLongVideoImage(index)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              disabled={isGenerating}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="h-14">
                    <div className="absolute left-3 right-3 bottom-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* 附加图片按钮 */}
                        <label className={`p-2 transition-colors rounded-lg border cursor-pointer ${
                          isGenerating 
                            ? 'text-gray-300 border-gray-200 cursor-not-allowed' 
                            : 'text-gray-500 hover:text-gray-700 border-gray-300 hover:border-gray-400'
                        }`}>
                          <ImagePlus className="w-4 h-4" />
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            multiple
                            onChange={handleLongVideoImageUpload}
                            className="hidden"
                            disabled={isGenerating}
                          />
                        </label>
                        
                        {/* 图片数量提示 */}
                        {longVideoAttachedImages.length > 0 && (
                          <span className="text-xs text-gray-500">
                            {longVideoAttachedImages.length}/10 张图片
                          </span>
                        )}
                        </div>
                      
                      {/* 发送按钮 */}
                      <button
                        onClick={handleLongVideoGenerate}
                        disabled={!canGenerate || isGenerating}
                        className={`p-2 transition-colors rounded-lg ${
                          canGenerate && !isGenerating
                            ? 'text-blue-500 hover:text-blue-600 hover:bg-blue-50' 
                            : 'text-gray-300 cursor-not-allowed'
                        }`}
                        aria-label="Send message"
                        type="button"
                      >
                        {isGenerating ? (
                          <RefreshCw className="w-6 h-6 animate-spin" />
                        ) : (
                        <Send className="w-6 h-6" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* 上传照片弹窗 */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {(selectedTemplate?.category || selectedVideoTemplate?.category)}
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
              {generationType === 'image' && selectedCategory === 'anime'
                ? t('uploadTwoAnimeImages')
                : generationType === 'image' && selectedCategory === 'wearing'
                  ? t('uploadTwoImages')
                  : generationType === 'shortvideo' && selectedVideoTemplate?.imageToVideo
                    ? t('photoToVideo')
                    : generationType === 'shortvideo' && (selectedVideoCategory === 'effects' || selectedVideoCategory === 'fantasy')
                      ? t('uploadVideo')
                      : generationType === 'image'
                        ? t('uploadYourPortrait')
                        : generationType === 'shortvideo'
                          ? t('uploadVideoReference')
                          : t('movieProductionComingSoon')
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 模板预览 */}
            {(selectedTemplate || selectedVideoTemplate) && (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  {t('selectTemplate')}: {selectedTemplate?.category || selectedVideoTemplate?.category}
                </p>
              </div>
            )}
            
            {/* 调试信息 - 开发时可见，生产环境可移除 */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
                Debug: generationType={generationType}, selectedVideoCategory={selectedVideoCategory}, 
                imageToVideo={selectedVideoTemplate?.imageToVideo},
                shouldShowVideoUpload={generationType === 'shortvideo' && (selectedVideoCategory === 'effects' || selectedVideoCategory === 'fantasy') && !selectedVideoTemplate?.imageToVideo}
              </div>
            )}
            
            {/* 文件上传 */}
            {generationType !== 'longvideo' && (
              <div>
                {/* 动漫类别和穿戴类别使用双图片上传 */}
                {generationType === 'image' && (selectedCategory === 'anime' || selectedCategory === 'wearing') ? (
                  <DualImageUpload
                    onImage1Select={setUploadedImage1}
                    onImage2Select={setUploadedImage2}
                    selectedImage1={uploadedImage1}
                    selectedImage2={uploadedImage2}
                  />
                ) : generationType === 'shortvideo' && (selectedVideoCategory === 'effects' || selectedVideoCategory === 'fantasy') && !selectedVideoTemplate?.imageToVideo ? (
                  <VideoUpload
                    onVideoSelect={(file, duration) => {
                      setUploadedVideo(file);
                      setVideoDuration(duration || null);
                    }}
                    selectedVideo={uploadedVideo}
                  />
                ) : generationType === 'image' || generationType === 'shortvideo' ? (
                  <ImageUpload
                    onImageSelect={setUploadedImage}
                    selectedImage={uploadedImage}
                  />
                ) : null}
              </div>
            )}



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
                  {t('generating')}
                </>
              ) : (
                generationType === 'image' ? t('startGenerating') : 
                generationType === 'shortvideo' ? t('startGeneratingVideo') :
                '开始制作电影'
              )}
            </Button>

            {!canGenerate && !isGenerating && (
              <p className="text-sm text-gray-500 text-center">
                {(() => {
                  if (generationType === 'image') {
                    if (selectedCategory === 'anime' || selectedCategory === 'wearing') {
                      if (!uploadedImage1 && !uploadedImage2) {
                        return selectedCategory === 'anime' ? "请上传两张原始图片进行合成" : "请上传两张图片进行穿戴搭配";
                      } else if (!uploadedImage1) {
                        return "请上传第一张原始图片";
                      } else if (!uploadedImage2) {
                        return "请上传第二张原始图片";
                      }
                      return "";
                    }
                    return !uploadedImage ? t('pleaseUploadPhoto') : "";
                  } else if (generationType === 'shortvideo') {
                    const isEffectsCategory = selectedVideoCategory === 'effects';
                    const requiredFile = isEffectsCategory ? uploadedVideo : uploadedImage;
                    const fileType = isEffectsCategory ? "参考视频" : "参考图片";
                    return !requiredFile ? `请先上传${fileType}` : "";
                  } else {
                    return longVideoPrompt.trim().length === 0 ? t('pleaseEnterVideoDescription') : "";
                  }
                })()}
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
        templateName={selectedTemplate?.category || selectedVideoTemplate?.category}
        generationType={generationType === 'shortvideo' ? 'video' : generationType === 'longvideo' ? 'video' : generationType}
      />

      {/* 角色迁移上传弹窗 */}
      <Dialog open={showFaceSwapModal} onOpenChange={setShowFaceSwapModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">{t('uploadFaceSwapMaterials')}</DialogTitle>
            <DialogDescription>
              {t('uploadVideoAndImageForFaceSwap')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* 视频上传区域 */}
            <div>
              <label className="text-sm font-medium mb-3 block text-gray-700">
                {t('videoUploadLabel')}
              </label>
              <VideoUpload
                onVideoSelect={(file) => setFaceSwapVideo(file)}
                selectedVideo={faceSwapVideo}
              />
            </div>

            {/* 图片上传区域 */}
            <div>
              <label className="text-sm font-medium mb-3 block text-gray-700">
                {t('characterImageLabel')}
              </label>
              <ImageUpload
                onImageSelect={setFaceSwapImage}
                selectedImage={faceSwapImage}
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end space-x-3 pt-4 -mt-12 relative z-10">
              <Button
                variant="outline"
                onClick={() => {
                  setShowFaceSwapModal(false);
                  setFaceSwapVideo(null);
                  setFaceSwapImage(null);
                }}
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleFaceSwap}
                disabled={!faceSwapVideo || !faceSwapImage}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {t('startFaceSwap')}
              </Button>
            </div>

            {/* 验证提示 */}
            {(!faceSwapVideo || !faceSwapImage) && (
              <p className="text-sm text-gray-500 text-center">
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 角色迁移结果预览弹窗 */}
      <Dialog open={showFaceSwapResult} onOpenChange={(open) => {
        if (!open) {
          // 关闭弹窗时，永久停止监听
          shouldStopMonitoring.current = true;
          console.log("🛑 Dialog closed, set shouldStopMonitoring to true");
          setShowFaceSwapResult(false);
          setFaceSwapResult(null);
          setCurrentJobId('');
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">角色迁移结果</DialogTitle>
            <DialogDescription>
              查看您的角色迁移结果，左侧为原始视频，右侧为角色迁移后的视频
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* 对比视频展示区 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 原始视频 */}
              <div className="flex flex-col items-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">原始视频</h3>
                <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden shadow-lg">
                  <div className="aspect-[16/9] bg-gray-200 flex items-center justify-center">
                    {faceSwapResult?.originalVideo ? (
                      <video
                        src={faceSwapResult.originalVideo}
                        className="w-full h-full object-cover"
                        controls
                        playsInline
                      />
                    ) : (
                      <div className="text-center text-gray-500">
                        <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">原始视频</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 角色迁移后视频 */}
              <div className="flex flex-col items-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">角色迁移后视频</h3>
                <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden shadow-lg">
                  <div className="aspect-[16/9] bg-gray-200 flex items-center justify-center">
                    {faceSwapResult?.swappedVideo ? (
                      <video
                        src={faceSwapResult.swappedVideo}
                        className="w-full h-full object-cover"
                        controls
                        playsInline
                      />
                    ) : (
                      <div className="text-center text-gray-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
                        <p className="text-sm">生成中...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-between items-center pt-4">
              <div className="flex space-x-3">
                {faceSwapResult?.swappedVideo && (
                  <>
                    <Button
                      onClick={handleShareToCommunity}
                      disabled={shareLoading}
                      className="bg-orange-600 hover:bg-orange-700 gap-2"
                    >
                      <Share2 className="h-4 w-4" />
                      {shareLoading ? "分享中..." : "分享到Community"}
                    </Button>
                    <Button
                      onClick={() => {
                        // 下载角色迁移后的视频
                        const a = document.createElement('a');
                        a.href = faceSwapResult.swappedVideo;
                        a.download = 'face_swap_result.mp4';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      下载视频
                    </Button>
                  </>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  // 永久停止监听
                  shouldStopMonitoring.current = true;
                  console.log("🛑 Close button clicked, set shouldStopMonitoring to true");
                  setShowFaceSwapResult(false);
                  setFaceSwapResult(null);
                  setCurrentJobId('');
                }}
              >
                关闭
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 换衣服上传弹窗 */}
      <Dialog open={showChangeClothesModal} onOpenChange={setShowChangeClothesModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">上传换衣服素材</DialogTitle>
            <DialogDescription>
              请上传一个包含人物的视频和一张展示衣服的图片来开始换衣服
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* 视频上传区域 */}
            <div>
              <label className="text-sm font-medium mb-3 block text-gray-700">
                上传人物视频
              </label>
              <VideoUpload
                onVideoSelect={(file) => setChangeClothesVideo(file)}
                selectedVideo={changeClothesVideo}
              />
              <p className="text-xs text-gray-500 mt-1">
                请上传包含人物的视频文件，支持 MP4、MOV 等格式，不超过10秒
              </p>
            </div>

            {/* 衣服图片上传区域 */}
            <div>
              <label className="text-sm font-medium mb-3 block text-gray-700">
                上传衣服图片
              </label>
              <ImageUpload
                onImageSelect={setChangeClothesImage}
                selectedImage={changeClothesImage}
                label="上传衣服图片"
              />
              <p className="text-xs text-gray-500 mt-2">
                请上传展示衣服的图片，支持 JPG、PNG 等格式
              </p>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowChangeClothesModal(false);
                  setChangeClothesVideo(null);
                  setChangeClothesImage(null);
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleChangeClothes}
                disabled={!changeClothesVideo || !changeClothesImage}
                className="bg-orange-600 hover:bg-orange-700"
              >
                开始换衣服
              </Button>
            </div>

            {/* 验证提示 */}
            {(!changeClothesVideo || !changeClothesImage) && (
              <p className="text-sm text-gray-500 text-center">
                {!changeClothesVideo && !changeClothesImage 
                  ? "请上传人物视频和衣服图片" 
                  : !changeClothesVideo 
                    ? "请上传人物视频" 
                    : "请上传衣服图片"}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 升级提示对话框 */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-orange-500" />
              升级订阅以解锁视频生成
            </DialogTitle>
            <DialogDescription>
              视频生成功能仅限专业档和企业档用户使用
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 当前计划提示 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                您当前的订阅计划：
                <span className="font-semibold text-gray-900 ml-2">
                  {planName === 'free' ? '免费档' : planName === 'basic' ? '基础档' : planName}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {planName === 'free' ? '免费档仅支持图片生成功能' : '基础档仅支持图片生成功能'}
              </p>
            </div>

            {/* 功能对比 */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900">专业档功能：</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>✓ 图片生成（8 积分/张）</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>✓ 短视频生成（15 积分/秒）</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>✓ 电影制作（80 积分/秒）</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>✓ 4000 月度积分</span>
                </li>
              </ul>
            </div>

            {/* 行动按钮 */}
            <div className="flex flex-col gap-2 pt-4">
              <Button
                onClick={() => {
                  setShowUpgradeDialog(false);
                  router.push('/pricing');
                }}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Crown className="h-4 w-4 mr-2" />
                立即升级到专业档
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowUpgradeDialog(false)}
                className="w-full"
              >
                稍后再说
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chatwoot 用户留言板 */}
      <ChatwootWidget />
    </div>
  );
}