import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, SafeAreaView, Dimensions, Pressable, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { borderRadius, spacing, typography } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, interpolateColor } from 'react-native-reanimated';
import { useAuthStore } from '../stores/authStore';
import { getAndroidBillingSkus, canAttemptAndroidBilling, purchaseAndroidTier } from '../services/payments/googlePlayBilling';
import { runtimeConfig } from '../config/runtimeConfig';

const { width } = Dimensions.get('window');

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function PricingScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [selectedTier, setSelectedTier] = useState<string | null>('1year');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const isAlreadyPro = user?.isPro || false;

  const TIERS = useMemo(() => [
    {
      id: '5days',
      title: '5 Days',
      price: 19,
      description: 'Perfect for quick revision',
      dailyCost: '₹3.80/day',
      tagline: 'Need a quick boost?',
      icon: 'disc', // Target-like
      color: colors.primary,
      productId: '5days',
    },
    {
      id: '15days',
      title: '15 Days',
      price: 49,
      description: 'Exam prep sprint',
      dailyCost: '₹3.27/day',
      badge: 'MOST POPULAR',
      icon: 'book', // Books
      color: colors.primary,
      productId: '15days',
    },
    {
      id: '1month',
      title: '1 Month',
      price: 79,
      description: 'Build your study habit',
      dailyCost: '₹2.63/day',
      savings: null,
      icon: 'trending-up', // Graph
      color: colors.primary,
      productId: '1month',
    },
    {
      id: '1year',
      title: '1 Year',
      price: 699,
      description: 'Master your exam - save ₹249',
      dailyCost: '₹1.91/day',
      badge: 'BEST VALUE',
      savings: 'SAVE ₹249',
      icon: 'ribbon', // Crown/Award-like
      color: colors.warning,
      isPremium: true,
      productId: '1year',
    },
  ], [colors]);

  const billingSkus = useMemo(
    () => getAndroidBillingSkus(TIERS.map(tier => tier.productId)),
    [TIERS]
  );
  const isAndroidBillingAvailable = Platform.OS === 'android' && canAttemptAndroidBilling();
  const selectedTierMeta = TIERS.find(tier => tier.id === selectedTier);
  const selectedProductId = selectedTierMeta?.productId;
  const isSelectedSkuConfigured = !!selectedProductId && billingSkus.includes(selectedProductId);
  const canCheckout =
    !!selectedTier &&
    !isPurchasing &&
    !isAlreadyPro &&
    isAndroidBillingAvailable &&
    isSelectedSkuConfigured;

  const handlePurchase = async () => {
    if (!selectedTier || isPurchasing || isAlreadyPro) return;
    const tier = TIERS.find(t => t.id === selectedTier);
    const productId = tier?.productId;
    if (!productId) return;

    if (Platform.OS !== 'android') {
      Alert.alert(
        'Android Billing Only',
        'Google Play Billing is currently enabled only for Android. iOS billing will be added in a later release.'
      );
      return;
    }

    if (!isAndroidBillingAvailable) {
      Alert.alert(
        'Billing Not Available',
        runtimeConfig.build.isRelease
          ? 'Payments are temporarily unavailable in this build.'
          : 'Billing is not configured yet for this development build.'
      );
      return;
    }

    if (!isSelectedSkuConfigured) {
      Alert.alert(
        'Plan Not Configured',
        'This plan is not mapped in EXPO_PUBLIC_ANDROID_BILLING_PRODUCT_IDS.'
      );
      return;
    }

    setIsPurchasing(true);
    try {
      const result = await purchaseAndroidTier({
        productId,
        userId: user?.id,
      });

      if (result.status === 'pending') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          'Purchase Pending',
          result.reason || 'Google Play has marked this purchase as pending. Please complete the payment in Play Store.'
        );
        return;
      }

      await useAuthStore.getState().checkSession();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Purchase Successful',
        `Pro access has been activated for the ${tier?.title || 'selected'} plan after payment verification.`,
        [{ text: 'Continue', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Purchase Failed',
        error?.message || 'Payment could not be verified. You were not charged for Pro access.'
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleSelectTier = (id: string) => {
    if (selectedTier !== id) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedTier(id);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Go Premium</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.heroSection}>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Unlock All Tests</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              Get unlimited access to all subjects, mock tests, and detailed solutions.
            </Text>
          </View>

          <View style={styles.tiersContainer}>
            {TIERS.map((tier) => (
              <TierCard
                key={tier.id}
                tier={tier}
                isSelected={selectedTier === tier.id}
                onSelect={() => handleSelectTier(tier.id)}
                isDark={isDark}
                colors={colors}
              />
            ))}
          </View>

          <View style={styles.featuresContainer}>
            <FeatureItem icon="checkmark-circle" text="Full access to 500+ tests" />
            <FeatureItem icon="checkmark-circle" text="Detailed performance analysis" />
            <FeatureItem icon="checkmark-circle" text="Offline access to solutions" />
            <FeatureItem icon="checkmark-circle" text="Ad-free experience" />
          </View>

          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            Prices are in INR. Subscriptions do not auto-renew.
          </Text>

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={[styles.bottomAction, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.buyButton,
              {
                backgroundColor: selectedTier ? (TIERS.find(t => t.id === selectedTier)?.color || colors.primary) : colors.border,
                opacity: canCheckout ? 1 : 0.6
              }
            ]}
            onPress={handlePurchase}
            disabled={!canCheckout}
            activeOpacity={0.8}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.buyButtonText}>{isAlreadyPro ? 'Pro Active' : 'Buy Now'}</Text>
                {selectedTier && !isAlreadyPro && canCheckout && (
                  <Text style={styles.buyButtonPrice}>
                    ₹{TIERS.find(t => t.id === selectedTier)?.price}
                  </Text>
                )}
              </>
            )}
          </TouchableOpacity>

          <View style={styles.secureBadgeInfo}>
            <Ionicons name="shield-checkmark" size={14} color={colors.success} />
            <Text style={[styles.secureText, { color: colors.textSecondary }]}>
              {Platform.OS === 'android'
                ? 'Secure Google Play Billing'
                : 'Android billing available first'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function TierCard({ tier, isSelected, onSelect, isDark, colors }: any) {
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(isSelected ? 1 : 0);

  React.useEffect(() => {
    scale.value = withSpring(isSelected ? 1.02 : 1, { damping: 15, stiffness: 200 });
    borderOpacity.value = withTiming(isSelected ? 1 : 0, { duration: 300 });
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: isSelected ? tier.color : colors.border,
    borderWidth: isSelected ? 2 : 1,
  }));

  return (
    <AnimatedPressable
      onPress={onSelect}
      style={[
        styles.tierCard,
        {
          backgroundColor: isDark ? colors.secondaryBackground : colors.card,
        },
        animatedStyle,
        tier.isPremium && styles.premiumCard
      ]}
    >
      {tier.badge && (
        <View style={[
          styles.badgeContainer,
          { backgroundColor: tier.color },
          tier.badge === 'BEST VALUE' && styles.bestValueBadge
        ]}>
          <Text style={styles.badgeText}>{tier.badge}</Text>
        </View>
      )}

      <View style={styles.cardContent}>
        <View style={[
          styles.iconContainer,
          { backgroundColor: isSelected ? tier.color : tier.color + '15' }
        ]}>
          <Ionicons name={tier.icon as any} size={24} color={isSelected ? '#FFFFFF' : tier.color} />
        </View>

        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.tierTitle, { color: colors.text }]}>{tier.title}</Text>
            {tier.savings && (
              <View style={[styles.savingsContainer, { backgroundColor: colors.success }]}>
                <Text style={styles.savingsText}>{tier.savings}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.tierDesc, { color: colors.textSecondary }]}>{tier.description}</Text>
          <Text style={[styles.dailyCost, { color: colors.textTertiary }]}>{tier.dailyCost}</Text>
        </View>

        <View style={styles.priceContainer}>
          <Text style={[styles.currency, { color: colors.text }]}>₹</Text>
          <Text style={[styles.price, { color: colors.text }]}>{tier.price}</Text>
        </View>

        {isSelected && (
          <View style={[styles.selectionCheck, { backgroundColor: tier.color }]}>
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon as any} size={20} color={colors.success} />
      <Text style={[styles.featureText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.headline,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  heroTitle: {
    ...typography.largeTitle,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    ...typography.body,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  tiersContainer: {
    gap: 16, // Increased from spacing.md
    marginBottom: spacing.xl,
  },
  tierCard: {
    borderRadius: borderRadius.lg,
    padding: 20, // Increased from spacing.md
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 100,
    backgroundColor: '#FFFFFF', // Default light bg, overridden by props
  },
  premiumCard: {
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6, // Increased spacing
    gap: spacing.sm,
  },
  tierTitle: {
    ...typography.headline,
    fontWeight: '700',
  },
  tierDesc: {
    ...typography.caption1,
    fontWeight: '500',
    marginBottom: 4,
    lineHeight: 18, // Increased line height
    opacity: 0.9,
  },
  dailyCost: {
    fontSize: 11,
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: spacing.sm,
  },
  currency: {
    ...typography.subhead,
    fontWeight: '600',
    marginTop: 4,
    marginRight: 2,
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  badgeContainer: {
    position: 'absolute',
    top: -10,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    zIndex: 10,
  },
  bestValueBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  savingsContainer: {
    backgroundColor: '#34C759', // This is success color, but static style. Can't easy inject theme here without refactor. Keep as is or move to inline.
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  savingsText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  selectionCheck: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    zIndex: 5,
  },
  featuresContainer: {
    marginTop: spacing.lg,
    backgroundColor: 'rgba(120, 120, 128, 0.05)', // SystemGray6 like, semi-transparent
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  featureText: {
    ...typography.subhead,
    fontWeight: '500',
  },
  footerText: {
    ...typography.caption2,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
  },
  buyButton: {
    height: 56,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buyButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buyButtonPrice: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '500',
    opacity: 0.9,
  },
  secureBadgeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    gap: 6,
  },
  secureText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
