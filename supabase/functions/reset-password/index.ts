// ============================================
// Edge Function: reset-password
// ============================================
// Called by admin to reset a user's password.
// Uses service_role to update auth user password.
// Returns new temp password for admin to share.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await userClient.from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request
    const { user_id, email } = await req.json()
    if (!user_id && !email) {
      return new Response(JSON.stringify({ error: 'user_id or email required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Find user by id or email
    let targetUserId = user_id
    if (!targetUserId && email) {
      const { data: targetProfile } = await adminClient.from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .single()
      if (targetProfile) targetUserId = targetProfile.id
    }

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate new password
    const newPassword = crypto.randomUUID().slice(0, 12)

    // Update auth user password (service_role)
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    )

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to reset password: ' + updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Audit log
    await adminClient.from('audit_log').insert({
      user_id: user.id,
      user_email: user.email,
      action: 'reset_password',
      resource_type: 'auth',
      resource_id: targetUserId,
      details: { target_email: email || 'unknown' }
    })

    return new Response(JSON.stringify({
      success: true,
      new_password: newPassword,
      user_id: targetUserId
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
