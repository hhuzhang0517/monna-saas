import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface VideoUploadDialogProps {
  visible: boolean;
  onClose: () => void;
  onGenerate: (files: { video?: string; image?: string }) => void;
  templateTitle: string;
  category: 'effects' | 'animation' | 'fantasy';
  imageToVideo?: boolean; // 是否为图片转视频模式
  needsFaceSwap?: boolean; // 是否需要换脸（角色迁移）
}

export function VideoUploadDialog({
  visible,
  onClose,
  onGenerate,
  templateTitle,
  category,
  imageToVideo = false,
  needsFaceSwap = false,
}: VideoUploadDialogProps) {
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 选择视频
  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('需要权限', '请允许访问相册以上传视频');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setVideoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('选择视频失败:', error);
      Alert.alert('错误', '选择视频失败，请重试');
    }
  };

  // 选择图片
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('需要权限', '请允许访问相册以上传图片');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('选择图片失败:', error);
      Alert.alert('错误', '选择图片失败，请重试');
    }
  };

  // 处理生成
  const handleGenerate = () => {
    if (imageToVideo) {
      // 图片转视频：只需要图片
      if (!imageUri) {
        Alert.alert('提示', '请上传一张图片');
        return;
      }
      onGenerate({ image: imageUri });
    } else if (needsFaceSwap) {
      // 换脸：需要视频和图片
      if (!videoUri || !imageUri) {
        Alert.alert('提示', '请上传视频和人脸图片');
        return;
      }
      onGenerate({ video: videoUri, image: imageUri });
    } else {
      // 其他：只需要视频
      if (!videoUri) {
        Alert.alert('提示', '请上传视频');
        return;
      }
      onGenerate({ video: videoUri });
    }
  };

  // 关闭对话框
  const handleClose = () => {
    setVideoUri(null);
    setImageUri(null);
    onClose();
  };

  // 获取提示文本
  const getTipsText = () => {
    if (imageToVideo) {
      return (
        <>
          <Text style={styles.tipsText}>
            • 上传一张清晰的图片{'\n'}
            • 将自动转换为动态视频{'\n'}
            • 支持 JPG、PNG 格式
          </Text>
        </>
      );
    } else if (needsFaceSwap) {
      return (
        <>
          <Text style={styles.tipsText}>
            • 视频: 原始视频素材{'\n'}
            • 图片: 要替换的人脸照片{'\n'}
            • 确保人脸清晰可见
          </Text>
        </>
      );
    } else {
      return (
        <>
          <Text style={styles.tipsText}>
            • 上传一段清晰的视频{'\n'}
            • 时长建议在 10 秒以内{'\n'}
            • 支持 MP4 格式
          </Text>
        </>
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* 标题栏 */}
          <View style={styles.header}>
            <Text style={styles.title}>{templateTitle}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <IconSymbol
                ios_icon_name="xmark"
                android_material_icon_name="close"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* 上传区域 */}
            <View style={styles.uploadContainer}>
              {/* 视频上传（如果需要） */}
              {!imageToVideo && (
                <View style={styles.uploadBox}>
                  <Text style={styles.uploadLabel}>上传视频</Text>
                  <TouchableOpacity
                    style={styles.mediaPickerButton}
                    onPress={pickVideo}
                  >
                    {videoUri ? (
                      <View style={styles.videoSelectedContainer}>
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check-circle"
                          size={64}
                          color={colors.primary}
                        />
                        <Text style={styles.videoSelectedText}>视频已选择</Text>
                        <Text style={styles.videoSelectedSubText} numberOfLines={1}>
                          {videoUri.split('/').pop()}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.placeholderContainer}>
                        <IconSymbol
                          ios_icon_name="video.badge.plus"
                          android_material_icon_name="videocam"
                          size={48}
                          color={colors.primary}
                        />
                        <Text style={styles.placeholderText}>点击上传视频</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* 图片上传（图片转视频或换脸需要） */}
              {(imageToVideo || needsFaceSwap) && (
                <View style={styles.uploadBox}>
                  <Text style={styles.uploadLabel}>
                    {imageToVideo ? '上传图片' : '上传人脸图片'}
                  </Text>
                  <TouchableOpacity
                    style={styles.mediaPickerButton}
                    onPress={pickImage}
                  >
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.previewImage} />
                    ) : (
                      <View style={styles.placeholderContainer}>
                        <IconSymbol
                          ios_icon_name="photo.badge.plus"
                          android_material_icon_name="add-photo-alternate"
                          size={48}
                          color={colors.primary}
                        />
                        <Text style={styles.placeholderText}>点击上传图片</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 提示文本 */}
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>提示：</Text>
              {getTipsText()}
            </View>
          </ScrollView>

          {/* 生成按钮 */}
          <TouchableOpacity
            style={[
              styles.generateButton,
              (
                (imageToVideo && !imageUri) ||
                (needsFaceSwap && (!videoUri || !imageUri)) ||
                (!imageToVideo && !needsFaceSwap && !videoUri)
              ) && styles.generateButtonDisabled
            ]}
            onPress={handleGenerate}
            disabled={
              (imageToVideo && !imageUri) ||
              (needsFaceSwap && (!videoUri || !imageUri)) ||
              (!imageToVideo && !needsFaceSwap && !videoUri) ||
              isUploading
            }
          >
            {isUploading ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="wand.and.stars"
                  android_material_icon_name="auto-fix-high"
                  size={24}
                  color={colors.card}
                />
                <Text style={styles.generateButtonText}>开始生成</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 16,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    maxHeight: 500,
  },
  uploadContainer: {
    gap: 16,
    marginBottom: 20,
  },
  uploadBox: {
    gap: 8,
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  mediaPickerButton: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  videoSelectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  videoSelectedText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  videoSelectedSubText: {
    fontSize: 12,
    color: colors.textSecondary,
    maxWidth: '80%',
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  tipsContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
  },
  generateButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  generateButtonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '600',
  },
});

