
import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger key="image-generation" name="image-generation">
        <Icon sf="photo.fill" />
        <Label>图片生成</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="video-generation" name="video-generation">
        <Icon sf="video.fill" />
        <Label>视频生成</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="movie-production" name="movie-production">
        <Icon sf="film.fill" />
        <Label>电影制作</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
