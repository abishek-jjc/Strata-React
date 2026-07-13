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

async function run() {
  console.log("Fetching a row from leaders table...")
  const { data, error } = await supabase.from('leaders').select('*').limit(1)
  if (error) {
    console.error("Error:", error.message)
  } else {
    console.log("Success! Data:", data)
  }
}

run()
