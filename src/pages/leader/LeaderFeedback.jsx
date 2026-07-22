import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../auth/AuthContext'
import { TABLES } from '../../supabase/tables'
import BackButton from '../../components/common/BackButton'
import { MessageSquare, Send, Building2, BookOpen, Clock, CheckCircle2 } from 'lucide-react'

export default function LeaderFeedback() {
  const { profile } = useAuth()
  const [leader, setLeader] = useState(null)
  const [college, setCollege] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [myFeedbacks, setMyFeedbacks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadLeaderData() {
      if (!profile) return
      try {
        // Fetch student leader profile
        let leaderData = null
        if (profile.ref_id) {
          const { data } = await supabase
            .from(TABLES.STUDENT_LEADERS)
            .select('*')
            .eq('id', profile.ref_id)
            .maybeSingle()
          leaderData = data
        }
        if (!leaderData && profile.email) {
          const { data } = await supabase
            .from(TABLES.STUDENT_LEADERS)
            .select('*')
            .eq('email', profile.email)
            .maybeSingle()
          leaderData = data
        }

        setLeader(leaderData)

        if (leaderData?.college_id) {
          const { data: colData } = await supabase
            .from(TABLES.COLLEGES)
            .select('*')
            .eq('id', leaderData.college_id)
            .maybeSingle()
          setCollege(colData)
        }

        // Fetch leader's submitted feedbacks
        if (leaderData?.id) {
          const { data: fbList } = await supabase
            .from(TABLES.FEEDBACKS)
            .select('*')
            .eq('leader_id', leaderData.id)
            .order('created_at', { ascending: false })
          setMyFeedbacks(fbList || [])
        }
      } catch (err) {
        console.error('Failed to load leader details:', err)
      } finally {
        setLoading(false)
      }
    }

    loadLeaderData()
  }, [profile])

  const loadMyFeedbacks = async () => {
    if (!leader?.id) return
    const { data } = await supabase
      .from(TABLES.FEEDBACKS)
      .select('*')
      .eq('leader_id', leader.id)
      .order('created_at', { ascending: false })
    setMyFeedbacks(data || [])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      alert('Please fill in both title and description.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        leader_id: leader?.id || null,
        college_id: college?.id || null,
        college_name: college?.college || '—',
        department: college?.department || '—',
        title: title.trim(),
        description: description.trim(),
      }

      const { error } = await supabase.from(TABLES.FEEDBACKS).insert(payload)
      if (error) throw error

      alert('Thank you! Your feedback has been submitted successfully.')
      setTitle('')
      setDescription('')
      loadMyFeedbacks()
    } catch (err) {
      alert('Failed to submit feedback: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const collegeName = college?.college || '—'
  const departmentName = college?.department || '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <BackButton />
        <div>
          <h2 style={{ margin: 0, fontFamily: 'Syne, sans-serif' }}>Feedback & Suggestions</h2>
          <p className="muted" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
            Share your thoughts, suggestions, or issues with the STRATA 2K26 organizing team.
          </p>
        </div>
      </div>

      {/* College Info Header Banner */}
      <div className="card" style={{ padding: '20px', background: 'var(--surface-raised)', borderRadius: '14px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Building2 size={20} style={{ color: 'var(--accent)' }} />
          <div>
            <span className="muted" style={{ fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>College</span>
            <strong style={{ fontSize: '0.95rem' }}>{collegeName}</strong>
          </div>
        </div>
        <div style={{ height: '30px', width: '1px', background: 'var(--border)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BookOpen size={20} style={{ color: '#a78bfa' }} />
          <div>
            <span className="muted" style={{ fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Department</span>
            <strong style={{ fontSize: '0.95rem' }}>{departmentName}</strong>
          </div>
        </div>
      </div>

      {/* Feedback Form Card */}
      <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
        <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
          <MessageSquare size={20} />
          Submit Feedback
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Feedback Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Query regarding venue timing / Smooth coordination"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Detailed Description <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              className="input"
              rows={5}
              placeholder="Provide clear details, suggestions, or comments here..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}
          >
            <Send size={16} />
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      </div>

      {/* My Feedback History */}
      <div style={{ marginTop: '12px' }}>
        <h3 style={{ marginBottom: '16px', fontFamily: 'Syne, sans-serif' }}>My Submitted Feedbacks</h3>
        {loading ? (
          <p className="muted">Loading feedback history...</p>
        ) : myFeedbacks.length === 0 ? (
          <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
            <p className="muted" style={{ margin: 0 }}>You have not submitted any feedbacks yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {myFeedbacks.map((fb) => (
              <div key={fb.id} className="card" style={{ padding: '20px', borderRadius: '12px', borderLeft: '4px solid var(--accent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>{fb.title}</h4>
                  <span className="muted" style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    {new Date(fb.created_at).toLocaleString()}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, whitespace: 'pre-wrap' }}>
                  {fb.description}
                </p>
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#22c55e' }}>
                  <CheckCircle2 size={14} />
                  <span>Received by Organizers</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
