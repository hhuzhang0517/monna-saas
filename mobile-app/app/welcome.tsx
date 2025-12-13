
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { LoginModal } from '@/components/LoginModal';
import { useAuth } from '@/lib/contexts/auth-context';
import { getAssetUrl, getApiUrl } from '@/config/api';
import { useTranslation } from '@/lib/contexts/i18n-context';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const player = useVideoPlayer(
    getAssetUrl("figma-designs/demo1.mp4"),
    (player) => {
      player.loop = true;
      player.muted = true;
      player.play();
    }
  );

  // 如果用户已登录，自动跳转到主页
  useEffect(() => {
    if (!loading && user) {
      router.replace('/(tabs)/image-generation');
    }
  }, [user, loading]);

  const handleStart = () => {
    // 检查是否已登录
    if (user) {
      // 已登录，直接跳转
      router.replace('/(tabs)/image-generation');
    } else {
      // 未登录，显示登录弹窗
      setShowLoginModal(true);
    }
  };

  const handleLoginSuccess = () => {
    // 登录成功后关闭弹窗并跳转
    setShowLoginModal(false);
    router.replace('/(tabs)/image-generation');
  };

  const handlePricing = () => {
    console.log('Pricing button pressed');
    // 跳转到订阅页面
    router.push('/(tabs)/subscription');
  };

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />
      
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
        locations={[0, 0.5, 1]}
        style={styles.overlay}
      />

      <View style={styles.topBar}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Monna AI</Text>
        </View>
        
        <TouchableOpacity style={styles.pricingButton} onPress={handlePricing}>
          <Text style={styles.pricingButtonText}>{t('common.pricing', 'Pricing')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startButtonText}>{t('home.ctaGuest', 'Get Started')}</Text>
        </TouchableOpacity>
      </View>

      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  logoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backdropFilter: 'blur(10px)',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  pricingButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  pricingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  startButton: {
    backgroundColor: colors.orange,
    paddingHorizontal: 60,
    paddingVertical: 18,
    borderRadius: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    boxShadow: '0px 8px 24px rgba(255, 87, 34, 0.4)',
    elevation: 8,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
