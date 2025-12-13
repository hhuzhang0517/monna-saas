import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  ImageStyle,
  ViewStyle,
} from 'react-native';
import { colors } from '@/styles/commonStyles';

interface OptimizedImageProps {
  uri: string;
  localPath?: string; // 本地文件路径（优先使用）
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
  showLoadingIndicator?: boolean;
  showErrorRetry?: boolean;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: any) => void;
}

export function OptimizedImage({
  uri,
  localPath,
  style,
  containerStyle,
  resizeMode = 'contain',
  showLoadingIndicator = true,
  showErrorRetry = true,
  onLoadStart,
  onLoadEnd,
  onError,
}: OptimizedImageProps) {
  const [loading, setLoading] = useState(false); // 默认不显示加载指示器
  const [error, setError] = useState(false);

  // 优先使用本地文件路径，如果不存在则使用远程 URL
  const imageSource = localPath || uri;
  const [retryCount, setRetryCount] = useState(0);
  const [imageKey, setImageKey] = useState(0); // Force re-render on retry
  const previousUriRef = useRef<string>('');
  const loadStartTimeRef = useRef<number>(0);

  useEffect(() => {
    // 只在图片源真正改变时才重置状态
    if (previousUriRef.current !== imageSource) {
      // 只对新图片显示加载状态（不是首次渲染）
      if (previousUriRef.current !== '') {
        setLoading(true);
      }
      setError(false);
      setRetryCount(0);
      previousUriRef.current = imageSource;
    }
  }, [imageSource]);

  const handleLoadStart = () => {
    loadStartTimeRef.current = Date.now();
    // 延迟显示加载指示器：如果图片快速加载（<100ms），不显示加载状态
    // 这样缓存的图片不会闪烁加载指示器
    setTimeout(() => {
      if (loadStartTimeRef.current > 0) {
        setLoading(true);
      }
    }, 100);
    setError(false);
    onLoadStart?.();
  };

  const handleLoadEnd = () => {
    const loadTime = Date.now() - loadStartTimeRef.current;
    loadStartTimeRef.current = 0; // 清除标记
    setLoading(false);

    // 记录慢速加载
    if (loadTime > 1000) {
      console.log(`⏱️ 图片加载耗时 ${loadTime}ms: ${uri.split('/').pop()}`);
    }

    onLoadEnd?.();
  };

  const handleError = (e: any) => {
    console.error('❌ 图片加载失败:', imageSource, e.nativeEvent?.error);
    loadStartTimeRef.current = 0;
    setLoading(false);
    setError(true);
    onError?.(e);
  };

  const handleRetry = () => {
    console.log('🔄 重试加载图片:', imageSource);
    setRetryCount(prev => prev + 1);
    setImageKey(prev => prev + 1); // Force re-render
    setError(false);
    setLoading(true);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Image
        key={imageKey}
        source={{
          uri: imageSource,
          // 本地文件不需要缓存控制
          ...(localPath ? {} : { cache: 'force-cache' }),
        }}
        style={style}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        // 本地文件加载速度快，不需要淡入动画
        fadeDuration={localPath ? 0 : 300}
      />

      {/* Loading indicator */}
      {loading && showLoadingIndicator && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {/* Error state with retry */}
      {error && showErrorRetry && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>加载失败</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.7}
          >
            <Text style={styles.retryText}>重试 {retryCount > 0 ? `(${retryCount})` : ''}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    padding: 10,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
  },
  retryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
