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

const tables = [
  'profiles', 'admins', 'events', 'colleges', 'student_leaders', 
  'accountants', 'incharges', 'lots', 'registrations', 'students', 
  'payments', 'certificates', 'leaders', 'rules', 'settings', 
  'venues', 'winners'
]

async function inspectAll() {
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*')
      if (error) {
        console.log(`Table ${table} error: ${error.message}`)
      } else if (data && data.length > 0) {
        console.log(`Table ${table} has ${data.length} rows. Sample:`, data.slice(0, 3))
      } else {
        console.log(`Table ${table} is empty.`)
      }
    } catch (e) {
      console.log(`Table ${table} exception: ${e.message}`)
    }
  }
}

inspectAll()
