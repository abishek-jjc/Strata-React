import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yureobroqmpopukqhkll.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1cmVvYnJvcW1wb3B1a3Foa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2ODc0NTUsImV4cCI6MjA5OTI2MzQ1NX0.3c7p-XfwAQUbZgOqS-I7PaLgmL1v7NRRqcUoAtBiEd4'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.from('winners').select('*')
  if (error) {
    console.error('Error fetching winners:', error)
  } else {
    console.log('Winners table content:')
    console.log(JSON.stringify(data, null, 2))
  }
}

run()
