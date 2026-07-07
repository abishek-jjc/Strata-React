import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabase/client'
import { useTable } from '../../hooks/useTable'
import { TABLES, REGISTRATION_STATUS } from '../../supabase/tables'

export default function Certificates() {
  const { data: students, loading: studentsLoading } = useTable(TABLES.STUDENTS)
  const { data: registrations } = useTable(TABLES.REGISTRATIONS)
  const { data: events } = useTable(TABLES.EVENTS)
  const { data: colleges } = useTable(TABLES.COLLEGES)
  const { data: certificates } = useTable(TABLES.CERTIFICATES)
  const { data: winners } = useTable(TABLES.WINNERS)

  // Settings / Templates state
  const [participationUrl, setParticipationUrl] = useState('')
  const [winner1Url, setWinner1Url] = useState('')
  const [winner2Url, setWinner2Url] = useState('')
  
  const [uploadingParticipation, setUploadingParticipation] = useState(false)
  const [uploadingWinner1, setUploadingWinner1] = useState(false)
  const [uploadingWinner2, setUploadingWinner2] = useState(false)

  // Tab and search state
  const [activeTab, setActiveTab] = useState('participation')
  const [searchQuery, setSearchQuery] = useState('')

  const [participationPage, setParticipationPage] = useState(1)
  const [winnersPage, setWinnersPage] = useState(1)
  const itemsPerPage = 10

  // Reset pages on search or tab changes
  useEffect(() => {
    setParticipationPage(1)
    setWinnersPage(1)
  }, [searchQuery, activeTab])

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase.from(TABLES.SETTINGS).select('*')
      if (data) {
        data.forEach((row) => {
          if (row.key_name === 'participation_cert_url') setParticipationUrl(row.value)
          if (row.key_name === 'winner_cert_1_url') setWinner1Url(row.value)
          if (row.key_name === 'winner_cert_2_url') setWinner2Url(row.value)
        })
      }
    }
    loadSettings()
  }, [])

  async function handleUploadPdf(e, type) {
    const file = e.target.files?.[0]
    if (!file) return

    let setUrl, fileName, keyName, setUploading
    if (type === 'participation') {
      setUploading = setUploadingParticipation
      setUrl = setParticipationUrl
      fileName = `participation_cert_template_${Date.now()}.pdf`
      keyName = 'participation_cert_url'
    } else if (type === 'winner1') {
      setUploading = setUploadingWinner1
      setUrl = setWinner1Url
      fileName = `winner_cert_1_template_${Date.now()}.pdf`
      keyName = 'winner_cert_1_url'
    } else if (type === 'winner2') {
      setUploading = setUploadingWinner2
      setUrl = setWinner2Url
      fileName = `winner_cert_2_template_${Date.now()}.pdf`
      keyName = 'winner_cert_2_url'
    }

    setUploading(true)
    try {
      const { data, error: uploadError } = await supabase.storage
        .from('assets')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(fileName)

      const { error: upsertError } = await supabase.from(TABLES.SETTINGS).upsert([
        { key_name: keyName, value: publicUrl }
      ])
      if (upsertError) throw upsertError

      setUrl(publicUrl)
      alert('Certificate template uploaded successfully!')
    } catch (err) {
      alert(err.message || 'Failed to upload PDF template.')
    } finally {
      setUploading(false)
    }
  }

  async function handleRemovePdf(type) {
    if (!confirm('Are you sure you want to remove this template?')) return

    let setUrl, keyName
    if (type === 'participation') {
      setUrl = setParticipationUrl
      keyName = 'participation_cert_url'
    } else if (type === 'winner1') {
      setUrl = setWinner1Url
      keyName = 'winner_cert_1_url'
    } else if (type === 'winner2') {
      setUrl = setWinner2Url
      keyName = 'winner_cert_2_url'
    }

    try {
      const { error: upsertError } = await supabase.from(TABLES.SETTINGS).upsert([
        { key_name: keyName, value: '' }
      ])
      if (upsertError) throw upsertError
      setUrl('')
    } catch (err) {
      alert(err.message || 'Failed to remove template.')
    }
  }

  // Filter approved registration IDs
  const approvedRegIds = new Set(
    registrations.filter((r) => r.status === REGISTRATION_STATUS.APPROVED).map((r) => r.id)
  )

  // Participants: all students who belong to an approved registration
  const eligibleStudents = students.filter((s) => approvedRegIds.has(s.registration_id))

  const filteredParticipation = eligibleStudents.filter((s) => {
    const nameMatch = s.student_name.toLowerCase().includes(searchQuery.toLowerCase())
    const eventName = events.find((e) => e.id === s.event_id)?.event_name || ''
    const eventMatch = eventName.toLowerCase().includes(searchQuery.toLowerCase())
    const collegeName = colleges.find((c) => c.id === s.college_id)?.college || ''
    const collegeMatch = collegeName.toLowerCase().includes(searchQuery.toLowerCase())
    return nameMatch || eventMatch || collegeMatch
  })

  // Winners: build from the winners table (first_place / second_place = lot name)
  // Map lot → college name, then college → students for that event
  const winnerRows = []
  winners.forEach((w) => {
    const eventName = events.find((e) => e.id === w.event_id)?.event_name || ''
    const places = [
      { place: '1st Place', lotName: w.first_place },
      { place: '2nd Place', lotName: w.second_place },
    ]
    places.forEach(({ place, lotName }) => {
      if (!lotName || lotName === '-') return
      // Find students of this lot's college who participated in this event
      const collegeName = lotName // lots store college name in assigned_college
      const college = colleges.find((c) => c.college === collegeName)
      if (!college) return
      const collegeStudents = eligibleStudents.filter(
        (s) => s.college_id === college.id && s.event_id === w.event_id
      )
      collegeStudents.forEach((s) => {
        winnerRows.push({ ...s, winnerPlace: place, winnerEventName: eventName, winnerCollegeName: collegeName })
      })
    })
  })

  const filteredWinners = winnerRows.filter((s) => {
    const q = searchQuery.toLowerCase()
    return (
      s.student_name.toLowerCase().includes(q) ||
      s.winnerEventName.toLowerCase().includes(q) ||
      s.winnerCollegeName.toLowerCase().includes(q)
    )
  })

  const totalParticipationPages = Math.ceil(filteredParticipation.length / itemsPerPage)
  const totalWinnersPages = Math.ceil(filteredWinners.length / itemsPerPage)

  useEffect(() => {
    if (participationPage > totalParticipationPages && totalParticipationPages > 0) {
      setParticipationPage(totalParticipationPages)
    }
  }, [filteredParticipation, totalParticipationPages, participationPage])

  useEffect(() => {
    if (winnersPage > totalWinnersPages && totalWinnersPages > 0) {
      setWinnersPage(totalWinnersPages)
    }
  }, [filteredWinners, totalWinnersPages, winnersPage])

  const paginatedParticipation = useMemo(() => {
    return filteredParticipation.slice((participationPage - 1) * itemsPerPage, participationPage * itemsPerPage)
  }, [filteredParticipation, participationPage])

  const paginatedWinners = useMemo(() => {
    return filteredWinners.slice((winnersPage - 1) * itemsPerPage, winnersPage * itemsPerPage)
  }, [filteredWinners, winnersPage])

  // Issue helpers
  async function issueParticipation(student) {
    const hasCert = certificates.some(
      (c) => c.student_id === student.id && c.position === 'Participation'
    )
    if (hasCert) return

    const certNumber = `CERT-PART-${Date.now()}`
    try {
      const { error: certError } = await supabase.from(TABLES.CERTIFICATES).insert({
        student_id: student.id,
        event_id: student.event_id,
        certificate_number: certNumber,
        position: 'Participation',
      })
      if (certError) throw certError

      await supabase
        .from(TABLES.STUDENTS)
        .update({ certificate_status: 'issued' })
        .eq('id', student.id)
    } catch (err) {
      alert(err.message || 'Failed to issue participation certificate.')
    }
  }

  async function issueWinner(student) {
    const hasCert = certificates.some(
      (c) => c.student_id === student.id && c.position === student.winnerPlace
    )
    if (hasCert) return

    const certNumber = `CERT-WIN-${Date.now()}`
    try {
      const { error: certError } = await supabase.from(TABLES.CERTIFICATES).insert({
        student_id: student.id,
        event_id: student.event_id,
        certificate_number: certNumber,
        position: student.winnerPlace,
      })
      if (certError) throw certError

      await supabase
        .from(TABLES.STUDENTS)
        .update({ certificate_status: 'issued' })
        .eq('id', student.id)
    } catch (err) {
      alert(err.message || 'Failed to issue winner certificate.')
    }
  }

  const getEventName = (id) => events.find((e) => e.id === id)?.event_name || 'Loading…'
  const getCollegeName = (id) => colleges.find((c) => c.id === id)?.college || 'Loading…'

  return (
    <div className="certificates-page">
      <h2>Certificate Templates & Issuance</h2>

      {/* Templates Section */}
      <div className="card" style={{ marginBottom: 24, padding: 20 }}>
        <h3>Upload Certificate Templates (PDF)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 15 }}>
          {/* Participation Certificate */}
          <div className="stat" style={{ border: '1px solid var(--border)', background: 'var(--bg-muted)', textAlign: 'left', padding: 15 }}>
            <h4 style={{ margin: '0 0 10px 0' }}>1. Participation Certificate</h4>
            {participationUrl ? (
              <div>
                <p className="success">✓ Template Uploaded</p>
                <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                  <a href={participationUrl} target="_blank" rel="noreferrer" className="btn btn-sm">View Template</a>
                  <button onClick={() => handleRemovePdf('participation')} className="btn btn-sm btn-danger">Remove</button>
                </div>
              </div>
            ) : (
              <div>
                <p className="muted">No template uploaded yet</p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => handleUploadPdf(e, 'participation')}
                  disabled={uploadingParticipation}
                  style={{ marginTop: 10 }}
                />
                {uploadingParticipation && <p className="muted">Uploading…</p>}
              </div>
            )}
          </div>

          {/* Winner Certificate (1st) */}
          <div className="stat" style={{ border: '1px solid var(--border)', background: 'var(--bg-muted)', textAlign: 'left', padding: 15 }}>
            <h4 style={{ margin: '0 0 10px 0' }}>2. Winner Certificate (1st Place)</h4>
            {winner1Url ? (
              <div>
                <p className="success">✓ Template Uploaded</p>
                <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                  <a href={winner1Url} target="_blank" rel="noreferrer" className="btn btn-sm">View Template</a>
                  <button onClick={() => handleRemovePdf('winner1')} className="btn btn-sm btn-danger">Remove</button>
                </div>
              </div>
            ) : (
              <div>
                <p className="muted">No template uploaded yet</p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => handleUploadPdf(e, 'winner1')}
                  disabled={uploadingWinner1}
                  style={{ marginTop: 10 }}
                />
                {uploadingWinner1 && <p className="muted">Uploading…</p>}
              </div>
            )}
          </div>

          {/* Winner Certificate (2nd) */}
          <div className="stat" style={{ border: '1px solid var(--border)', background: 'var(--bg-muted)', textAlign: 'left', padding: 15 }}>
            <h4 style={{ margin: '0 0 10px 0' }}>3. Winner Certificate (2nd Place)</h4>
            {winner2Url ? (
              <div>
                <p className="success">✓ Template Uploaded</p>
                <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                  <a href={winner2Url} target="_blank" rel="noreferrer" className="btn btn-sm">View Template</a>
                  <button onClick={() => handleRemovePdf('winner2')} className="btn btn-sm btn-danger">Remove</button>
                </div>
              </div>
            ) : (
              <div>
                <p className="muted">No template uploaded yet</p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => handleUploadPdf(e, 'winner2')}
                  disabled={uploadingWinner2}
                  style={{ marginTop: 10 }}
                />
                {uploadingWinner2 && <p className="muted">Uploading…</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Container */}
      <div className="crud-header" style={{ marginBottom: 15 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn ${activeTab === 'participation' ? 'btn-primary' : ''}`}
            onClick={() => { setActiveTab('participation'); setSearchQuery(''); }}
          >
            Participants ({filteredParticipation.length})
          </button>
          <button
            className={`btn ${activeTab === 'winner' ? 'btn-primary' : ''}`}
            onClick={() => { setActiveTab('winner'); setSearchQuery(''); }}
          >
            Winners ({winnerRows.length})
          </button>
        </div>
        <input
          className="input"
          placeholder="Search student, event, or college…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 300 }}
        />
      </div>

      {studentsLoading ? (
        <p className="muted">Loading students data…</p>
      ) : activeTab === 'participation' ? (
        <>
          <div style={{ overflowX: 'auto', marginBottom: '15px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>College</th>
                  <th>Event</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedParticipation.map((s) => {
                  const isIssued = certificates.some(
                    (c) => c.student_id === s.id && c.position === 'Participation'
                  )
                  return (
                    <tr key={s.id}>
                      <td>{s.student_name}</td>
                      <td>{getCollegeName(s.college_id)}</td>
                      <td>{getEventName(s.event_id)}</td>
                      <td>
                        <span className={isIssued ? 'success' : 'muted'}>
                          {isIssued ? 'Issued' : 'Not Issued'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="link"
                          disabled={isIssued}
                          onClick={() => issueParticipation(s)}
                        >
                          {isIssued ? 'Issued' : 'Issue Certificate'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {paginatedParticipation.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted" style={{ textAlign: 'center' }}>
                      No eligible students found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalParticipationPages > 1 && (
            <div className="pagination" style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setParticipationPage(1)}
                disabled={participationPage === 1}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                First
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setParticipationPage((prev) => Math.max(prev - 1, 1))}
                disabled={participationPage === 1}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                Prev
              </button>
              <span className="muted" style={{ fontSize: '0.85rem', margin: '0 8px' }}>
                Page <strong>{participationPage}</strong> of {totalParticipationPages} ({filteredParticipation.length} items)
              </span>
              <button
                type="button"
                className="btn"
                onClick={() => setParticipationPage((prev) => Math.min(prev + 1, totalParticipationPages))}
                disabled={participationPage === totalParticipationPages}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                Next
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setParticipationPage(totalParticipationPages)}
                disabled={participationPage === totalParticipationPages}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                Last
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ overflowX: 'auto', marginBottom: '15px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>College</th>
                  <th>Event</th>
                  <th>Winner Place</th>
                  <th>Cert Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedWinners.map((s, idx) => {
                  const isIssued = certificates.some(
                    (c) => c.student_id === s.id && c.position === s.winnerPlace
                  )
                  return (
                    <tr key={`${s.id}-${s.winnerPlace}-${idx}`}>
                      <td><strong>{s.student_name}</strong></td>
                      <td>{s.winnerCollegeName}</td>
                      <td>{s.winnerEventName}</td>
                      <td>
                        <span className={`badge badge-${s.winnerPlace === '1st Place' ? 'approved' : 'pending'}`}>
                          {s.winnerPlace}
                        </span>
                      </td>
                      <td>
                        <span className={isIssued ? 'success' : 'muted'}>
                          {isIssued ? '✓ Issued' : 'Not Issued'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="link"
                          disabled={isIssued}
                          onClick={() => issueWinner(s)}
                        >
                          {isIssued ? 'Issued' : 'Issue Certificate'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {paginatedWinners.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted" style={{ textAlign: 'center' }}>
                      No winners assigned yet. Assign winners in the Winners page first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalWinnersPages > 1 && (
            <div className="pagination" style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setWinnersPage(1)}
                disabled={winnersPage === 1}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                First
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setWinnersPage((prev) => Math.max(prev - 1, 1))}
                disabled={winnersPage === 1}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                Prev
              </button>
              <span className="muted" style={{ fontSize: '0.85rem', margin: '0 8px' }}>
                Page <strong>{winnersPage}</strong> of {totalWinnersPages} ({filteredWinners.length} items)
              </span>
              <button
                type="button"
                className="btn"
                onClick={() => setWinnersPage((prev) => Math.min(prev + 1, totalWinnersPages))}
                disabled={winnersPage === totalWinnersPages}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                Next
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setWinnersPage(totalWinnersPages)}
                disabled={winnersPage === totalWinnersPages}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                Last
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
