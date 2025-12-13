import { supabase } from '@/lib/supabase/client';

const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://www.monna.us';

async function getAuthHeaders() {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Job API
export async function createJob(data: {
  type: 'image' | 'video';
  provider: string;
  prompt: string;
  referenceImageUrl?: string;
  referenceVideoUrl?: string;
  category?: string;
}) {
  return apiRequest('/api/jobs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getJob(jobId: string) {
  return apiRequest(`/api/jobs?id=${jobId}`);
}

export async function getPendingJobs() {
  return apiRequest('/api/jobs/pending');
}

export async function getUserGenerations() {
  return apiRequest('/api/user/generations');
}

export async function cleanupGenerations() {
  return apiRequest('/api/user/generations', {
    method: 'DELETE',
  });
}

// Upload API
export async function uploadImage(uri: string): Promise<{ url: string }> {
  const formData = new FormData();
  const filename = uri.split('/').pop() || 'image.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('file', {
    uri,
    name: filename,
    type,
  } as any);

  const headers = await getAuthHeaders();
  delete headers['Content-Type']; // Let browser set it with boundary

  const response = await fetch(`${API_URL}/api/upload/image`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Image upload failed');
  }

  return response.json();
}

export async function uploadVideo(uri: string): Promise<{ url: string }> {
  const formData = new FormData();
  const filename = uri.split('/').pop() || 'video.mp4';

  formData.append('file', {
    uri,
    name: filename,
    type: 'video/mp4',
  } as any);

  const headers = await getAuthHeaders();
  delete headers['Content-Type'];

  const response = await fetch(`${API_URL}/api/upload/video`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Video upload failed');
  }

  return response.json();
}

// User API
export async function getUserStats() {
  return apiRequest('/api/user/stats');
}

export async function deleteUser() {
  return apiRequest('/api/user/delete', {
    method: 'DELETE',
  });
}

// Pricing API
export async function getPricing() {
  return apiRequest('/api/pricing');
}

// Stripe Payment
export async function createCheckoutSession(priceId: string) {
  return apiRequest<{ clientSecret: string }>('/api/stripe/checkout', {
    method: 'POST',
    body: JSON.stringify({ priceId }),
  });
}

// Community API
export async function getCommunityShares(page = 1, limit = 20) {
  return apiRequest(`/api/community/shares?page=${page}&limit=${limit}`);
}

export async function shareToCommunity(jobId: string, isPublic = true) {
  return apiRequest('/api/community/shares', {
    method: 'POST',
    body: JSON.stringify({ jobId, isPublic }),
  });
}

export async function likeShare(shareId: string) {
  return apiRequest('/api/community/likes', {
    method: 'POST',
    body: JSON.stringify({ shareId }),
  });
}
