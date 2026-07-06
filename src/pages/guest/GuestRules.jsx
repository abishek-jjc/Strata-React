import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import GuestLayout from '../../components/layout/GuestLayout'

export default function GuestRules() {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadRules() {
      const { data } = await supabase
        .from(TABLES.RULES)
        .select('*')
        .order('created_at', { ascending: true })
      if (data) setRules(data)
      setLoading(false)
    }
    loadRules()
  }, [])

  return (
    <GuestLayout>
      <section className="guest-section">
        <div className="guest-section-header">
          <span className="guest-section-tag">Important Guidelines</span>
          <h2 className="guest-section-title">Rules & Regulations</h2>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--g-text-muted)' }}>Loading rules...</p>
        ) : (
          <div className="guest-rules-grid">
            {rules.map(rule => (
              <div className="guest-rules-card guest-glass-panel" key={rule.id}>
                <h3>{rule.title}</h3>
                <ul className="guest-rules-list">
                  {rule.points.split('\n').map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            ))}
            {rules.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--g-text-muted)' }}>No rules set yet.</p>
            )}
          </div>
        )}
      </section>
    </GuestLayout>
  )
}
