import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

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

async function testInsert() {
  console.log("Testing insert with department_type...")
  const { data, error } = await supabase.from('colleges').insert({
    college: 'Test College',
    department: 'Test Dept',
    department_type: 'Regular',
    status: 'active'
  }).select('*')

  if (error) {
    console.log("Insert failed:", error.message)
  } else {
    console.log("Insert succeeded!", data)
    // Clean it up
    const { error: delErr } = await supabase.from('colleges').delete().eq('id', data[0].id)
    if (delErr) console.log("Failed to clean up:", delErr.message)
    else console.log("Cleaned up successfully.")
  }
}

testInsert()
