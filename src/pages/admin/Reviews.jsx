import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { useTable } from '../../hooks/useTable'
import { TABLES } from '../../supabase/tables'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { Star, Plus, Trash2, Search, Download, Users, Building2, BookOpen, Clock, BarChart3, Edit3, X, CheckCircle2 } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext'
import { loadLogoWithOpacity, addWatermarkToAllPages } from '../../utils/pdfBackground'

export default function AdminReviews() {
  const { settings } = useSettings()
  const logoUrl = settings?.event_logo_url

  const { data: dbTitles, loading: titlesLoading } = useTable(TABLES.REVIEW_TITLES)
  const { data: dbReviews, loading: reviewsLoading } = useTable(TABLES.LEADER_REVIEWS)
  const { data: colleges } = useTable(TABLES.COLLEGES)
  const { data: leaders } = useTable(TABLES.STUDENT_LEADERS)

  const [activeTab, setActiveTab] = useState('responses') // 'responses' | 'categories'
  const [searchQuery, setSearchQuery] = useState('')

  // Modal State for Adding/Editing Category Title
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingTitleId, setEditingTitleId] = useState(null)
  const [titleName, setTitleName] = useState('')
  const [titleDesc, setTitleDesc] = useState('')
  const [savingTitle, setSavingTitle] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const titles = dbTitles || []
  const reviews = dbReviews || []

  // Calculate Average Rating per Category Title
  const categoryStats = useMemo(() => {
    if (!titles.length || !reviews.length) return {}
    
    const stats = {}
    titles.forEach((t) => {
      stats[t.id] = { title: t.title, sum: 0, count: 0 }
    })

    reviews.forEach((r) => {
      if (r.ratings && typeof r.ratings === 'object') {
        Object.entries(r.ratings).forEach(([tId, score]) => {
          if (stats[tId] && typeof score === 'number') {
            stats[tId].sum += score
            stats[tId].count += 1
          }
        })
      }
    })

    const result = {}
    Object.keys(stats).forEach((tId) => {
      const avg = stats[tId].count > 0 ? (stats[tId].sum / stats[tId].count).toFixed(1) : 0
      result[tId] = {
        title: stats[tId].title,
        average: parseFloat(avg),
        count: stats[tId].count
      }
    })
    return result
  }, [titles, reviews])

  // Overall average rating score
  const overallAvg = useMemo(() => {
    const values = Object.values(categoryStats).map((s) => s.average).filter((avg) => avg > 0)
    if (!values.length) return 0
    return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
  }, [categoryStats])

  // Filtered reviews search
  const filteredReviews = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return reviews

    return reviews.filter((r) => {
      const leader = (r.leader_name || '').toLowerCase()
      const college = (r.college_name || '').toLowerCase()
      const dept = (r.department || '').toLowerCase()
      const comment = (r.comments || '').toLowerCase()
      return leader.includes(q) || college.includes(q) || dept.includes(q) || comment.includes(q)
    })
  }, [reviews, searchQuery])

  // Open Modal for New Title
  const openNewCategoryModal = () => {
    setEditingTitleId(null)
    setTitleName('')
    setTitleDesc('')
    setShowCategoryModal(true)
  }

  // Open Modal for Edit Title
  const openEditCategoryModal = (t) => {
    setEditingTitleId(t.id)
    setTitleName(t.title)
    setTitleDesc(t.description || '')
    setShowCategoryModal(true)
  }

  // Save Title (Create / Update)
  const handleSaveTitle = async (e) => {
    e.preventDefault()
    if (!titleName.trim()) return alert('Review title is required.')

    setSavingTitle(true)
    try {
      if (editingTitleId) {
        const { error } = await supabase
          .from(TABLES.REVIEW_TITLES)
          .update({ title: titleName.trim(), description: titleDesc.trim() })
          .eq('id', editingTitleId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from(TABLES.REVIEW_TITLES)
          .insert({ title: titleName.trim(), description: titleDesc.trim() })

        if (error) throw error
      }
      setShowCategoryModal(false)
    } catch (err) {
      alert('Failed to save review title: ' + err.message)
    } finally {
      setSavingTitle(false)
    }
  }

  // Delete Review Title
  const handleDeleteTitle = async (id, name) => {
    if (!confirm(`Are you sure you want to delete the review aspect "${name}"?`)) return
    try {
      const { error } = await supabase.from(TABLES.REVIEW_TITLES).delete().eq('id', id)
      if (error) throw error
    } catch (err) {
      alert('Failed to delete review aspect: ' + err.message)
    }
  }

  // Delete Response
  const handleDeleteReview = async (id, leaderName) => {
    if (!confirm(`Delete review submitted by "${leaderName || 'Leader'}"?`)) return
    setDeletingId(id)
    try {
      const { error } = await supabase.from(TABLES.LEADER_REVIEWS).delete().eq('id', id)
      if (error) throw error
    } catch (err) {
      alert('Failed to delete review: ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  // Export PDF Report of Reviews
  const handleExportPdf = async () => {
    if (reviews.length === 0) return alert('No review submissions to export.')

    const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })
    const imgData = logoUrl ? await loadLogoWithOpacity(logoUrl, 0.15) : null

    // Document Header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Strata 2K26 — Student Leader Reviews & Ratings Report', 40, 45)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Generated on: ${new Date().toLocaleString()} | Total Submissions: ${reviews.length}`, 40, 60)

    // Summary Section
    let currentY = 80
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`Overall Average Rating: ${overallAvg} / 5.0 ⭐`, 40, currentY)
    currentY += 15

    // Category Ratings Summary Table
    const catSummaryRows = titles.map((t) => {
      const stat = categoryStats[t.id]
      return [t.title, stat ? `${stat.average} / 5.0 ⭐` : 'N/A', stat ? String(stat.count) : '0']
    })

    doc.autoTable({
      startY: currentY,
      head: [['Review Aspect', 'Average Rating', 'Total Reviews']],
      body: catSummaryRows,
      margin: { left: 40, right: 40 },
      theme: 'grid',
      headStyles: { fillColor: [0, 229, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 8 }
    })

    currentY = doc.lastAutoTable.finalY + 25
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Detailed Leader Submissions:', 40, currentY)
    currentY += 10

    // Build Rows for Individual Reviews Table
    const responseRows = filteredReviews.map((r) => {
      const scores = Object.values(r.ratings || {}).filter((v) => typeof v === 'number' && v > 0)
      const submissionOverall = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—'

      const ratingsText = titles
        .map((t) => {
          const score = r.ratings?.[t.id]
          return score ? `${t.title}: ${score}/5` : null
        })
        .filter(Boolean)
        .join(' | ')

      return [
        r.leader_name || 'Leader',
        r.college_name || '—',
        r.department || '—',
        submissionOverall !== '—' ? `${submissionOverall} / 5.0 ⭐` : '—',
        ratingsText || 'No ratings',
        r.comments || 'No comment',
        new Date(r.created_at).toLocaleDateString()
      ]
    })

    doc.autoTable({
      startY: currentY,
      head: [['Leader Name', 'College', 'Department', 'Overall Rating', 'Ratings Breakdown', 'Comments', 'Date']],
      body: responseRows,
      margin: { left: 40, right: 40 },
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 5 }
    })

    if (imgData) {
      addWatermarkToAllPages(doc, imgData)
    }

    doc.save(`Strata_Reviews_Report_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const loading = titlesLoading || reviewsLoading

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div className="crud-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'Syne, sans-serif' }}>Review & Rating Management</h2>
          <p className="muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
            Manage review aspects (e.g. Ambience, Hospitality) and view responses submitted by student leaders.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn" onClick={openNewCategoryModal} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> Add Review Title
          </button>
          {reviews.length > 0 && (
            <button className="btn btn-primary" onClick={handleExportPdf} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={16} /> Export PDF Report
            </button>
          )}
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--surface)' }}>
          <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(0, 229, 255, 0.1)', color: 'var(--accent)' }}>
            <Star size={24} />
          </div>
          <div>
            <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>Overall Rating</span>
            <strong style={{ fontSize: '1.6rem', color: 'var(--text-primary)' }}>{overallAvg} / 5.0</strong>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--surface)' }}>
          <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa' }}>
            <Users size={24} />
          </div>
          <div>
            <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>Total Submissions</span>
            <strong style={{ fontSize: '1.6rem', color: 'var(--text-primary)' }}>{reviews.length}</strong>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--surface)' }}>
          <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(249, 194, 10, 0.1)', color: '#f9c20a' }}>
            <BarChart3 size={24} />
          </div>
          <div>
            <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>Review Aspects</span>
            <strong style={{ fontSize: '1.6rem', color: 'var(--text-primary)' }}>{titles.length}</strong>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '16px' }}>
        <button
          className={`btn ${activeTab === 'responses' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('responses')}
          style={{ borderRadius: '8px 8px 0 0', padding: '10px 18px', borderBottom: activeTab === 'responses' ? '2px solid var(--accent)' : 'none' }}
        >
          Leader Submissions ({reviews.length})
        </button>
        <button
          className={`btn ${activeTab === 'categories' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('categories')}
          style={{ borderRadius: '8px 8px 0 0', padding: '10px 18px', borderBottom: activeTab === 'categories' ? '2px solid var(--accent)' : 'none' }}
        >
          Review Titles / Aspects ({titles.length})
        </button>
      </div>

      {/* ── TAB 1: LEADER RESPONSES ── */}
      {activeTab === 'responses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search bar */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              className="input"
              placeholder="Search leader name, college, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '36px' }}
            />
          </div>

          {loading ? (
            <p className="muted">Loading reviews...</p>
          ) : filteredReviews.length === 0 ? (
            <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
              <Star size={36} style={{ color: 'var(--text-secondary)', marginBottom: '10px', opacity: 0.5 }} />
              <p className="muted" style={{ margin: 0 }}>
                {searchQuery ? 'No reviews match your search filter.' : 'No leader reviews have been submitted yet.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredReviews.map((r) => {
                const scores = Object.values(r.ratings || {}).filter((v) => typeof v === 'number' && v > 0)
                const cardOverall = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—'

                return (
                  <div
                    key={r.id}
                    className="card"
                    style={{
                      padding: '24px',
                      borderRadius: '16px',
                      borderLeft: '4px solid var(--accent)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                            {r.leader_name || 'Student Leader'}
                          </h3>
                          <span style={{
                            padding: '2px 10px',
                            borderRadius: '12px',
                            background: 'rgba(249, 194, 10, 0.15)',
                            color: '#f9c20a',
                            border: '1px solid rgba(249, 194, 10, 0.3)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Star size={12} fill="#f9c20a" /> {cardOverall} / 5.0 Overall
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Building2 size={13} /> {r.college_name || '—'}
                          </span>
                          {r.department && r.department !== '—' && (
                            <span style={{ fontSize: '0.8rem', color: '#a78bfa', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <BookOpen size={13} /> {r.department}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="muted" style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {new Date(r.created_at).toLocaleString()}
                        </span>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteReview(r.id, r.leader_name)}
                        disabled={deletingId === r.id}
                        title="Delete Review"
                        style={{ padding: '6px 10px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Ratings Breakdown Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', background: 'var(--surface-raised)', padding: '12px 16px', borderRadius: '12px' }}>
                    {titles.map((t) => {
                      const score = r.ratings?.[t.id] || 0
                      return (
                        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                          <span className="muted">{t.title}:</span>
                          <span style={{ fontWeight: 600, color: score > 0 ? '#f9c20a' : 'var(--text-secondary)' }}>
                            {'★'.repeat(score)}{'☆'.repeat(5 - score)} ({score}/5)
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Optional Comments */}
                  {r.comments && (
                    <div style={{ background: 'var(--surface)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <strong>Feedback / Comment:</strong> {r.comments}
                    </div>
                  )}
                </div>
              )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: REVIEW ASPECTS / TITLES ── */}
      {activeTab === 'categories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {titles.length === 0 ? (
            <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
              <BarChart3 size={36} style={{ color: 'var(--text-secondary)', marginBottom: '10px', opacity: 0.5 }} />
              <p className="muted">No review aspects created yet. Click "Add Review Title" above to add titles like Ambience, Hospitality, etc.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {titles.map((t) => {
                const stat = categoryStats[t.id]
                return (
                  <div key={t.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{t.title}</h3>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-sm" onClick={() => openEditCategoryModal(t)} title="Edit Title" style={{ padding: '4px 8px' }}>
                            <Edit3 size={14} />
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDeleteTitle(t.id, t.title)} title="Delete Title" style={{ padding: '4px 8px' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {t.description && <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>{t.description}</p>}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                      <span className="muted" style={{ fontSize: '0.8rem' }}>Average Rating:</span>
                      <strong style={{ color: '#f9c20a', fontSize: '1rem' }}>
                        {stat?.average ? `${stat.average} / 5.0 ⭐` : 'No ratings yet'}
                      </strong>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: ADD / EDIT REVIEW TITLE ── */}
      {showCategoryModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="modal-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', maxWidth: '450px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontFamily: 'Syne, sans-serif' }}>
                {editingTitleId ? 'Edit Review Title' : 'Add New Review Title'}
              </h3>
              <button className="btn btn-sm" onClick={() => setShowCategoryModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTitle} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>Review Title / Aspect Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Ambience, Hospitality, Food, Organization"
                  value={titleName}
                  onChange={(e) => setTitleName(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>Description (Optional)</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="e.g. Rate your overall experience regarding venue ambiance and seating."
                  value={titleDesc}
                  onChange={(e) => setTitleDesc(e.target.value)}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button type="button" className="btn" onClick={() => setShowCategoryModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingTitle}>
                  {savingTitle ? 'Saving…' : editingTitleId ? 'Update Title' : 'Add Title'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
