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

async function getColumns() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'colleges' })
  if (error) {
    // If RPC doesn't exist, we can try to select a single record or run query
    console.log("RPC Error:", error.message)
    
    // Let's run a query to information_schema if possible (though anon key might not have permissions, let's try)
    const { data: cols, error: err } = await supabase.from('colleges').select('*').limit(1)
    if (err) {
      console.log("Select Error:", err.message)
    } else {
      console.log("Sample colleges row keys:", cols[0] ? Object.keys(cols[0]) : "No rows in colleges table")
    }
  } else {
    console.log("Columns:", data)
  }
}

getColumns()
