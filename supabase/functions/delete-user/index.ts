// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonResponse = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const isMissingTableError = (error: any): boolean => {
  const code = error?.code || error?.details || '';
  const message = error?.message || '';
  return code === '42P01' || /does not exist/i.test(message);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse(500, {
        success: false,
        error: 'Missing required Supabase secrets on Edge Function.',
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse(401, {
        success: false,
        error: 'Missing auth header.',
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse(401, {
        success: false,
        error: 'Invalid or expired user session.',
      });
    }

    const userId = userData.user.id;

    // Best-effort cleanup for non-cascading relations. Most runtime tables
    // already use ON DELETE CASCADE via auth.users.
    const cleanupQueries = [
      adminClient.from('profiles').delete().eq('id', userId),
      adminClient.from('admin_users').delete().eq('user_id', userId),
    ];

    for (const query of cleanupQueries) {
      const { error } = await query;
      if (error && !isMissingTableError(error)) {
        return jsonResponse(500, {
          success: false,
          error: error.message || 'Failed to clean up user data before deletion.',
        });
      }
    }

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      return jsonResponse(500, {
        success: false,
        error: deleteAuthError.message || 'Failed to delete auth user.',
      });
    }

    return jsonResponse(200, { success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown delete-user error.';
    return jsonResponse(500, {
      success: false,
      error: message,
    });
  }
});
