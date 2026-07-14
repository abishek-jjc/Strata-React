import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase/client'
import { TABLES } from '../supabase/tables'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(sessionUser) {
    if (!sessionUser) {
      setUser(null); setRole(null); setProfile(null); setLoading(false)
      return
    }
    setUser(sessionUser)
    // profiles.id === auth.users.id, holds { role, ref_id, name } —
    // ref_id points at the admins / student_leaders / accountants row.
    const { data } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('id', sessionUser.id)
      .maybeSingle()
    if (data) {
      setRole(data.role)
      setProfile(data)
    } else {
      setRole(null)
      setProfile(null)
    }
    setLoading(false)
  }

  async function refreshProfile() {
    const { data: { session } } = await supabase.auth.getSession()
    await loadProfile(session?.user || null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => loadProfile(data.session?.user || null))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session?.user || null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const login = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const logout = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ user, role, profile, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
