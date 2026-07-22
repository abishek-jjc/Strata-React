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

async function inspect() {
  console.log("Fetching lots...")
  const { data: lots, error: lotsErr } = await supabase.from('lots').select('*')
  if (lotsErr) console.error("Error lots:", lotsErr)
  else console.log("Lots:", lots)

  console.log("\nFetching winners...")
  const { data: winners, error: winnersErr } = await supabase.from('winners').select('*')
  if (winnersErr) console.error("Error winners:", winnersErr)
  else console.log("Winners:", winners)
}

inspect()
