// ============================================
// Edge Function: approve-resident
// ============================================
// Called by admin to approve a registration request.
// Creates a Supabase Auth user + profile row (service_role).
// Returns temp password for admin to share with resident.

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
    // Get the requesting user's JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create client with user's JWT to check role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Verify caller is admin
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

    // Parse request body
    const { request_id, permissions } = await req.json()
    if (!request_id) {
      return new Response(JSON.stringify({ error: 'request_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Service role client (can create users)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch registration request
    const { data: regReq, error: regError } = await adminClient
      .from('registration_requests')
      .select('*')
      .eq('id', request_id)
      .single()

    if (regError || !regReq) {
      return new Response(JSON.stringify({ error: 'Registration request not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (regReq.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Request already processed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate secure random password
    const tempPassword = crypto.randomUUID().slice(0, 12)

    // Create Supabase Auth user (service_role)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: regReq.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: 'resident', flat_no: regReq.flat_no, display_name: regReq.owner_name }
    })

    if (createError) {
      return new Response(JSON.stringify({ error: 'Failed to create user: ' + createError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update profile row (trigger creates it, we update the details)
    await adminClient.from('profiles').update({
      display_name: regReq.owner_name,
      flat_no: regReq.flat_no,
      mobile: regReq.mobile,
      role: 'resident',
      status: 'active'
    }).eq('id', newUser.user.id)

    // Update registration request
    await adminClient.from('registration_requests').update({
      status: 'approved',
      permissions: permissions || { read: true, write: false },
      reviewed_by: user.id,
      review_date: new Date().toISOString()
    }).eq('id', request_id)

    // Audit log
    await adminClient.from('audit_log').insert({
      user_id: user.id,
      user_email: user.email,
      action: 'approve_resident',
      resource_type: 'registration',
      resource_id: request_id,
      details: { resident_email: regReq.email, flat_no: regReq.flat_no }
    })

    return new Response(JSON.stringify({
      success: true,
      email: regReq.email,
      temp_password: tempPassword,
      name: regReq.owner_name,
      flat_no: regReq.flat_no
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
