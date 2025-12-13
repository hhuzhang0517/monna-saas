import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/contexts/auth-context';
import { colors } from '@/styles/commonStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/lib/contexts/i18n-context';
import LanguageSelector from '@/components/LanguageSelector';

export default function SettingsScreen() {
  const { t, language } = useTranslation();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoPlayVideos, setAutoPlayVideos] = useState(true);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  // 获取语言显示名称
  const getLanguageName = () => {
    switch (language) {
      case 'zh-CN':
        return '简体中文';
      case 'en-US':
        return 'English';
      case 'ja-JP':
        return '日本語';
      default:
        return 'English';
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      t('settings.confirmSignOut'),
      t('settings.confirmSignOutMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/welcome');
            } catch (error) {
              console.error('登出失败:', error);
              Alert.alert(t('common.error'), t('settings.signOutFailed'));
            }
          },
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      t('settings.confirmClearCache'),
      t('settings.confirmClearCacheMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: () => {
            // TODO: 实现清除缓存功能
            Alert.alert(t('settings.tip'), t('settings.cacheCleared'));
          },
        },
      ]
    );
  };

  const renderSection = (title: string, items: React.ReactNode[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {item}
            {index < items.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );

  const renderMenuItem = (
    icon: string,
    title: string,
    onPress: () => void,
    rightElement?: React.ReactNode,
    danger?: boolean
  ) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon as any} size={22} color={danger ? '#FF3B30' : '#333'} />
        <Text style={[styles.menuItemText, danger && styles.menuItemTextDanger]}>
          {title}
        </Text>
      </View>
      {rightElement || <Ionicons name="chevron-forward" size={20} color="#999" />}
    </TouchableOpacity>
  );

  const renderSwitchItem = (
    icon: string,
    title: string,
    value: boolean,
    onValueChange: (value: boolean) => void
  ) => (
    <View style={styles.menuItem}>
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon as any} size={22} color="#333" />
        <Text style={styles.menuItemText}>{title}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#e5e5e5', true: colors.orange }}
        thumbColor="#fff"
      />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* 账号设置 */}
        {renderSection(t('settings.account'), [
          renderMenuItem('person-outline', t('settings.editProfile'), () => router.push('/profile/edit')),
          renderMenuItem('key-outline', t('auth.password'), () => {
            Alert.alert(t('settings.tip'), t('auth.password') + t('common.loading'));
          }),
          renderMenuItem('shield-checkmark-outline', t('settings.account'), () => {
            Alert.alert(t('settings.tip'), t('settings.account') + t('common.loading'));
          }),
        ])}

        {/* 通知设置 */}
        {renderSection(t('settings.preferences'), [
          renderSwitchItem('notifications-outline', t('settings.notifications'), notificationsEnabled, setNotificationsEnabled),
          renderSwitchItem('mail-outline', t('settings.notifications'), autoPlayVideos, setAutoPlayVideos),
        ])}

        {/* 应用设置 */}
        {renderSection(t('settings.preferences'), [
          renderMenuItem('language-outline', t('settings.language'), () => {
            setShowLanguageSelector(true);
          }, <Text style={styles.menuItemValue}>{getLanguageName()}</Text>),
          renderMenuItem('color-palette-outline', t('settings.preferences'), () => {
            Alert.alert(t('settings.tip'), t('settings.preferences') + t('common.loading'));
          }, <Text style={styles.menuItemValue}>Auto</Text>),
          renderSwitchItem('play-outline', t('settings.autoPlayVideos'), autoPlayVideos, setAutoPlayVideos),
        ])}

        {/* 其他 */}
        {renderSection(t('settings.about'), [
          renderMenuItem('bug-outline', '🔍 资源加载诊断', () => router.push('/diagnostics')),
          renderMenuItem('trash-outline', t('settings.clearCache'), handleClearCache,
            <Text style={styles.menuItemValue}>0 MB</Text>
          ),
          renderMenuItem('information-circle-outline', t('settings.about'), () => {
            Alert.alert(t('settings.about') + ' Monna AI', t('settings.version') + ' 1.0.0\n\n一个强大的 AI 创作工具');
          }),
          renderMenuItem('document-text-outline', t('settings.termsOfService'), () => {
            Alert.alert(t('settings.tip'), t('settings.termsOfService') + t('common.loading'));
          }),
          renderMenuItem('shield-outline', t('settings.privacyPolicy'), () => {
            Alert.alert(t('settings.tip'), t('settings.privacyPolicy') + t('common.loading'));
          }),
        ])}

        {/* 危险区域 */}
        {renderSection(t('settings.actions'), [
          renderMenuItem('log-out-outline', t('settings.signOut'), handleSignOut, undefined, true),
        ])}

        {/* 版本信息 */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Monna AI v1.0.0</Text>
          <Text style={styles.versionSubText}>© 2024 All Rights Reserved</Text>
        </View>
      </ScrollView>

      {/* 语言选择器模态框 */}
      <LanguageSelector
        visible={showLanguageSelector}
        onClose={() => setShowLanguageSelector(false)}
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
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e5e5',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  menuItemTextDanger: {
    color: '#FF3B30',
  },
  menuItemValue: {
    fontSize: 14,
    color: '#999',
    marginRight: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 50,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  versionSubText: {
    fontSize: 12,
    color: '#ccc',
  },
});

