import { useState, useMemo } from 'react'
import { supabase } from '../../supabase/client'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'
import { MessageSquare, Search, Trash2, Building2, BookOpen, Clock } from 'lucide-react'

export default function AdminFeedbacks() {
  const { data: feedbacks, loading } = useTable(TABLES.FEEDBACKS)
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const filteredFeedbacks = useMemo(() => {
    if (!feedbacks) return []
    const q = searchQuery.toLowerCase().trim()
    if (!q) return feedbacks

    return feedbacks.filter((fb) => {
      const title = (fb.title || '').toLowerCase()
      const desc = (fb.description || '').toLowerCase()
      const col = (fb.college_name || '').toLowerCase()
      const dept = (fb.department || '').toLowerCase()
      return title.includes(q) || desc.includes(q) || col.includes(q) || dept.includes(q)
    })
  }, [feedbacks, searchQuery])

  const handleDelete = async (id, title) => {
    if (!confirm(`Are you sure you want to delete feedback "${title}"?`)) return

    setDeletingId(id)
    try {
      const { error } = await supabase.from(TABLES.FEEDBACKS).delete().eq('id', id)
      if (error) throw error
    } catch (err) {
      alert('Failed to delete feedback: ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Row */}
      <div className="crud-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'Syne, sans-serif' }}>Feedbacks & Suggestions</h2>
          <p className="muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
            View and manage feedback submitted by college student leaders.
          </p>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', minWidth: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search by college, department, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: '36px' }}
          />
        </div>
      </div>

      {loading ? (
        <p className="muted">Loading feedbacks...</p>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
          <MessageSquare size={36} style={{ color: 'var(--text-secondary)', marginBottom: '10px', opacity: 0.5 }} />
          <p className="muted" style={{ margin: 0 }}>
            {searchQuery ? 'No feedbacks match your search filter.' : 'No feedbacks have been submitted yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredFeedbacks.map((fb) => (
            <div
              key={fb.id}
              className="card"
              style={{
                padding: '24px',
                borderRadius: '16px',
                borderLeft: '4px solid var(--accent)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                {/* College & Department Badges */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: 'rgba(0, 229, 255, 0.1)',
                    color: 'var(--accent)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: '1px solid rgba(0, 229, 255, 0.2)'
                  }}>
                    <Building2 size={13} />
                    {fb.college_name || '—'}
                  </span>

                  {fb.department && fb.department !== '—' && (
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      background: 'rgba(167, 139, 250, 0.1)',
                      color: '#a78bfa',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      border: '1px solid rgba(167, 139, 250, 0.2)'
                    }}>
                      <BookOpen size={13} />
                      {fb.department}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="muted" style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    {new Date(fb.created_at).toLocaleString()}
                  </span>

                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(fb.id, fb.title)}
                    disabled={deletingId === fb.id}
                    title="Delete Feedback"
                    style={{ padding: '6px 10px' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Title & Description */}
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                {fb.title}
              </h3>

              <p style={{
                margin: 0,
                fontSize: '0.92rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                background: 'var(--surface-raised)',
                padding: '14px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border)'
              }}>
                {fb.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
