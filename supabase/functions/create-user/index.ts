// supabase/functions/create-user/index.ts
//
// Deploy with: supabase functions deploy create-user
//
// Called from the Admin UI (StudentLeaders.jsx, Accountants.jsx) via
// supabase.functions.invoke('create-user', { body: {...} }).
// supabase-js automatically attaches the calling admin's JWT as the
// Authorization header — this function checks that JWT belongs to an
// admin before doing anything, then uses the SERVICE ROLE key
// (server-side only, never shipped to the browser) to create the new
// auth user and its profile row in one place.
//
// This solves a problem the Firebase version had: creating another
// user's account from the client would swap the admin's own session
// to the new user. Doing it server-side avoids that entirely.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace('Bearer ', '')

    const anonClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: callerData, error: callerError } = await anonClient.auth.getUser(jwt)
    if (callerError || !callerData?.user) {
      return new Response(JSON.stringify({ error: 'Not authenticated.' }), { status: 401 })
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Confirm the caller is an admin before creating anyone else's account.
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', callerData.user.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only admins can create accounts.' }), { status: 403 })
    }

    const { email, password, role, name, ref_id, college_id } = await req.json()
    if (!email || !password || !role || !ref_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields.' }), { status: 400 })
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), { status: 400 })
    }

    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({ id: created.user.id, role, name, ref_id, college_id: college_id || null })

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), { status: 400 })
    }

    return new Response(JSON.stringify({ id: created.user.id }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
