/**
 * 资源加载诊断工具
 * 用于测试和诊断图片、视频等静态资源的加载问题
 */

import { API_CONFIG, getAssetUrl } from '../config/api';

export interface AssetTestResult {
  url: string;
  status: 'success' | 'error' | 'pending';
  statusCode?: number;
  message?: string;
  loadTime?: number;
  size?: number;
}

/**
 * 测试单个资源URL是否可访问
 */
export async function testAssetUrl(path: string): Promise<AssetTestResult> {
  const url = getAssetUrl(path);
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      method: 'HEAD', // 使用HEAD方法，不下载完整内容
      headers: {
        'Accept': '*/*',
      },
    });

    const loadTime = Date.now() - startTime;
    const contentLength = response.headers.get('content-length');

    return {
      url,
      status: response.ok ? 'success' : 'error',
      statusCode: response.status,
      message: response.ok ? 'OK' : `HTTP ${response.status} ${response.statusText}`,
      loadTime,
      size: contentLength ? parseInt(contentLength, 10) : undefined,
    };
  } catch (error) {
    return {
      url,
      status: 'error',
      message: error instanceof Error ? error.message : '未知错误',
      loadTime: Date.now() - startTime,
    };
  }
}

/**
 * 批量测试多个资源
 */
export async function testMultipleAssets(paths: string[]): Promise<AssetTestResult[]> {
  const results = await Promise.all(
    paths.map(path => testAssetUrl(path))
  );
  return results;
}

/**
 * 测试预定义的示例资源
 */
export async function testSampleAssets(): Promise<{
  config: typeof API_CONFIG;
  results: AssetTestResult[];
}> {
  // 测试各种类型的资源
  const samplePaths = [
    // 图片测试
    'figma-designs/portrait/IMAGE-1.jpg',
    'figma-designs/artistic/IMAGE-1.png',
    'figma-designs/wearing/IMAGE-1-source1.png',
    
    // 视频缩略图测试
    'figma-designs/videos/effects/11-frame1.png',
    'figma-designs/videos/fantasy/thumbnail-1.jpg',
    
    // Logo测试
    'figma-designs/monna_logo.png',
  ];

  console.log('🔍 开始资源加载诊断...');
  console.log('📡 当前配置:', API_CONFIG);
  
  const results = await testMultipleAssets(samplePaths);
  
  // 统计结果
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  
  console.log(`✅ 成功: ${successCount}/${results.length}`);
  console.log(`❌ 失败: ${errorCount}/${results.length}`);
  
  // 输出失败的资源详情
  results.forEach(result => {
    if (result.status === 'error') {
      console.error('❌ 加载失败:', result.url);
      console.error('   错误信息:', result.message);
    }
  });

  return {
    config: API_CONFIG,
    results,
  };
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * 格式化加载时间
 */
export function formatLoadTime(ms?: number): string {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

