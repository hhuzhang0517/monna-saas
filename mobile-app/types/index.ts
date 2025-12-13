// Core types for Monna Mobile App

export type JobStatus = 'queued' | 'processing' | 'done' | 'failed';

export type JobType = 'image' | 'video' | 'long-video';

export type AIProvider = 'openai' | 'gemini' | 'ideogram' | 'runway';

export interface Job {
  id: string;
  userId: string;
  type: JobType;
  provider: AIProvider;
  prompt: string;
  referenceImageUrl?: string;
  referenceVideoUrl?: string;
  status: JobStatus;
  resultUrl?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface UserStats {
  totalGenerations: number;
  creditsRemaining: number;
  subscriptionStatus: 'free' | 'basic' | 'pro' | 'enterprise';
  planName: string;
}

export interface Template {
  id: string;
  image: string;
  afterImage?: string;
  originalImage1?: string;
  originalImage2?: string;
  mergedImage?: string;
  thumbnail?: string;
  video?: string;
  category: TemplateCategory;
  prompt: string;
}

export type TemplateCategory =
  | 'expression'
  | 'artistic'
  | 'anime'
  | 'wearing'
  | 'landscape'
  | 'abstract'
  | 'effects'
  | 'animation'
  | 'fantasy'
  | 'product';

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'month' | 'year';
  credits: number;
  features: string[];
  stripePriceId: string;
  popular?: boolean;
}

export interface CommunityShare {
  id: string;
  userId: string;
  jobId: string;
  resultUrl: string;
  prompt: string;
  likes: number;
  isPublic: boolean;
  createdAt: string;
  user?: {
    name: string;
    avatarUrl?: string;
  };
}
