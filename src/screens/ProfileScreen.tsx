import React, { useState } from 'react';
import { StyleSheet, View, Text, Switch, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, typography, borderRadius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/common/Card';
import { useAuthStore } from '../stores/authStore';
import { EditProfileModal } from '../components/profile/EditProfileModal';
import { ScaleButton } from '../components/common/ScaleButton';
import Animated, { FadeInDown } from 'react-native-reanimated';

const MenuItem = ({ icon, label, value, onPress, isSwitch, onSwitchChange }: any) => {
  const { colors } = useTheme();

  const content = (
    <View style={[styles.menuItem, { borderBottomColor: colors.border }]}>
      <View style={styles.menuLeft}>
        <View style={[styles.iconBox, { backgroundColor: colors.secondaryBackground }]}>
          <Ionicons name={icon} size={20} color={colors.text} />
        </View>
        <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
      </View>

      {isSwitch ? (
        <Switch
          value={value}
          onValueChange={onSwitchChange}
          trackColor={{ false: '#767577', true: colors.primary }}
        />
      ) : (
        <View style={styles.menuRight}>
          {value && <Text style={[styles.menuValue, { color: colors.textSecondary }]}>{value}</Text>}
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </View>
      )}
    </View>
  );

  if (isSwitch) {
    return (
      <View style={{ backgroundColor: colors.card }}>
        {content}
      </View>
    );
  }

  return (
    <ScaleButton onPress={onPress} style={{ backgroundColor: colors.card }}>
      {content}
    </ScaleButton>
  );
};

export default function ProfileScreen() {
  const { colors, theme, setThemePreference, isDark } = useTheme();
  const { user, logout } = useAuthStore();
  const navigation = useNavigation<any>();
  const [modalVisible, setModalVisible] = useState(false);

  const toggleTheme = (value: boolean) => {
    setThemePreference(value ? 'dark' : 'light');
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          logout();
        }
      }
    ]);
  };

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name[0]?.toUpperCase() || 'U';
  };

  const insets = useSafeAreaInsets();

  if (!user) return null; // Should ideally redirect to login

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + spacing.md }}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
      </View>

      <Animated.View
        entering={FadeInDown.delay(100).springify()}
        style={styles.profileHeader}
      >
        <View style={[styles.avatar, { backgroundColor: colors.primaryLight, overflow: 'hidden' }]}>
          {user.avatar ? (
            <Image
              source={{ uri: user.avatar }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
          )}
        </View>
        <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user.email}</Text>
        {user.isPro && (
          <View style={[styles.planBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.planText}>PRO MEMBER</Text>
          </View>
        )}
      </Animated.View>

      <Animated.View style={styles.section} entering={FadeInDown.delay(200).springify()}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PREFERENCES</Text>
        <Card style={styles.card}>
          <MenuItem
            icon="moon-outline"
            label="Dark Mode"
            isSwitch
            value={isDark}
            onSwitchChange={toggleTheme}
          />
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            isSwitch
            value={true}
          />
        </Card>
      </Animated.View>

      <Animated.View style={styles.section} entering={FadeInDown.delay(300).springify()}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ACCOUNT</Text>
        <Card style={styles.card}>
          <MenuItem icon="person-outline" label="Edit Profile" onPress={() => setModalVisible(true)} />
          {/* Admin / Dev only */}
          <MenuItem
            icon="cloud-upload-outline"
            label="Sync Data (Admin)"
            onPress={() => navigation.navigate('SeedData')}
          />
          <MenuItem
            icon="card-outline"
            label="Subscription"
            value={user.isPro ? "Active" : "Inactive"}
            onPress={() => navigation.navigate('Pricing')}
          />
          <MenuItem icon="help-circle-outline" label="Help & Support" onPress={() => { }} />
        </Card>
      </Animated.View>

      <ScaleButton onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Log Out</Text>
      </ScaleButton>

      <Text style={[styles.versionText, { color: colors.textTertiary }]}>Version 1.0.0</Text>
      <View style={{ height: 100 }} />

      <EditProfileModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.largeTitle,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    ...typography.largeTitle,
    color: '#FFFFFF',
  },
  userName: {
    ...typography.title2,
    fontWeight: '700',
    marginBottom: 2,
  },
  userEmail: {
    ...typography.subhead,
    marginBottom: spacing.md,
  },
  planBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  planText: {
    ...typography.caption2,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 1,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.caption1,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 0.5,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    ...typography.body,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  menuValue: {
    ...typography.subhead,
  },
  logoutButton: {
    alignItems: 'center',
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  logoutText: {
    ...typography.body,
    color: '#FF3B30',
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    ...typography.caption2,
    marginTop: spacing.sm,
  },
});
