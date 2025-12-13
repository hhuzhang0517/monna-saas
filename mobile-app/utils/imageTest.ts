import { Image } from 'react-native';

/**
 * 预加载图片资源，帮助诊断加载问题
 */
export async function prefetchImage(url: string): Promise<boolean> {
  try {
    await Image.prefetch(url);
    console.log('✅ 预加载成功:', url);
    return true;
  } catch (error) {
    console.error('❌ 预加载失败:', url, error);
    return false;
  }
}

/**
 * 获取图片尺寸，验证图片是否可访问
 */
export function getImageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      url,
      (width, height) => {
        console.log('✅ 获取尺寸成功:', url, { width, height });
        resolve({ width, height });
      },
      (error) => {
        console.error('❌ 获取尺寸失败:', url, error);
        reject(error);
      }
    );
  });
}

/**
 * 批量测试图片URL
 */
export async function testImageUrls(urls: string[]): Promise<{
  total: number;
  success: number;
  failed: number;
  results: Array<{ url: string; success: boolean; error?: any }>;
}> {
  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        await Image.prefetch(url);
        return { url, success: true };
      } catch (error) {
        return { url, success: false, error };
      }
    })
  );

  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;

  return {
    total: results.length,
    success: successCount,
    failed: failedCount,
    results,
  };
}

