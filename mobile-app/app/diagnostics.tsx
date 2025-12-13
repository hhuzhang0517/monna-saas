/**
 * 资源加载诊断页面
 * 用于测试和诊断图片、视频等静态资源的加载问题
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { API_CONFIG } from '../config/api';
import {
  testSampleAssets,
  formatFileSize,
  formatLoadTime,
  AssetTestResult,
} from '../utils/assetDiagnostics';
import { testImageUrls } from '../utils/imageTest';

export default function DiagnosticsScreen() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<AssetTestResult[]>([]);
  const [config, setConfig] = useState<typeof API_CONFIG | null>(null);
  const [imageTestResults, setImageTestResults] = useState<string>('');

  const runDiagnostics = async () => {
    setTesting(true);
    setResults([]);
    setImageTestResults('');
    
    try {
      // 先运行网络测试
      console.log('🔍 开始网络测试...');
      const { config, results } = await testSampleAssets();
      setConfig(config);
      setResults(results);

      // 再运行React Native Image组件测试
      console.log('🔍 开始Image组件测试...');
      const testUrls = [
        'https://www.monna.us/figma-designs/portrait/IMAGE-1.jpg',
        'https://www.monna.us/figma-designs/artistic/IMAGE-1.png',
        'https://www.monna.us/figma-designs/monna_logo.png',
      ];
      
      const imageResults = await testImageUrls(testUrls);
      const imageTestMsg = `Image组件测试: ${imageResults.success}/${imageResults.total} 成功\n` +
        imageResults.results.map(r => 
          `${r.success ? '✅' : '❌'} ${r.url.split('/').pop()}`
        ).join('\n');
      
      setImageTestResults(imageTestMsg);
      console.log('📊 Image组件测试结果:', imageResults);
      
    } catch (error) {
      console.error('诊断失败:', error);
      setImageTestResults(`诊断过程出错: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.title}>资源加载诊断</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* 当前配置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📡 当前配置</Text>
          {config && (
            <View style={styles.configBox}>
              <Text style={styles.configText}>BASE_URL: {config.BASE_URL}</Text>
              <Text style={styles.configText}>ASSETS_URL: {config.ASSETS_URL}</Text>
              <Text style={styles.configText}>DEV_SERVER_URL: {config.DEV_SERVER_URL}</Text>
              <Text style={styles.configText}>TIMEOUT: {config.TIMEOUT}ms</Text>
            </View>
          )}
        </View>

        {/* 测试按钮 */}
        <TouchableOpacity
          style={[styles.testButton, testing && styles.testButtonDisabled]}
          onPress={runDiagnostics}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.testButtonText}>🔍 开始诊断</Text>
          )}
        </TouchableOpacity>

        {/* 统计结果 */}
        {results.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 网络测试结果</Text>
            <View style={styles.statsBox}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{results.length}</Text>
                <Text style={styles.statLabel}>总计</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, styles.successText]}>{successCount}</Text>
                <Text style={styles.statLabel}>成功</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, styles.errorText]}>{errorCount}</Text>
                <Text style={styles.statLabel}>失败</Text>
              </View>
            </View>
          </View>
        )}

        {/* Image组件测试结果 */}
        {imageTestResults && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🖼️ Image组件测试</Text>
            <View style={styles.configBox}>
              <Text style={styles.configText}>{imageTestResults}</Text>
            </View>
          </View>
        )}

        {/* 详细结果列表 */}
        {results.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 详细结果</Text>
            {results.map((result, index) => (
              <View key={index} style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <Text style={result.status === 'success' ? styles.successBadge : styles.errorBadge}>
                    {result.status === 'success' ? '✅ 成功' : '❌ 失败'}
                  </Text>
                  {result.statusCode && (
                    <Text style={styles.statusCode}>HTTP {result.statusCode}</Text>
                  )}
                </View>
                
                <Text style={styles.resultUrl} numberOfLines={2}>
                  {result.url}
                </Text>
                
                <View style={styles.resultDetails}>
                  <Text style={styles.resultDetail}>
                    时间: {formatLoadTime(result.loadTime)}
                  </Text>
                  {result.size && (
                    <Text style={styles.resultDetail}>
                      大小: {formatFileSize(result.size)}
                    </Text>
                  )}
                </View>
                
                {result.message && result.status === 'error' && (
                  <Text style={styles.errorMessage}>{result.message}</Text>
                )}

                {/* 如果是图片且加载成功，显示预览 */}
                {result.status === 'success' && result.url.match(/\.(jpg|jpeg|png)$/i) && (
                  <Image
                    source={{ uri: result.url }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                )}
              </View>
            ))}
          </View>
        )}

        {/* 说明文档 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ 使用说明</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              此工具用于诊断移动应用无法加载图片和视频的问题。
            </Text>
            <Text style={styles.infoText}>
              {'\n'}常见问题：
            </Text>
            <Text style={styles.infoText}>
              • 如果所有测试都失败，请检查网络连接
            </Text>
            <Text style={styles.infoText}>
              • 如果只有部分失败，可能是服务器资源缺失
            </Text>
            <Text style={styles.infoText}>
              • 如果全部成功但应用仍不显示，可能是组件渲染问题
            </Text>
            <Text style={styles.infoText}>
              {'\n'}开发模式：
            </Text>
            <Text style={styles.infoText}>
              • 确保 config/api.ts 中的 DEV_SERVER_URL 正确
            </Text>
            <Text style={styles.infoText}>
              • 确保手机和电脑在同一局域网
            </Text>
            <Text style={styles.infoText}>
              • 确保 Next.js 开发服务器正在运行
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  configBox: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  configText: {
    color: '#aaa',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  testButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  testButtonDisabled: {
    backgroundColor: '#555',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 4,
  },
  successText: {
    color: '#4CD964',
  },
  errorText: {
    color: '#FF3B30',
  },
  resultCard: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  successBadge: {
    color: '#4CD964',
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorBadge: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusCode: {
    color: '#aaa',
    fontSize: 12,
  },
  resultUrl: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  resultDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  resultDetail: {
    color: '#aaa',
    fontSize: 12,
  },
  errorMessage: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  previewImage: {
    width: '100%',
    height: 120,
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  infoBox: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoText: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
  },
});

