/**
 * 图片缓存管理器
 * 负责下载网络图片到本地文件系统并管理缓存
 */
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 缓存目录
const CACHE_DIR = `${FileSystem.cacheDirectory}images/`;
const CACHE_INDEX_KEY = '@image_cache_index';

// 缓存索引类型
interface CacheIndex {
  [remoteUrl: string]: {
    localPath: string;
    timestamp: number;
    size: number;
  };
}

/**
 * 初始化缓存目录
 */
async function ensureCacheDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    console.log('📁 创建缓存目录:', CACHE_DIR);
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

/**
 * 获取缓存索引
 */
async function getCacheIndex(): Promise<CacheIndex> {
  try {
    const indexStr = await AsyncStorage.getItem(CACHE_INDEX_KEY);
    return indexStr ? JSON.parse(indexStr) : {};
  } catch (error) {
    console.error('❌ 读取缓存索引失败:', error);
    return {};
  }
}

/**
 * 保存缓存索引
 */
async function saveCacheIndex(index: CacheIndex): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
  } catch (error) {
    console.error('❌ 保存缓存索引失败:', error);
  }
}

/**
 * 从 URL 生成本地文件名
 */
function getLocalFileName(remoteUrl: string): string {
  // 提取文件名和扩展名
  const urlParts = remoteUrl.split('/');
  const fileName = urlParts[urlParts.length - 1];

  // 清理文件名（移除查询参数）
  const cleanFileName = fileName.split('?')[0];

  // 生成唯一文件名（避免冲突）
  const hash = remoteUrl.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);

  return `${Math.abs(hash)}_${cleanFileName}`;
}

/**
 * 检查图片是否已缓存
 */
export async function isImageCached(remoteUrl: string): Promise<boolean> {
  try {
    const index = await getCacheIndex();
    const cacheEntry = index[remoteUrl];

    if (!cacheEntry) {
      return false;
    }

    // 检查本地文件是否存在
    const fileInfo = await FileSystem.getInfoAsync(cacheEntry.localPath);
    return fileInfo.exists;
  } catch (error) {
    console.error('❌ 检查缓存失败:', remoteUrl, error);
    return false;
  }
}

/**
 * 获取缓存的本地路径
 */
export async function getCachedImagePath(remoteUrl: string): Promise<string | null> {
  try {
    const index = await getCacheIndex();
    const cacheEntry = index[remoteUrl];

    if (!cacheEntry) {
      return null;
    }

    // 验证文件存在
    const fileInfo = await FileSystem.getInfoAsync(cacheEntry.localPath);
    if (!fileInfo.exists) {
      console.warn('⚠️ 缓存文件不存在，将重新下载:', remoteUrl);
      return null;
    }

    return cacheEntry.localPath;
  } catch (error) {
    console.error('❌ 获取缓存路径失败:', remoteUrl, error);
    return null;
  }
}

/**
 * 下载图片到本地缓存
 */
export async function downloadImage(
  remoteUrl: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    // 确保缓存目录存在
    await ensureCacheDir();

    // 生成本地文件路径
    const fileName = getLocalFileName(remoteUrl);
    const localPath = `${CACHE_DIR}${fileName}`;

    // 检查是否已存在
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (fileInfo.exists) {
      console.log('✅ 图片已缓存:', fileName);
      return localPath;
    }

    console.log('📥 开始下载:', fileName);

    // 下载文件
    const downloadResult = await FileSystem.downloadAsync(
      remoteUrl,
      localPath,
      {
        // 下载进度回调
        ...(onProgress && {
          progressUpdateIntervalMillis: 500,
        }),
      }
    );

    if (downloadResult.status !== 200) {
      throw new Error(`下载失败: HTTP ${downloadResult.status}`);
    }

    // 获取文件信息
    const downloadedFileInfo = await FileSystem.getInfoAsync(localPath);

    // 更新缓存索引
    const index = await getCacheIndex();
    index[remoteUrl] = {
      localPath,
      timestamp: Date.now(),
      size: downloadedFileInfo.exists && 'size' in downloadedFileInfo ? downloadedFileInfo.size : 0,
    };
    await saveCacheIndex(index);

    console.log('✅ 下载完成:', fileName);
    return localPath;
  } catch (error) {
    console.error('❌ 下载图片失败:', remoteUrl, error);
    throw error;
  }
}

/**
 * 批量下载图片
 */
export async function downloadImages(
  remoteUrls: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  let completed = 0;

  console.log(`📦 开始批量下载 ${remoteUrls.length} 张图片`);

  // 分批下载：每批 5 张
  const batchSize = 5;
  for (let i = 0; i < remoteUrls.length; i += batchSize) {
    const batch = remoteUrls.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (url) => {
        try {
          const localPath = await downloadImage(url);
          results.set(url, localPath);
          completed++;
          onProgress?.(completed, remoteUrls.length);
        } catch (error) {
          console.error('❌ 批量下载失败:', url, error);
          // 继续下载其他图片
        }
      })
    );
  }

  console.log(`🎉 批量下载完成: ${completed}/${remoteUrls.length}`);
  return results;
}

/**
 * 清除所有缓存
 */
export async function clearCache(): Promise<void> {
  try {
    console.log('🗑️ 清除所有缓存');

    // 删除缓存目录
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    }

    // 清除索引
    await AsyncStorage.removeItem(CACHE_INDEX_KEY);

    console.log('✅ 缓存已清除');
  } catch (error) {
    console.error('❌ 清除缓存失败:', error);
    throw error;
  }
}

/**
 * 获取缓存统计信息
 */
export async function getCacheStats(): Promise<{
  count: number;
  totalSize: number;
  oldestTimestamp: number;
}> {
  try {
    const index = await getCacheIndex();
    const entries = Object.values(index);

    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const oldestTimestamp = entries.length > 0
      ? Math.min(...entries.map(e => e.timestamp))
      : 0;

    return {
      count: entries.length,
      totalSize,
      oldestTimestamp,
    };
  } catch (error) {
    console.error('❌ 获取缓存统计失败:', error);
    return { count: 0, totalSize: 0, oldestTimestamp: 0 };
  }
}
