import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/contexts/auth-context';
import { supabase } from '@/lib/supabase/client';
import { colors } from '@/styles/commonStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileEditScreen() {
  const { user, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [name, setName] = useState('');
  const [gender, setGender] = useState('not_specified');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) {
      router.back();
      return;
    }

    try {
      setLoading(true);
      
      // 从profiles表获取用户信息
      const { data, error } = await supabase
        .from('profiles')
        .select('name, gender')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 是没有找到记录的错误，可以忽略
        console.error('加载用户信息失败:', error);
      }

      if (data) {
        setName(data.name || '');
        setGender(data.gender || 'not_specified');
      } else {
        // 如果没有profile记录，使用user_metadata
        setName(user.user_metadata?.name || '');
        setGender(user.user_metadata?.gender || 'not_specified');
      }
    } catch (error) {
      console.error('加载用户信息异常:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('提示', '请输入姓名');
      return;
    }

    try {
      setSaving(true);

      // 更新profiles表
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user!.id,
          name: name.trim(),
          gender: gender,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('保存失败:', error);
        Alert.alert('错误', '保存失败，请重试');
        return;
      }

      // 刷新用户信息
      await refreshUser();

      Alert.alert('成功', '个人信息已更新', [
        {
          text: '确定',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('保存异常:', error);
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>个人信息</Text>
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
        <Text style={styles.headerTitle}>个人信息</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* 头像区域 */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {name ? name.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() || 'U')}
            </Text>
          </View>
          <TouchableOpacity style={styles.changeAvatarButton}>
            <Text style={styles.changeAvatarText}>更换头像</Text>
          </TouchableOpacity>
        </View>

        {/* 表单区域 */}
        <View style={styles.formSection}>
          {/* 姓名 */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>姓名</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="请输入姓名"
              placeholderTextColor="#999"
            />
          </View>

          {/* 性别 */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>性别</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  gender === 'not_specified' && styles.genderButtonActive,
                ]}
                onPress={() => setGender('not_specified')}
              >
                <Text
                  style={[
                    styles.genderButtonText,
                    gender === 'not_specified' && styles.genderButtonTextActive,
                  ]}
                >
                  未指定
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  gender === 'male' && styles.genderButtonActive,
                ]}
                onPress={() => setGender('male')}
              >
                <Text
                  style={[
                    styles.genderButtonText,
                    gender === 'male' && styles.genderButtonTextActive,
                  ]}
                >
                  男
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  gender === 'female' && styles.genderButtonActive,
                ]}
                onPress={() => setGender('female')}
              >
                <Text
                  style={[
                    styles.genderButtonText,
                    gender === 'female' && styles.genderButtonTextActive,
                  ]}
                >
                  女
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  gender === 'other' && styles.genderButtonActive,
                ]}
                onPress={() => setGender('other')}
              >
                <Text
                  style={[
                    styles.genderButtonText,
                    gender === 'other' && styles.genderButtonTextActive,
                  ]}
                >
                  其他
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 邮箱（不可编辑） */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>邮箱</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={user?.email || ''}
              editable={false}
            />
            <Text style={styles.hint}>邮箱地址不可修改</Text>
          </View>

          {/* 手机号（如果有） */}
          {user?.phone && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>手机号</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={user.phone}
                editable={false}
              />
              <Text style={styles.hint}>手机号不可修改</Text>
            </View>
          )}
        </View>

        {/* 保存按钮 */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>保存</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  changeAvatarButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  changeAvatarText: {
    fontSize: 14,
    color: '#666',
  },
  formSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  genderButtonActive: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  genderButtonText: {
    fontSize: 14,
    color: '#666',
  },
  genderButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  saveButton: {
    marginHorizontal: 16,
    height: 48,
    backgroundColor: colors.orange,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

