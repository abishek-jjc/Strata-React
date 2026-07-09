import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Manually parse .env.local
const envFile = fs.readFileSync('.env.local', 'utf8')
const envVars = {}
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const supabase = createClient(
  envVars.VITE_SUPABASE_URL,
  envVars.VITE_SUPABASE_ANON_KEY
)

async function testAsUser() {
  const email = 'poornachandran02042007@gmail.com'
  const password = '9843160671'

  console.log(`Attempting to sign in as ${email}...`)
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (authErr) {
    console.error("Sign in failed:", authErr.message)
    return
  }

  console.log("Sign in successful! User ID:", authData.user.id)

  console.log("Fetching profile...")
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single()

  if (profErr) {
    console.error("Failed to fetch profile:", profErr.message)
    return
  }

  console.log("Profile details:")
  console.log(profile)

  console.log(`Fetching students with leader_id = ${profile.ref_id}...`)
  const { data: students, error: studErr } = await supabase
    .from('students')
    .select('*')
    .eq('leader_id', profile.ref_id)

  if (studErr) {
    console.error("Failed to fetch students:", studErr.message)
    return
  }

  console.log(`Found ${students.length} students:`)
  console.log(students)
}

testAsUser()
