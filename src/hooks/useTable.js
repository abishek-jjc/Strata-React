import { useEffect, useState } from 'react'
import { supabase } from '../supabase/client'

// Subscribes to a Postgres table in realtime via Supabase's
// postgres_changes channel. filters: array of [column, op, value],
// e.g. [['status', 'eq', 'pending']] — only 'eq' is used in this app,
// but the shape leaves room for more operators later.
export function useTable(table, filters = []) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      let query = supabase.from(table).select('*')
      filters.forEach(([col, op, val]) => {
        if (val === undefined || val === null) return
        if (op === 'eq') query = query.eq(col, val)
      })
      const { data: rows, error } = await query
      if (active) {
        if (!error) setData(rows || [])
        setLoading(false)
      }
    }

    load()

    // Any change on the table triggers a refetch. Simpler than
    // patching local state per-event, and plenty fast at this scale.
    const channel = supabase
      .channel(`realtime:${table}:${JSON.stringify(filters)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, load)
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, JSON.stringify(filters)])

  return { data, loading }
}
