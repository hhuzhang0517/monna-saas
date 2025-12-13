import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary 捕获到错误:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    // 尝试导航回首页
    try {
      router.replace('/welcome');
    } catch (e) {
      console.error('导航失败:', e);
    }
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      const isConfigError = error?.message?.includes('Supabase') ||
                           error?.message?.includes('environment');

      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.emoji}>⚠️</Text>
            <Text style={styles.title}>应用启动失败</Text>

            {isConfigError ? (
              <>
                <Text style={styles.message}>
                  应用配置有误，请检查环境变量配置
                </Text>
                <ScrollView style={styles.detailsScroll}>
                  <Text style={styles.details}>
                    {error?.message || '未知错误'}
                  </Text>
                </ScrollView>
                <Text style={styles.hint}>
                  这通常是构建配置问题，请联系开发者
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.message}>
                  抱歉，应用遇到了意外错误
                </Text>
                <ScrollView style={styles.detailsScroll}>
                  <Text style={styles.details}>
                    {error?.message || '未知错误'}
                  </Text>
                  {__DEV__ && this.state.errorInfo && (
                    <Text style={styles.stackTrace}>
                      {this.state.errorInfo.componentStack}
                    </Text>
                  )}
                </ScrollView>
              </>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={this.handleReset}
            >
              <Text style={styles.buttonText}>重新尝试</Text>
            </TouchableOpacity>

            {__DEV__ && (
              <Text style={styles.devHint}>
                开发模式：查看控制台了解详细信息
              </Text>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    maxWidth: 400,
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#333',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
    lineHeight: 24,
  },
  detailsScroll: {
    maxHeight: 200,
    marginBottom: 16,
  },
  details: {
    fontSize: 14,
    color: '#999',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    fontFamily: 'monospace',
  },
  stackTrace: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    fontFamily: 'monospace',
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    color: '#ff6b6b',
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  devHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
