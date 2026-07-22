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

async function checkTables() {
  for (const table of ['colleges', 'events', 'lots', 'winners']) {
    const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true })
    if (error) {
      console.log(`Table ${table} error:`, error.message)
    } else {
      console.log(`Table ${table} count:`, data, 'or total count:', error ? 'error' : 'success')
      // Let's also fetch first 5 rows
      const { data: rows } = await supabase.from(table).select('*').limit(5)
      console.log(`Table ${table} sample rows:`, rows)
    }
  }
}

checkTables()
