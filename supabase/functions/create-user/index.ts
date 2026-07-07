// supabase/functions/create-user/index.ts
//
// Deploy with: supabase functions deploy create-user
//
// Called from the Admin UI (StudentLeaders.jsx, Accountants.jsx) or public registration (GuestRegister.jsx)
// via supabase.functions.invoke('create-user', { body: {...} }).
//
// Checks permissions: admins can create any role. Leaders can be provisioned
// anonymously if a valid student_leaders row exists with that ref_id and email,
// and it has not yet been provisioned.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle preflight CORS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password, role, name, ref_id, college_id } = await req.json()
    if (!email || !password || !role || !ref_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Check permissions
    let allowed = false

    if (role === 'leader') {
      // Allow public creation of leader accounts IF there is a student_leaders record matching
      // this email and ref_id, AND there is no existing profile for it yet.
      const { data: dbLeader } = await adminClient
        .from('student_leaders')
        .select('id, email')
        .eq('id', ref_id)
        .eq('email', email)
        .maybeSingle()

      if (dbLeader) {
        const { data: existingProfile } = await adminClient
          .from('profiles')
          .select('id')
          .eq('ref_id', ref_id)
          .maybeSingle()

        if (!existingProfile) {
          allowed = true
        }
      }
    }

    // If not allowed via public leader path, check if the caller is an admin
    if (!allowed) {
      const authHeader = req.headers.get('Authorization') || ''
      const jwt = authHeader.replace('Bearer ', '')
      const anonClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY'), {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: callerData, error: callerError } = await anonClient.auth.getUser(jwt)
      
      if (!callerError && callerData?.user) {
        const { data: callerProfile } = await adminClient
          .from('profiles')
          .select('role')
          .eq('id', callerData.user.id)
          .single()

        if (callerProfile?.role === 'admin') {
          allowed = true
        }
      }
    }

    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Not authorized to create this account.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({ id: created.user.id, role, name, ref_id, college_id: college_id || null })

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ id: created.user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

