import React from "react";
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { GlassView } from "expo-glass-effect";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSubscription } from "@/lib/contexts/SubscriptionContext";
import { useAuth } from "@/lib/contexts/auth-context";

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { currentPlan, hasSubscription } = useSubscription();

  const getPlanDisplayName = () => {
    switch (currentPlan) {
      case 'basic': return '基础档';
      case 'pro': return '专业档';
      case 'enterprise': return '至尊档';
      default: return '免费版';
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          Platform.OS !== 'ios' && styles.contentContainerWithTabBar
        ]}
      >
        {/* 用户信息 */}
        <GlassView style={[
          styles.profileHeader,
          Platform.OS !== 'ios' && { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} glassEffectStyle="regular">
          <IconSymbol ios_icon_name="person.circle.fill" android_material_icon_name="person" size={80} color={theme.colors.primary} />
          <Text style={[styles.name, { color: theme.colors.text }]}>{user?.email?.split('@')[0] || 'User'}</Text>
          <Text style={[styles.email, { color: theme.dark ? '#98989D' : '#666' }]}>{user?.email}</Text>

          {/* 订阅状态徽章 */}
          <View style={[
            styles.planBadge,
            hasSubscription ? styles.planBadgeActive : styles.planBadgeFree
          ]}>
            <Ionicons
              name={hasSubscription ? "star" : "star-outline"}
              size={16}
              color={hasSubscription ? "#FFD700" : "#9CA3AF"}
            />
            <Text style={[
              styles.planBadgeText,
              hasSubscription ? styles.planBadgeTextActive : styles.planBadgeTextFree
            ]}>
              {getPlanDisplayName()}
            </Text>
          </View>
        </GlassView>

        {/* 订阅卡片 */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/subscription')}
          activeOpacity={0.7}
        >
          <GlassView style={[
            styles.subscriptionCard,
            Platform.OS !== 'ios' && { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
          ]} glassEffectStyle="regular">
            <View style={styles.subscriptionContent}>
              <View style={styles.subscriptionIcon}>
                <Ionicons name="gift" size={28} color="#FF6B00" />
              </View>
              <View style={styles.subscriptionTextContainer}>
                <Text style={[styles.subscriptionTitle, { color: theme.colors.text }]}>
                  {hasSubscription ? '管理订阅' : '升级会员'}
                </Text>
                <Text style={[styles.subscriptionSubtitle, { color: theme.dark ? '#98989D' : '#666' }]}>
                  {hasSubscription ? '查看和管理您的订阅计划' : '解锁更多强大的 AI 功能'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.dark ? '#98989D' : '#666'} />
            </View>
          </GlassView>
        </TouchableOpacity>

        {/* 其他信息 */}
        <GlassView style={[
          styles.section,
          Platform.OS !== 'ios' && { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} glassEffectStyle="regular">
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>账户信息</Text>
          <View style={styles.infoRow}>
            <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={20} color={theme.dark ? '#98989D' : '#666'} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>用户 ID: {user?.id?.slice(0, 8)}...</Text>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol ios_icon_name="calendar.fill" android_material_icon_name="calendar-today" size={20} color={theme.dark ? '#98989D' : '#666'} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              创建时间: {user?.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '未知'}
            </Text>
          </View>
        </GlassView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // backgroundColor handled dynamically
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  contentContainerWithTabBar: {
    paddingBottom: 100, // Extra padding for floating tab bar
  },
  profileHeader: {
    alignItems: 'center',
    borderRadius: 12,
    padding: 32,
    marginBottom: 16,
    gap: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    // color handled dynamically
  },
  email: {
    fontSize: 16,
    // color handled dynamically
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  planBadgeActive: {
    backgroundColor: '#FFD70020',
  },
  planBadgeFree: {
    backgroundColor: '#9CA3AF20',
  },
  planBadgeText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  planBadgeTextActive: {
    color: '#FFD700',
  },
  planBadgeTextFree: {
    color: '#9CA3AF',
  },
  subscriptionCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  subscriptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscriptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B0020',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subscriptionTextContainer: {
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subscriptionSubtitle: {
    fontSize: 14,
  },
  section: {
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    // color handled dynamically
  },
});
