
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { TopNavigationBar } from '@/components/TopNavigationBar';

export default function MovieProductionScreen() {
  const [videoIdea, setVideoIdea] = useState('');

  return (
    <View style={styles.container}>
      <TopNavigationBar />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <IconSymbol
                ios_icon_name="video.fill"
                android_material_icon_name="videocam"
                size={80}
                color="#CCCCCC"
              />
            </View>
          </View>

          <Text style={styles.actionTitle}>开始创作电影或广告</Text>
          <Text style={styles.actionSubtitle}>描述您想要创建的内容</Text>
        </View>

        <View style={styles.inputSection}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="描述您的视频内容创意，AI将帮助您规划和创建专业视频内容..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={6}
              value={videoIdea}
              onChangeText={setVideoIdea}
              textAlignVertical="top"
            />
            <View style={styles.inputActions}>
              <TouchableOpacity style={styles.attachButton}>
                <IconSymbol
                  ios_icon_name="photo"
                  android_material_icon_name="image"
                  size={24}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendButton}>
                <IconSymbol
                  ios_icon_name="paperplane.fill"
                  android_material_icon_name="send"
                  size={24}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'android' ? 52 : 64, // Increased by 50px to avoid status bar overlap
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  mainContent: {
    alignItems: 'center',
    marginBottom: 60,
    paddingHorizontal: 20,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconBackground: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
    elevation: 3,
  },
  actionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  inputSection: {
    width: '100%',
  },
  inputContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textInput: {
    fontSize: 15,
    color: colors.text,
    minHeight: 120,
    marginBottom: 12,
    lineHeight: 22,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attachButton: {
    padding: 8,
  },
  sendButton: {
    padding: 8,
  },
});
