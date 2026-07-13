import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase/client'
import { TABLES } from '../supabase/tables'

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)

  async function loadSettings() {
    try {
      const { data, error } = await supabase
        .from(TABLES.SETTINGS)
        .select('*')
      if (!error && data) {
        const settingsMap = {}
        data.forEach(row => {
          settingsMap[row.key_name] = row.value
        })
        setSettings(settingsMap)
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()

    // Realtime settings synchronization
    const channel = supabase
      .channel('realtime:settings-context')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.SETTINGS }, () => {
        loadSettings()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Dynamically update document icon (favicon) when logo is uploaded
  useEffect(() => {
    const logoUrl = settings.event_logo_url || ''
    if (logoUrl) {
      let link = document.querySelector("link[rel~='icon']")
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
      }
      link.href = logoUrl
    }
  }, [settings.event_logo_url])

  return (
    <SettingsContext.Provider value={{ settings, loading, reloadSettings: loadSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}
