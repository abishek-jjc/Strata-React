import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yureobroqmpopukqhkll.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1cmVvYnJvcW1wb3B1a3Foa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2ODc0NTUsImV4cCI6MjA5OTI2MzQ1NX0.3c7p-XfwAQUbZgOqS-I7PaLgmL1v7NRRqcUoAtBiEd4'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { error } = await supabase.from('settings').upsert({
    key_name: 'show_winners_page',
    value: 'false'
  })
  if (error) {
    console.error('Error applying toggle setting:', error)
  } else {
    console.log('Successfully initialized show_winners_page setting in settings table.')
  }
}

run()
