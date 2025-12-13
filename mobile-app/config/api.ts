/**
 * API和资源配置
 * 用于配置移动端访问的服务器地址
 */

// 开发环境本地服务器配置
// 注意: 请将IP地址替换为您电脑的实际IP地址
const DEV_SERVER_URL = 'http://192.168.3.105:3005';

// 生产环境服务器配置（默认）
const PROD_SERVER_URL = 'https://www.monna.us';

// 从环境变量获取配置（EAS构建时注入）
// 环境变量优先级最高，用于APK构建
const ENV_API_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// 配置优先级：环境变量 > 开发/生产模式判断
// 1. 如果有环境变量（EAS构建），使用环境变量
// 2. 如果是开发模式（Expo Go），使用本地服务器
// 3. 否则使用生产服务器
const BASE_URL = ENV_API_URL || (__DEV__ ? DEV_SERVER_URL : PROD_SERVER_URL);

// 导出配置
export const API_CONFIG = {
  // API基础URL
  BASE_URL: BASE_URL,

  // 静态资源基础URL
  ASSETS_URL: BASE_URL,

  // 超时设置
  TIMEOUT: 30000,
};

// 输出当前配置（用于调试）
console.log('📡 API Config:', {
  __DEV__,
  hasEnvVar: !!ENV_API_URL,
  envApiUrl: ENV_API_URL,
  finalBaseUrl: BASE_URL,
});

/**
 * 获取完整的资源URL
 * @param path 相对路径，例如 'figma-designs/portrait/IMAGE-1.jpg'
 * @returns 完整的URL
 */
export function getAssetUrl(path: string): string {
  // 移除开头的斜杠(如果有)
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_CONFIG.ASSETS_URL}/${cleanPath}`;
}

/**
 * 获取API端点URL
 * @param endpoint API端点，例如 '/api/jobs'
 * @returns 完整的API URL
 */
export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_CONFIG.BASE_URL}/${cleanEndpoint}`;
}
