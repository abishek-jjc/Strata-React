import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../auth/AuthContext'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'
import BackButton from '../../components/common/BackButton'
import { Star, CheckCircle2, Send, Edit3, MessageSquare } from 'lucide-react'

export default function LeaderReviews() {
  const { profile } = useAuth()

  const { data: dbTitles, loading: titlesLoading } = useTable(TABLES.REVIEW_TITLES)
  const { data: dbColleges } = useTable(TABLES.COLLEGES)
  const { data: myReviews, loading: reviewsLoading } = useTable(
    TABLES.LEADER_REVIEWS,
    profile?.ref_id ? [['leader_id', 'eq', profile.ref_id]] : []
  )

  const [ratings, setRatings] = useState({})
  const [comments, setComments] = useState('')
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const titles = useMemo(() => {
    if (dbTitles && dbTitles.length > 0) return dbTitles
    return [
      { id: 'default_ambience', title: 'Ambience & Infrastructure', description: 'Event campus setup and stage facilities' },
      { id: 'default_hospitality', title: 'Hospitality & Management', description: 'Coordinator reception and assistance' },
      { id: 'default_food', title: 'Food & Refreshment Quality', description: 'Catering and dining organization' },
      { id: 'default_overall', title: 'Overall Event Experience', description: 'Overall management and execution' },
    ]
  }, [dbTitles])

  const existingReview = useMemo(() => {
    if (myReviews && myReviews.length > 0) return myReviews[0]
    return null
  }, [myReviews])

  // Pre-fill existing ratings when review data loads
  useEffect(() => {
    if (existingReview) {
      if (existingReview.ratings && typeof existingReview.ratings === 'object') {
        setRatings(existingReview.ratings)
      }
      if (existingReview.comments) {
        setComments(existingReview.comments)
      }
    }
  }, [existingReview])

  const handleSelectStar = (titleId, score) => {
    setRatings((prev) => ({
      ...prev,
      [titleId]: score,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSuccessMsg('')
    setErrorMsg('')

    const ratedCount = Object.keys(ratings).length
    if (ratedCount === 0) {
      setErrorMsg('Please select a star rating for at least one category before submitting.')
      return
    }

    setSaving(true)
    try {
      const collegeObj = (dbColleges || []).find((c) => c.id === profile?.college_id)
      const collegeName = collegeObj
        ? (collegeObj.department ? `${collegeObj.college} (${collegeObj.department})` : collegeObj.college)
        : profile?.college || 'Unknown College'

      const payload = {
        leader_id: profile?.ref_id || profile?.id || null,
        college_id: profile?.college_id || null,
        college_name: collegeName,
        department: profile?.department || '',
        leader_name: profile?.name || 'Student Leader',
        ratings: ratings,
        comments: comments.trim(),
        created_at: new Date().toISOString(),
      }

      if (existingReview?.id) {
        const { error } = await supabase
          .from(TABLES.LEADER_REVIEWS)
          .update(payload)
          .eq('id', existingReview.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from(TABLES.LEADER_REVIEWS)
          .insert([payload])
        if (error) throw error
      }

      if (profile?.ref_id) {
        localStorage.setItem(`strata_reviewed_${profile.ref_id}`, 'true')
      }

      setSuccessMsg('Thank you! Your Event Reviews & Ratings have been saved successfully.')
    } catch (err) {
      console.error('Error saving review:', err)
      setErrorMsg(err.message || 'Failed to submit review. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const loading = titlesLoading || reviewsLoading

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <BackButton />
        <div>
          <h2 style={{ margin: 0, fontFamily: 'Syne, sans-serif' }}>Event Reviews & Ratings</h2>
          <p className="muted" style={{ fontSize: '0.88rem', marginTop: '4px' }}>
            Rate your experience across event categories (Ambience, Hospitality, Food, Organization, etc.).
          </p>
        </div>
      </div>

      {successMsg && (
        <div
          className="card"
          style={{
            padding: '16px 20px',
            background: 'rgba(52, 211, 153, 0.1)',
            border: '1px solid rgba(52, 211, 153, 0.3)',
            borderRadius: '12px',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <CheckCircle2 size={22} />
          <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          className="card"
          style={{
            padding: '16px 20px',
            background: 'rgba(248, 113, 113, 0.1)',
            border: '1px solid rgba(248, 113, 113, 0.3)',
            borderRadius: '12px',
            color: '#f87171',
            fontSize: '0.9rem',
          }}
        >
          {errorMsg}
        </div>
      )}

      {loading ? (
        <p className="muted">Loading review categories...</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Review Categories List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {titles.map((t) => {
              const currentScore = ratings[t.id] || 0

              return (
                <div
                  key={t.id}
                  className="card"
                  style={{
                    padding: '20px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{t.title}</h4>
                      {t.description && (
                        <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.82rem' }}>
                          {t.description}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleSelectStar(t.id, star)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            transition: 'transform 0.15s ease',
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                          onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                        >
                          <Star
                            size={24}
                            fill={star <= currentScore ? '#f9c20a' : 'transparent'}
                            color={star <= currentScore ? '#f9c20a' : 'var(--text-secondary)'}
                            style={{ opacity: star <= currentScore ? 1 : 0.4 }}
                          />
                        </button>
                      ))}
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, marginLeft: '6px', minWidth: '35px', color: currentScore > 0 ? '#f9c20a' : 'var(--text-secondary)' }}>
                        {currentScore > 0 ? `${currentScore}/5` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Optional Feedback / Comments */}
          <div
            className="card"
            style={{
              padding: '20px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <label style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} style={{ color: 'var(--accent)' }} />
              Additional Comments & Suggestions (Optional)
            </label>
            <textarea
              className="input"
              rows={4}
              placeholder="Share any details, coordinator highlights, or feedback for event organizers…"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              style={{ width: '100%', borderRadius: '10px', padding: '12px', fontSize: '0.9rem' }}
            />
          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{
                padding: '12px 28px',
                fontSize: '0.95rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '10px',
              }}
            >
              {saving ? (
                'Saving Review...'
              ) : existingReview ? (
                <>
                  <Edit3 size={18} /> Update Review
                </>
              ) : (
                <>
                  <Send size={18} /> Submit Review & Ratings
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
