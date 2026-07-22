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

async function inspectColumns() {
  // Let's run a query selecting the column names of 'colleges' table from postgrest / openapi
  try {
    const res = await fetch(`${envVars.VITE_SUPABASE_URL}/rest/v1/?apikey=${envVars.VITE_SUPABASE_ANON_KEY}`)
    const json = await res.json()
    const columns = json.paths['/colleges']?.get?.parameters || []
    console.log("Colleges GET parameters from PostgREST OpenAPI spec:")
    console.log(columns.map(p => p.name))
  } catch (e) {
    console.error("Failed to query schema via PostgREST OpenAPI:", e.message)
  }
}

inspectColumns()
