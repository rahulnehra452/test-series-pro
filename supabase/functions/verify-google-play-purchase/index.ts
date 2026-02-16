// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

type VerifyRequest = {
  purchaseToken: string;
  productId: string;
  platform: 'android' | string;
};

type VerifyResponse = {
  entitled: boolean;
  reason: string;
};

type GoogleServiceAccount = {
  client_email: string;
  private_key: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonResponse = (status: number, payload: VerifyResponse) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const toBase64Url = (input: string | ArrayBuffer): string => {
  let binary = '';

  if (typeof input === 'string') {
    binary = input;
  } else {
    const bytes = new Uint8Array(input);
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const pemToArrayBuffer = (pem: string): ArrayBuffer => {
  const base64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const createGoogleAccessToken = async (serviceAccount: GoogleServiceAccount): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedClaims = toBase64Url(JSON.stringify(claims));
  const unsignedJwt = `${encodedHeader}.${encodedClaims}`;

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(unsignedJwt)
  );

  const assertion = `${unsignedJwt}.${toBase64Url(signature)}`;
  const tokenBody = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody,
  });

  if (!tokenResponse.ok) {
    const details = await tokenResponse.text();
    throw new Error(`Google auth failed: ${details}`);
  }

  const tokenJson = await tokenResponse.json();
  if (!tokenJson.access_token) {
    throw new Error('Google auth returned no access token.');
  }

  return tokenJson.access_token as string;
};

const verifyWithGooglePlay = async (params: {
  accessToken: string;
  packageName: string;
  productId: string;
  purchaseToken: string;
}) => {
  const { accessToken, packageName, productId, purchaseToken } = params;
  const baseUrl =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${encodeURIComponent(packageName)}/purchases/products/${encodeURIComponent(productId)}` +
    `/tokens/${encodeURIComponent(purchaseToken)}`;

  const verifyResponse = await fetch(baseUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (verifyResponse.status === 404) {
    return { ok: false as const, reason: 'Purchase token was not found in Google Play.' };
  }

  if (!verifyResponse.ok) {
    const details = await verifyResponse.text();
    throw new Error(`Google Play verification failed: ${details}`);
  }

  const payload = await verifyResponse.json();
  const purchaseState = Number(payload.purchaseState ?? -1);
  const acknowledgementState = Number(payload.acknowledgementState ?? -1);

  if (purchaseState !== 0) {
    return {
      ok: false as const,
      reason: purchaseState === 2
        ? 'Purchase is pending in Google Play.'
        : 'Purchase is not in purchased state.',
      payload,
      purchaseState,
      acknowledgementState,
    };
  }

  if (acknowledgementState === 0) {
    const acknowledgeResponse = await fetch(`${baseUrl}:acknowledge`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ developerPayload: 'verified_by_supabase' }),
    });

    if (!acknowledgeResponse.ok) {
      const details = await acknowledgeResponse.text();
      throw new Error(`Failed to acknowledge purchase: ${details}`);
    }
  }

  return {
    ok: true as const,
    payload,
    purchaseState,
    acknowledgementState,
  };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const serviceAccountJson = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
    const packageName = Deno.env.get('GOOGLE_PLAY_PACKAGE_NAME');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse(500, {
        entitled: false,
        reason: 'Supabase Edge secrets are missing.',
      });
    }

    if (!serviceAccountJson || !packageName) {
      return jsonResponse(500, {
        entitled: false,
        reason: 'Google Play verification secrets are missing.',
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse(401, {
        entitled: false,
        reason: 'Missing auth header.',
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse(401, {
        entitled: false,
        reason: 'Invalid or expired user session.',
      });
    }

    const body = (await req.json()) as VerifyRequest;
    const purchaseToken = (body.purchaseToken || '').trim();
    const productId = (body.productId || '').trim();
    const platform = (body.platform || '').trim().toLowerCase();

    if (!purchaseToken || !productId) {
      return jsonResponse(400, {
        entitled: false,
        reason: 'purchaseToken and productId are required.',
      });
    }

    if (platform !== 'android') {
      return jsonResponse(400, {
        entitled: false,
        reason: 'Only android platform is supported for this endpoint.',
      });
    }

    const { data: existingReceipt } = await adminClient
      .from('purchase_receipts')
      .select('id,user_id')
      .eq('provider', 'google_play')
      .eq('purchase_token', purchaseToken)
      .maybeSingle();

    if (existingReceipt && existingReceipt.user_id !== userData.user.id) {
      return jsonResponse(409, {
        entitled: false,
        reason: 'This purchase token has already been used by another account.',
      });
    }

    const serviceAccount = JSON.parse(serviceAccountJson) as GoogleServiceAccount;
    const accessToken = await createGoogleAccessToken(serviceAccount);
    const verification = await verifyWithGooglePlay({
      accessToken,
      packageName,
      productId,
      purchaseToken,
    });

    if (!verification.ok) {
      return jsonResponse(409, {
        entitled: false,
        reason: verification.reason,
      });
    }

    const payload = verification.payload;
    const orderId = (payload.orderId as string | undefined) || null;

    const { error: receiptError } = await adminClient
      .from('purchase_receipts')
      .upsert({
        provider: 'google_play',
        user_id: userData.user.id,
        product_id: productId,
        purchase_token: purchaseToken,
        order_id: orderId,
        purchase_state: verification.purchaseState,
        acknowledgement_state: verification.acknowledgementState,
        raw_payload: payload,
        verified_at: new Date().toISOString(),
      }, { onConflict: 'provider,purchase_token' });

    if (receiptError) {
      return jsonResponse(500, {
        entitled: false,
        reason: 'Failed to store purchase receipt.',
      });
    }

    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ is_pro: true })
      .eq('id', userData.user.id);

    if (profileError) {
      return jsonResponse(500, {
        entitled: false,
        reason: 'Purchase verified but failed to update profile entitlement.',
      });
    }

    return jsonResponse(200, {
      entitled: true,
      reason: 'Purchase verified and entitlement granted.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown verification error.';
    return jsonResponse(500, {
      entitled: false,
      reason: message,
    });
  }
});
