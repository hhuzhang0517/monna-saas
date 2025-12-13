import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { OptimizedImage } from './OptimizedImage';

interface ImageComparisonSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeImageLocalPath?: string; // 本地文件路径（优先使用）
  afterImageLocalPath?: string;  // 本地文件路径（优先使用）
  width?: number;
  height?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function ImageComparisonSlider({
  beforeImage,
  afterImage,
  beforeImageLocalPath,
  afterImageLocalPath,
  width = SCREEN_WIDTH - 48,
  height = 200
}: ImageComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50); // 0-100 percentage
  const [isDragging, setIsDragging] = useState(false);
  const animationRef = useRef<number | null>(null);
  const directionRef = useRef(1); // 1 for right, -1 for left
  const lastTimeRef = useRef(Date.now());

  // Auto-animation effect
  useEffect(() => {
    if (isDragging) return;

    const animate = () => {
      const now = Date.now();
      const delta = (now - lastTimeRef.current) / 16; // Normalize to ~60fps
      lastTimeRef.current = now;

      setSliderPosition(prev => {
        let newPos = prev + (directionRef.current * 0.3 * delta);

        // Bounce at edges
        if (newPos >= 100) {
          newPos = 100;
          directionRef.current = -1;
        } else if (newPos <= 0) {
          newPos = 0;
          directionRef.current = 1;
        }

        return newPos;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDragging]);

  // Pan responder for drag functionality
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
      },
      onPanResponderMove: (_, gestureState) => {
        const newPosition = (gestureState.moveX / width) * 100;
        setSliderPosition(Math.max(0, Math.min(100, newPosition)));
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
        lastTimeRef.current = Date.now();
      },
    })
  ).current;

  const clipWidth = (sliderPosition / 100) * width;

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Before Image (always visible) */}
      <OptimizedImage
        uri={beforeImage}
        localPath={beforeImageLocalPath}
        style={[styles.image, { width, height }]}
        containerStyle={[styles.image, { width, height }]}
        resizeMode="contain"
        showLoadingIndicator={true}
        showErrorRetry={true}
      />

      {/* After Image (clipped by slider position) */}
      <View
        style={[
          styles.afterImageContainer,
          { width: clipWidth, height }
        ]}
      >
        <OptimizedImage
          uri={afterImage}
          localPath={afterImageLocalPath}
          style={[styles.image, { width, height }]}
          containerStyle={[styles.image, { width, height }]}
          resizeMode="contain"
          showLoadingIndicator={true}
          showErrorRetry={true}
        />
      </View>

      {/* Slider Line and Handle */}
      <View
        {...panResponder.panHandlers}
        style={[
          styles.sliderLine,
          {
            left: clipWidth - 2,
            height,
          }
        ]}
      >
        <View style={styles.handle}>
          <View style={styles.arrow}>
            <View style={styles.arrowLeft} />
          </View>
          <View style={styles.arrow}>
            <View style={styles.arrowRight} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: colors.background,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  afterImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  sliderLine: {
    position: 'absolute',
    top: 0,
    width: 4,
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  arrow: {
    width: 8,
    height: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowLeft: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderTopColor: 'transparent',
    borderBottomWidth: 4,
    borderBottomColor: 'transparent',
    borderRightWidth: 6,
    borderRightColor: colors.text,
  },
  arrowRight: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderTopColor: 'transparent',
    borderBottomWidth: 4,
    borderBottomColor: 'transparent',
    borderLeftWidth: 6,
    borderLeftColor: colors.text,
  },
});
