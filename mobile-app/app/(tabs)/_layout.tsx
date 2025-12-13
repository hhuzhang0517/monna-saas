
import React from 'react';
import { Stack } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { useTranslation } from '@/lib/contexts/i18n-context';

export default function TabLayout() {
  const { t } = useTranslation();

  const tabs: TabBarItem[] = [
    {
      name: 'image-generation',
      route: '/(tabs)/image-generation',
      icon: 'image',
      label: t('generate.imageTab', 'Image'),
    },
    {
      name: 'video-generation',
      route: '/(tabs)/video-generation',
      icon: 'videocam',
      label: t('generate.videoTab', 'Video'),
    },
    {
      name: 'movie-production',
      route: '/(tabs)/movie-production',
      icon: 'movie',
      label: t('generate.videoTab', 'Movie'),
    },
  ];

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <Stack.Screen key="image-generation" name="image-generation" />
        <Stack.Screen key="video-generation" name="video-generation" />
        <Stack.Screen key="movie-production" name="movie-production" />
        <Stack.Screen key="home" name="(home)" options={{ href: null }} />
        <Stack.Screen key="profile" name="profile" options={{ href: null }} />
        <Stack.Screen key="subscription" name="subscription" options={{ href: null }} />
      </Stack>
      <FloatingTabBar tabs={tabs} />
    </>
  );
}
