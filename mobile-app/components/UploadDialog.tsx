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
import { useTranslation } from '@/lib/contexts/i18n-context';

interface UploadDialogProps {
  visible: boolean;
  onClose: () => void;
  onGenerate: (images: { image1?: string; image2?: string }) => void;
  templateTitle: string;
  templateCategory: string;
  requiresTwoImages: boolean; // 是否需要两张图片（穿戴和合影）
}

export function UploadDialog({
  visible,
  onClose,
  onGenerate,
  templateTitle,
  templateCategory,
  requiresTwoImages
}: UploadDialogProps) {
  const { t } = useTranslation();
  const [image1, setImage1] = useState<string | null>(null);
  const [image2, setImage2] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const pickImage = async (imageNumber: 1 | 2) => {
    try {
      // 请求权限
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('generate.mediaPermissionTitle', 'Photo Access Needed'),
          t('generate.mediaPermissionMessage', 'Please allow photo library access to upload images')
        );
        return;
      }

      // 选择图片
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (imageNumber === 1) {
          setImage1(result.assets[0].uri);
        } else {
          setImage2(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('选择图片失败:', error);
      Alert.alert(
        t('common.error', 'Error'),
        t('generate.uploadFailed', 'Upload failed')
      );
    }
  };

  const handleGenerate = () => {
    if (requiresTwoImages) {
      if (!image1 || !image2) {
        Alert.alert(
          t('settings.tip', 'Tip'),
          t('generate.uploadTwoImages', 'Please upload two images')
        );
        return;
      }
      onGenerate({ image1, image2 });
    } else {
      if (!image1) {
        Alert.alert(
          t('settings.tip', 'Tip'),
          t('generate.pleaseUploadImage', 'Please upload an image')
        );
        return;
      }
      onGenerate({ image1 });
    }
  };

  const handleClose = () => {
    setImage1(null);
    setImage2(null);
    onClose();
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
              {/* 第一张图片 */}
              <View style={styles.uploadBox}>
                <Text style={styles.uploadLabel}>
                  {requiresTwoImages ? t('generate.uploadImagePlaceholder', 'Upload image') + ' 1' : t('generate.uploadImagePlaceholder', 'Upload image')}
                </Text>
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={() => pickImage(1)}
                >
                  {image1 ? (
                    <Image source={{ uri: image1 }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.placeholderContainer}>
                      <IconSymbol
                        ios_icon_name="plus.circle.fill"
                        android_material_icon_name="add-circle"
                        size={48}
                        color={colors.primary}
                      />
                      <Text style={styles.placeholderText}>{t('generate.uploadPhoto', 'Upload Photo')}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* 第二张图片（穿戴和合影需要） */}
              {requiresTwoImages && (
                <View style={styles.uploadBox}>
                  <Text style={styles.uploadLabel}>{t('generate.uploadSecondImagePlaceholder', 'Upload image 2')}</Text>
                  <TouchableOpacity
                    style={styles.imagePickerButton}
                    onPress={() => pickImage(2)}
                  >
                    {image2 ? (
                      <Image source={{ uri: image2 }} style={styles.previewImage} />
                    ) : (
                      <View style={styles.placeholderContainer}>
                        <IconSymbol
                          ios_icon_name="plus.circle.fill"
                          android_material_icon_name="add-circle"
                          size={48}
                          color={colors.primary}
                        />
                        <Text style={styles.placeholderText}>{t('generate.uploadPhoto', 'Upload Photo')}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 提示文本 */}
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>{t('settings.tip', 'Tip')}:</Text>
              {requiresTwoImages ? (
                <>
                  <Text style={styles.tipsText}>
                    • {t('generate.uploadImagePlaceholder', 'Upload image')} 1: Portrait photo{'\n'}
                    • {t('generate.uploadImagePlaceholder', 'Upload image')} 2: {templateCategory === 'dressup' ? 'Accessories or clothes' : 'Another portrait'}
                  </Text>
                </>
              ) : (
                <Text style={styles.tipsText}>
                  • Recommended: Clear portrait photos{'\n'}
                  • Supported formats: JPG, PNG{'\n'}
                  • Max file size: 10MB
                </Text>
              )}
            </View>
          </ScrollView>

          {/* 生成按钮 */}
          <TouchableOpacity
            style={[
              styles.generateButton,
              (!image1 || (requiresTwoImages && !image2)) && styles.generateButtonDisabled
            ]}
            onPress={handleGenerate}
            disabled={!image1 || (requiresTwoImages && !image2) || isUploading}
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
                <Text style={styles.generateButtonText}>{t('generate.startGenerating', 'Start Generating')}</Text>
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
  imagePickerButton: {
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
