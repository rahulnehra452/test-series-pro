import { Platform } from 'react-native';
import {
  endConnection,
  fetchProducts,
  finishTransaction,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Purchase,
} from 'expo-iap';
import { supabase } from '../../lib/supabase';
import { isProductionBillingEnabled, runtimeConfig } from '../../config/runtimeConfig';

const PURCHASE_TIMEOUT_MS = 120000;

export type VerifyGooglePlayPurchaseRequest = {
  purchaseToken: string;
  productId: string;
  platform: 'android';
};

export type VerifyGooglePlayPurchaseResponse = {
  entitled: boolean;
  reason?: string;
};

export type AndroidPurchaseResult = {
  status: 'success' | 'pending';
  reason?: string;
};

export const getAndroidBillingSkus = (fallbackSkus: string[]): string[] => {
  if (runtimeConfig.billing.androidProductIds.length > 0) {
    return runtimeConfig.billing.androidProductIds;
  }
  if (runtimeConfig.build.isDevelopment) {
    return fallbackSkus;
  }
  return [];
};

export const canAttemptAndroidBilling = (): boolean => {
  return Platform.OS === 'android' && isProductionBillingEnabled;
};

const createPurchaseEventWaiter = (productId: string) => {
  let settled = false;
  let purchaseSub: { remove: () => void } | null = null;
  let errorSub: { remove: () => void } | null = null;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const cleanup = () => {
    if (purchaseSub) purchaseSub.remove();
    if (errorSub) errorSub.remove();
    if (timeoutHandle) clearTimeout(timeoutHandle);
    purchaseSub = null;
    errorSub = null;
    timeoutHandle = null;
  };

  const purchasePromise = new Promise<Purchase>((resolve, reject) => {
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(message));
    };

    const succeed = (purchase: Purchase) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(purchase);
    };

    timeoutHandle = setTimeout(() => {
      fail('Purchase confirmation timed out. Please try again.');
    }, PURCHASE_TIMEOUT_MS);

    purchaseSub = purchaseUpdatedListener((purchase) => {
      const productIds = [purchase.productId, ...(purchase.ids || [])].filter(Boolean) as string[];
      if (!productIds.includes(productId)) return;
      succeed(purchase);
    });

    errorSub = purchaseErrorListener((error) => {
      fail(error.message || 'Purchase failed. Please try again.');
    });
  });

  return { purchasePromise, cleanup };
};

const verifyPurchaseWithBackend = async (
  payload: VerifyGooglePlayPurchaseRequest
): Promise<VerifyGooglePlayPurchaseResponse> => {
  const { data, error } = await supabase.functions.invoke<VerifyGooglePlayPurchaseResponse>(
    'verify-google-play-purchase',
    { body: payload }
  );

  if (error) {
    throw new Error(error.message || 'Purchase verification failed.');
  }

  if (!data?.entitled) {
    throw new Error(data?.reason || 'Purchase was not approved by the server.');
  }

  return data;
};

export const purchaseAndroidTier = async (params: {
  productId: string;
  userId?: string;
}): Promise<AndroidPurchaseResult> => {
  if (Platform.OS !== 'android') {
    throw new Error('Google Play Billing is only supported on Android.');
  }

  if (!isProductionBillingEnabled) {
    throw new Error('Billing is not configured for this build.');
  }

  const { productId, userId } = params;
  await initConnection();

  try {
    const products = await fetchProducts({ skus: [productId], type: 'in-app' });
    const productList = products || [];
    const productFound = productList.some(product => product.id === productId);

    if (!productFound) {
      throw new Error('Selected plan is not available in Google Play for this build.');
    }

    const waiter = createPurchaseEventWaiter(productId);

    try {
      await requestPurchase({
        request: {
          google: {
            skus: [productId],
            obfuscatedAccountId: userId,
          },
        },
        type: 'in-app',
      });

      const purchase = await waiter.purchasePromise;

      if (purchase.purchaseState === 'pending') {
        return {
          status: 'pending',
          reason: 'Purchase is pending confirmation from Google Play.',
        };
      }

      const purchaseToken = purchase.purchaseToken;
      if (!purchaseToken) {
        throw new Error('Missing purchase token from Google Play.');
      }

      const verification = await verifyPurchaseWithBackend({
        purchaseToken,
        productId,
        platform: 'android',
      });

      await finishTransaction({ purchase, isConsumable: false });

      return {
        status: 'success',
        reason: verification.reason,
      };
    } finally {
      waiter.cleanup();
    }
  } finally {
    await endConnection().catch(() => {
      // Ignore cleanup failures so purchase errors remain readable to users.
    });
  }
};
