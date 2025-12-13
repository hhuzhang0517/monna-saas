import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/contexts/auth-context';
import { supabase } from '@/lib/supabase/client';
import { colors } from '@/styles/commonStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApiUrl } from '@/config/api';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { useTranslation } from '@/lib/contexts/i18n-context';

interface Generation {
  id: string;
  type: 'image' | 'video';
  prompt: string;
  result_url: string;
  created_at: string;
  status: string;
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadGenerations();
    }
  }, [user]);

  const loadGenerations = async (isRefresh = false) => {
    if (!user) {
      router.replace('/welcome');
      return;
    }

    try {
      if (!isRefresh) {
        setLoading(true);
      }

      // 获取当前会话令牌
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        Alert.alert(t('settings.tip', 'Tip'), t('generate.pleaseLoginFirst', 'Please login first'));
        router.replace('/welcome');
        return;
      }

      // 调用 API 获取生成历史
      const apiUrl = getApiUrl('api/user/generations');
      console.log('📡 正在请求历史记录:', apiUrl);
      console.log('👤 用户ID:', user.id, '邮箱:', user.email);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      console.log('📊 API响应状态:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API错误响应:', errorText);
        throw new Error(t('generate.getTaskStatusFailed', 'Failed to get task status'));
      }

      const data = await response.json();
      console.log('✅ 收到历史记录数据:', data.length, '条');
      if (data.length > 0) {
        console.log('📋 第一条记录:', data[0]);
      }
      setGenerations(data || []);
    } catch (error) {
      console.error('加载生成历史失败:', error);
      Alert.alert(t('common.error', 'Error'), t('common.loading', 'Loading...'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadGenerations(true);
  };

  const handleCleanup = () => {
    Alert.alert(
      t('dashboard.confirmCleanupTitle', 'Confirm Cleanup'),
      t('dashboard.confirmCleanupMessage', 'Clear all generation history?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.confirm', 'Confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();

              if (!session) {
                Alert.alert(t('settings.tip', 'Tip'), t('generate.pleaseLoginFirst', 'Please login first'));
                return;
              }

              const response = await fetch(getApiUrl('api/user/generations'), {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                },
              });

              if (!response.ok) {
                throw new Error(t('dashboard.cleanupSuccess', 'History cleared'));
              }

              const result = await response.json();
              Alert.alert(t('common.success', 'Success'), `${t('dashboard.cleanupSuccess', 'Cleared')} ${result.deleted || 0} ${t('generate.generationHistory', 'records')}`);
              loadGenerations();
            } catch (error) {
              console.error('清理失败:', error);
              Alert.alert(t('common.error', 'Error'), t('dashboard.cleanupSuccess', 'Failed to clear'));
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  const truncatePrompt = (prompt: string, maxLength: number = 50) => {
    return prompt.length > maxLength ? `${prompt.substring(0, maxLength)}...` : prompt;
  };

  const handleDownload = async (item: Generation) => {
    try {
      // 检查是否正在下载
      if (downloadingIds.has(item.id)) {
        return;
      }

      setDownloadingIds(prev => new Set(prev).add(item.id));

      // 请求媒体库权限
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('generate.mediaPermissionTitle', 'Photo Access Needed'),
          t('generate.mediaPermissionMessage', 'Please allow photo library access to upload images')
        );
        setDownloadingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(item.id);
          return newSet;
        });
        return;
      }

      // 下载图片到本地临时目录
      const fileExtension = item.type === 'image' ? '.jpg' : '.mp4';
      const filename = `monna_${item.type}_${Date.now()}${fileExtension}`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      console.log('📥 开始下载:', item.result_url);
      
      const downloadResult = await FileSystem.downloadAsync(item.result_url, fileUri);
      
      if (downloadResult.status !== 200) {
        throw new Error(t('generate.uploadFailed', 'Upload failed'));
      }

      console.log('✅ 下载完成:', downloadResult.uri);

      // 保存到相册
      await MediaLibrary.saveToLibraryAsync(downloadResult.uri);

      Alert.alert(
        t('generate.savedToGallery', 'Saved to gallery'),
        `${item.type === 'image' ? t('generate.imageTab', 'Image') : t('generate.videoTab', 'Video')} ${t('generate.savedToGallery', 'saved to gallery')}`
      );
    } catch (error) {
      console.error('下载失败:', error);
      Alert.alert(
        t('generate.saveFailed', 'Save failed'),
        error instanceof Error ? error.message : t('generate.unknownError', 'Unknown error')
      );
    } finally {
      setDownloadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const renderItem = ({ item }: { item: Generation }) => (
    <View style={styles.itemContainer}>
      {/* 缩略图 */}
      <View style={styles.thumbnailContainer}>
        {item.type === 'image' ? (
          <Image
            source={{ uri: item.result_url }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnail}>
            <Ionicons name="videocam" size={32} color="#999" />
          </View>
        )}
        <View style={styles.typeBadge}>
          <Ionicons
            name={item.type === 'image' ? 'image' : 'videocam'}
            size={12}
            color="#fff"
          />
        </View>
      </View>

      {/* 信息区域 */}
      <View style={styles.infoContainer}>
        <View style={styles.typeRow}>
          <Ionicons
            name={item.type === 'image' ? 'image-outline' : 'videocam-outline'}
            size={16}
            color="#666"
          />
          <Text style={styles.typeText}>
            {item.type === 'image' ? t('generate.imageTab', 'Image') : t('generate.videoTab', 'Video')} {t('common.generate', 'Generation')}
          </Text>
        </View>
        <Text style={styles.promptText} numberOfLines={2}>
          {item.type === 'image' ? t('generate.imageTab', 'Image') : t('generate.videoTab', 'Video')} {t('common.generate', 'generation')} {t('dashboard.status.done', 'task')}
        </Text>
        <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
      </View>

      {/* 下载按钮 */}
      <TouchableOpacity
        style={styles.downloadButton}
        onPress={() => handleDownload(item)}
        disabled={downloadingIds.has(item.id)}
      >
        {downloadingIds.has(item.id) ? (
          <ActivityIndicator size="small" color={colors.orange} />
        ) : (
          <Ionicons name="download-outline" size={20} color={colors.orange} />
        )}
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="time-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>{t('dashboard.noGenerations', 'No generations yet')}</Text>
      <Text style={styles.emptyHint}>{t('dashboard.emptySubtitle', 'Start by generating your first artwork')}</Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => router.push('/(tabs)/image-generation')}
      >
        <Text style={styles.createButtonText}>{t('dashboard.startCreating', 'Start Creating')}</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('dashboard.generationHistory', 'Generation History')}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.orange} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('dashboard.generationHistory', 'Generation History')}</Text>
        {generations.length > 0 && (
          <TouchableOpacity style={styles.cleanupButton} onPress={handleCleanup}>
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        )}
        {generations.length === 0 && <View style={styles.placeholder} />}
      </View>

      {/* 列表 */}
      <FlatList
        data={generations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.orange]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cleanupButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
  },
  itemContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnailContainer: {
    position: 'relative',
    marginRight: 12,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  typeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  promptText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  downloadButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyHint: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  createButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: colors.orange,
    borderRadius: 24,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

