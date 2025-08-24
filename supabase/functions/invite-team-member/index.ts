// Supabase Edge Function: invite-team-member
// Requires env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// Deploy with: supabase functions deploy invite-team-member

// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface InvitePayload {
  tenantUuid: string;
  email: string;
  name?: string;
  role: 'Owner' | 'Admin' | 'Dispatcher' | 'Driver';
}

serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const { tenantUuid, email, name, role } = (await req.json()) as InvitePayload;

    if (!tenantUuid || !email || !role) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing server env' }), { status: 500 });
    }

    // Client from user context (Authorization header forwarded) to validate permissions
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') || '',
          'x-tenant-uuid': tenantUuid,
        },
      },
    });

    // Get current user
    const { data: me, error: meErr } = await userClient.auth.getUser();
    if (meErr || !me?.user) return new Response('Unauthorized', { status: 401 });

    // Check membership role (must be Owner/Admin)
    const { data: membership, error: mErr } = await userClient
      .from('tenant_memberships')
      .select('role')
      .eq('tenant_uuid', tenantUuid)
      .eq('user_id', me.user.id)
      .maybeSingle();

    if (mErr) return new Response(JSON.stringify({ error: mErr.message }), { status: 400 });
    if (!membership || !['Owner', 'Admin'].includes(membership.role as string)) {
      return new Response('Forbidden', { status: 403 });
    }

    // Admin client with service role to invite and insert membership
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: name ? { name } : undefined,
    });
    if (invErr) {
      return new Response(JSON.stringify({ error: invErr.message }), { status: 400 });
    }

    const newUserId = invited?.user?.id;
    if (!newUserId) {
      return new Response(JSON.stringify({ error: 'Invite succeeded but user id missing' }), { status: 500 });
    }

    const { error: insErr } = await admin
      .from('tenant_memberships')
      .insert({ user_id: newUserId, tenant_uuid: tenantUuid, role });
    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ ok: true, user_id: newUserId }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected error' }), { status: 500 });
  }
});
