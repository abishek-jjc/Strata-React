import { useState, useEffect } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import GuestLayout from '../../components/layout/GuestLayout'

export default function GuestRegister() {
  const location = useLocation()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [rulesList, setRulesList] = useState([])
  const [loading, setLoading] = useState(true)

  // Form State
  const [leaderName, setLeaderName] = useState('')
  const [leaderPhone, setLeaderPhone] = useState('')
  const [leaderEmail, setLeaderEmail] = useState('')
  const [leaderDept, setLeaderDept] = useState('')
  const [collegeName, setCollegeName] = useState('')

  const [vegCount, setVegCount] = useState(0)
  const [nonVegCount, setNonVegCount] = useState(0)
  const [agreeRules, setAgreeRules] = useState(false)

  // Tab State
  const [activeEventId, setActiveEventId] = useState('')
  
  // Participant inputs map: { eventId: [ { studentName, year, email } ] }
  const [participants, setParticipants] = useState({})

  // Modal and overlays
  const [showRulesModal, setShowRulesModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Unique team members count & validation states
  const [uniqueCount, setUniqueCount] = useState(0)
  const [maxAllowedLimit, setMaxAllowedLimit] = useState(10)
  const [warningText, setWarningText] = useState('')
  const [submitDisabled, setSubmitDisabled] = useState(false)

  const [showQrScanPrompt, setShowQrScanPrompt] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const collegeParam = params.get('college')
    const deptParam = params.get('department')
    if (collegeParam) setCollegeName(collegeParam)
    if (deptParam) setLeaderDept(deptParam)
    if (!collegeParam || !deptParam) {
      setShowQrScanPrompt(true)
    }
  }, [location.search])

  useEffect(() => {
    async function loadData() {
      // 1. Fetch active events
      const { data: eventsData } = await supabase
        .from(TABLES.EVENTS)
        .select('*')
        .eq('status', 'active')
        .order('event_name', { ascending: true })

      // 2. Fetch regulations for popup
      const { data: rulesData } = await supabase
        .from(TABLES.RULES)
        .select('*')
        .order('created_at', { ascending: true })

      if (rulesData) {
        setRulesList(rulesData)
      }

      if (eventsData) {
        setEvents(eventsData)
        
        // Calculate max allowed limit (sum of capacities of all active events)
        let totalLimit = 0
        const initialParts = {}
        eventsData.forEach(e => {
          const cap = e.team_size || 1
          totalLimit += cap
          
          initialParts[e.id] = Array.from({ length: cap }, () => ({
            studentName: '',
            year: '',
            email: ''
          }))
        })
        
        setMaxAllowedLimit(totalLimit || 10)
        setParticipants(initialParts)

        // Set default active tab
        if (eventsData.length > 0) {
          // Check if router state passed a preselected event
          if (location.state?.preselectedEventId) {
            setActiveEventId(location.state.preselectedEventId)
          } else {
            setActiveEventId(eventsData[0].id)
          }
        }
      }
      setLoading(false)
    }
    loadData()
  }, [location.state])

  // Recalculate unique team size and run rules checking in useEffect whenever inputs change
  useEffect(() => {
    if (events.length === 0) return

    const uniqueNames = new Set()
    const leaderClean = leaderName.trim().toLowerCase()

    // Loop through all participants
    Object.keys(participants).forEach(eventId => {
      const list = participants[eventId] || []
      list.forEach(p => {
        const name = p.studentName.trim().toLowerCase()
        if (name !== '' && name !== leaderClean) {
          uniqueNames.add(name)
        }
      })
    })

    const count = uniqueNames.size
    setUniqueCount(count)

    let ok = true
    let warning = ''

    if (count > maxAllowedLimit) {
      ok = false
      warning = `Limit Exceeded: A college team is limited to a maximum of ${maxAllowedLimit} members.`
    }

    const foodTotal = vegCount + nonVegCount
    if (foodTotal !== count && count > 0) {
      if (warning === '') {
        warning = `Food choice count error: Veg (${vegCount}) + Non-Veg (${nonVegCount}) must equal total unique team members (${count}).`
      }
    }

    setWarningText(warning)
    if (!ok || (foodTotal !== count && count > 0)) {
      setSubmitDisabled(true)
    } else {
      setSubmitDisabled(false)
    }
  }, [participants, leaderName, vegCount, nonVegCount, maxAllowedLimit, events])

  function updateParticipant(eventId, index, field, value) {
    setParticipants(prev => {
      const list = [...(prev[eventId] || [])]
      list[index] = { ...list[index], [field]: value }
      return { ...prev, [eventId]: list }
    })
  }

  // Check if an event tab is "filled" (i.e. Participant 1 has a name filled)
  function isTabFilled(eventId) {
    const list = participants[eventId]
    return list && list[0]?.studentName.trim() !== ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!agreeRules) {
      return setError('You must agree to the STRATA Rules & Regulations.')
    }

    // Identify registered events
    const activeRegs = []
    let activeEventsCount = 0

    events.forEach(event => {
      if (isTabFilled(event.id)) {
        activeEventsCount++
        const list = participants[event.id] || []
        
        // Filter out empty rows
        const filled = list.filter(p => p.studentName.trim() !== '')
        
        if (filled.length !== event.team_size) {
          setError(`Event "${event.event_name}" requires exactly ${event.team_size} participant(s) — currently you have entered ${filled.length}.`)
          return
        }

        activeRegs.push({
          eventId: event.id,
          participants: filled.map(p => ({
            studentName: p.studentName.trim(),
            gender: 'Male', // Default compatible attribute
            department: leaderDept.trim(), // Default to Leader's Department
            year: p.year.trim()
          }))
        })
      }
    })

    if (error) return
    if (activeEventsCount === 0) {
      return setError('Please enter participant details for at least one technical event.')
    }

    setSubmitting(true)
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('register_guest_team', {
        p_leader_name: leaderName,
        p_email: leaderEmail,
        p_phone: leaderPhone,
        p_department: leaderDept,
        p_college_name: collegeName,
        p_college_dept: leaderDept,
        p_college_phone: leaderPhone,
        p_college_email: leaderEmail,
        p_college_address: 'Spot Registration',
        p_veg_count: vegCount,
        p_nonveg_count: nonVegCount,
        p_registrations: activeRegs
      })

      if (rpcError) throw rpcError

      // Retrieve out_leader_id and out_college_id returned by register_guest_team
      const { out_leader_id, out_college_id } = rpcResult?.[0] || {}

      if (out_leader_id) {
        // Automatically create auth account using email and mobile number as password
        try {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: leaderEmail,
            password: leaderPhone,
          })
          if (signUpError) throw signUpError

          if (signUpData?.user) {
            // Call RPC to bypass RLS and create profile row linked to student leader
            const { error: profileError } = await supabase.rpc('create_leader_profile', {
              p_user_id: signUpData.user.id,
              p_ref_id: out_leader_id,
              p_college_id: out_college_id,
              p_name: leaderName,
            })
            if (profileError) throw profileError
          }
        } catch (authErr) {
          console.error('Auto-provisioning auth account failed:', authErr)
          alert('Leader auth account creation failed: ' + authErr.message + '\n(Your registration is saved but you might not be able to log in yet.)')
        }
      }

      setSuccessMessage('Your college team has been successfully registered. Please verify payment at the spot desk.')
      
      // Reset Form State
      setLeaderName('')
      setLeaderPhone('')
      setLeaderEmail('')
      setLeaderDept('')
      setCollegeName('')
      setVegCount(0)
      setNonVegCount(0)
      setAgreeRules(false)
      
      // Reset participant slots
      const initialParts = {}
      events.forEach(e => {
        initialParts[e.id] = Array.from({ length: e.team_size || 1 }, () => ({
          studentName: '',
          year: '',
          email: ''
        }))
      })
      setParticipants(initialParts)
    } catch (err) {
      setError(err.message || 'Error occurred during registration.')
    } finally {
      setSubmitting(false)
    }
  }

  const borderColors = ['#7c4dff', '#00e5ff', '#ff1744', '#ffeb3b', '#4caf50', '#ff9800']
  const activeEvent = events.find(e => e.id === activeEventId)

  return (
    <GuestLayout>
      {/* Dynamic Success Card overlay */}
      {successMessage && (
        <div className="guest-success-overlay">
          <div className="guest-success-card guest-glass-panel">
            <div className="guest-success-icon">✓</div>
            <h2>Registration Successful!</h2>
            <p>{successMessage}</p>
            <button onClick={() => navigate('/')} className="guest-btn guest-btn-primary">
              Return to Homepage
            </button>
          </div>
        </div>
      )}

      {/* Rules & Regulations Popup Modal */}
      <div className={`guest-rules-modal ${showRulesModal ? 'active' : ''}`}>
        <div className="guest-modal-card guest-glass-panel">
          <div className="guest-modal-header">
            <h3>STRATA 2K26 General Regulations</h3>
            <span className="guest-modal-close" onClick={() => setShowRulesModal(false)}>×</span>
          </div>
          <div style={{ maxHeight: '55vh', overflowY: 'auto', paddingRight: '15px', display: 'grid', gap: '25px' }}>
            {rulesList.map(rule => (
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '15px' }} key={rule.id}>
                <h4 style={{ fontFamily: 'Syne, sans-serif', color: 'var(--g-secondary)', marginBottom: '10px' }}>
                  {rule.title}
                </h4>
                <ul className="guest-modal-rules-list">
                  {rule.points.split('\n').filter(pt => pt.trim() !== '').map((pt, i) => (
                    <li key={i}>
                      <span className="guest-modal-bullet">✦</span> <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {rulesList.length === 0 && (
              <p style={{ color: 'var(--g-text-muted)', textAlign: 'center' }}>No rules loaded.</p>
            )}
          </div>
          <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <button type="button" className="guest-btn guest-btn-secondary" onClick={() => setShowRulesModal(false)}>
              Close & Continue
            </button>
          </div>
        </div>
      </div>

      {/* Main Registration Section */}
      <section className="guest-section">
        <div className="guest-section-header">
          <span className="guest-section-tag">Form Your Alliance</span>
          <h2 className="guest-section-title">College Registration</h2>
        </div>

        {error && (
          <div className="guest-glass-panel" style={{ background: 'rgba(255, 23, 68, 0.08)', border: '1px solid rgba(255, 23, 68, 0.3)', color: 'var(--g-accent)', padding: '15px 25px', borderRadius: '12px', marginBottom: '30px', fontSize: '0.95rem' }}>
            <strong>Error: </strong> {error}
          </div>
        )}

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--g-text-muted)' }}>Loading registration form...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Card 1: Leader Details */}
            <div className="guest-glass-panel" style={{ padding: '40px' }}>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.4rem', color: 'var(--g-secondary)', marginBottom: '25px', borderBottom: '1px solid var(--g-glass-border)', paddingBottom: '12px' }}>
                Leader & Institution Details
              </h3>
              <div className="guest-form-row">
                <label className="guest-field">
                  <span>Leader Name</span>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Alex Mercer" 
                    value={leaderName}
                    onChange={(e) => setLeaderName(e.target.value)}
                  />
                </label>
                <label className="guest-field">
                  <span>Mobile Number</span>
                  <input 
                    type="tel" 
                    required 
                    placeholder="e.g. 9876543210" 
                    pattern="[6789][0-9]{9}" 
                    title="Enter a valid 10-digit mobile number"
                    value={leaderPhone}
                    onChange={(e) => setLeaderPhone(e.target.value)}
                  />
                </label>
              </div>
              <div className="guest-form-row">
                <label className="guest-field">
                  <span>Email Address ID</span>
                  <input 
                    type="email" 
                    required 
                    placeholder="e.g. leader@gmail.com" 
                    value={leaderEmail}
                    onChange={(e) => setLeaderEmail(e.target.value)}
                  />
                </label>
                <label className="guest-field">
                  <span>Department</span>
                  <input 
                    type="text" 
                    required 
                    readOnly
                    style={{ backgroundColor: 'rgba(255,255,255,0.02)', cursor: 'not-allowed', opacity: 0.8 }}
                    placeholder="Auto-filled via QR Code scan" 
                    value={leaderDept}
                  />
                </label>
              </div>
              <div className="guest-form-row" style={{ margin: 0 }}>
                <label className="guest-field" style={{ gridColumn: 'span 2' }}>
                  <span>College Name</span>
                  <input 
                    type="text" 
                    required 
                    readOnly
                    style={{ backgroundColor: 'rgba(255,255,255,0.02)', cursor: 'not-allowed', opacity: 0.8 }}
                    placeholder="Auto-filled via QR Code scan" 
                    value={collegeName}
                  />
                </label>
              </div>
            </div>

            {/* Card 2: Contest Portals & Sub-teams Selection */}
            <div className="guest-glass-panel" style={{ padding: '40px' }}>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.4rem', color: 'var(--g-secondary)', marginBottom: '25px', borderBottom: '1px solid var(--g-glass-border)', paddingBottom: '12px' }}>
                Contest Portals & Sub-teams Selection
              </h3>

              {events.length > 0 ? (
                <>
                  {/* Event pill tabs */}
                  <div className="guest-event-tabs-navbar">
                    {events.map((event) => (
                      <button
                        type="button"
                        key={event.id}
                        className={`guest-tab-btn ${event.id === activeEventId ? 'active' : ''} ${isTabFilled(event.id) ? 'filled' : ''}`}
                        onClick={() => setActiveEventId(event.id)}
                      >
                        {event.event_name}
                      </button>
                    ))}
                  </div>

                  {/* Active event inputs panel */}
                  {activeEvent && (
                    <div className="guest-event-panel-wrapper">
                      <div style={{ marginBottom: '12px', fontSize: '0.95rem', color: 'var(--g-secondary)', fontWeight: '600' }}>
                        Event: <span style={{ color: 'var(--g-text)' }}>{activeEvent.event_name}</span> (Allowed size: {activeEvent.team_size} members)
                      </div>

                      <div className="guest-sub-team-inputs-container">
                        {Array.from({ length: activeEvent.team_size || 1 }).map((_, idx) => {
                          const pData = participants[activeEvent.id]?.[idx] || { studentName: '', year: '', email: '' }
                          const isRequired = idx === 0 && isTabFilled(activeEvent.id)
                          const leftColor = borderColors[idx % borderColors.length]
                          
                          return (
                            <div 
                              className="guest-participant-card-styled" 
                              style={{ borderLeft: `3px solid ${leftColor}` }}
                              key={idx}
                            >
                              <div className="guest-participant-card-title-styled">
                                Participant #{idx + 1} {idx === 0 && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--g-text-muted)', fontWeight: 'normal' }}>
                                    (Filling Participant 1 registers the team for this event)
                                  </span>
                                )}
                              </div>
                              <div className="guest-form-row">
                                <label className="guest-field">
                                  <span>Full Name {isRequired && '*'}</span>
                                  <input 
                                    type="text" 
                                    placeholder="Enter full name" 
                                    value={pData.studentName}
                                    required={isRequired}
                                    onChange={(e) => updateParticipant(activeEvent.id, idx, 'studentName', e.target.value)}
                                  />
                                </label>
                                <label className="guest-field">
                                  <span>Class / Year</span>
                                  <input 
                                    type="text" 
                                    placeholder="e.g. III BCA / I MSc IT" 
                                    value={pData.year}
                                    onChange={(e) => updateParticipant(activeEvent.id, idx, 'year', e.target.value)}
                                  />
                                </label>
                              </div>
                              <div className="guest-form-row" style={{ margin: 0 }}>
                                <label className="guest-field" style={{ gridColumn: 'span 2' }}>
                                  <span>Email Address</span>
                                  <input 
                                    type="email" 
                                    placeholder="e.g. participant@gmail.com" 
                                    value={pData.email}
                                    onChange={(e) => updateParticipant(activeEvent.id, idx, 'email', e.target.value)}
                                  />
                                </label>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--g-text-muted)', padding: '30px' }}>
                  No active event arenas configured yet.
                </div>
              )}
            </div>

            {/* Card 3: Food details & agreement */}
            <div className="guest-glass-panel" style={{ padding: '40px' }}>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.4rem', color: 'var(--g-secondary)', marginBottom: '25px', borderBottom: '1px solid var(--g-glass-border)', paddingBottom: '12px' }}>
                Final Verification & Food Counts
              </h3>
              <p style={{ color: 'var(--g-text-muted)', fontSize: '0.95rem', marginBottom: '25px', lineHeight: '1.5' }}>
                Verify your food choice allocations below. The sum of Veg and Non-Veg counts must equal exactly the total number of unique registered team members.
              </p>

              <div className="guest-form-row" style={{ marginBottom: '30px' }}>
                <label className="guest-field">
                  <span>Vegetarian Lunch Count</span>
                  <input 
                    type="number" 
                    min="0"
                    required 
                    placeholder="0" 
                    value={vegCount}
                    onChange={(e) => setVegCount(parseInt(e.target.value) || 0)}
                  />
                </label>
                <label className="guest-field">
                  <span>Non-Vegetarian Lunch Count</span>
                  <input 
                    type="number" 
                    min="0"
                    required 
                    placeholder="0" 
                    value={nonVegCount}
                    onChange={(e) => setNonVegCount(parseInt(e.target.value) || 0)}
                  />
                </label>
              </div>

              <div className="rules-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                <input 
                  type="checkbox" 
                  id="agree_rules"
                  checked={agreeRules}
                  required
                  onChange={(e) => setAgreeRules(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--g-secondary)', cursor: 'pointer' }}
                />
                <label htmlFor="agree_rules" style={{ fontSize: '0.95rem', textTransform: 'none', color: '#e0e0e0', cursor: 'pointer' }}>
                  I agree to all the <a href="javascript:void(0)" onClick={() => setShowRulesModal(true)} style={{ color: 'var(--g-secondary)', textDecoration: 'none', fontWeight: '500' }}>STRATA 2K26 Rules & Regulations</a> and certify that our team meets the eligibility requirements.
                </label>
              </div>

              <div style={{ marginTop: '30px', textAlign: 'center' }}>
                <button 
                  type="submit" 
                  className="guest-btn guest-btn-primary" 
                  disabled={submitDisabled || submitting} 
                  style={{ padding: '16px 50px' }}
                >
                  {submitting ? 'Submitting Team Registration...' : 'Submit Team Registration'}
                </button>
                {warningText && (
                  <div id="validation-warning-msg" style={{ color: 'var(--g-accent)', fontSize: '0.95rem', marginTop: '15px', fontWeight: '500' }}>
                    {warningText}
                  </div>
                )}
              </div>
            </div>
          </form>
        )}
      </section>

      {/* Floating Counter Badge */}
      <div className={`guest-sticky-counter-badge ${uniqueCount > maxAllowedLimit ? 'warning' : ''}`} id="counterBadge">
        Unique Team Members: <span>{uniqueCount}</span> / <span>{maxAllowedLimit}</span>
      </div>

      {/* QR Code Scan Prompt Modal Overlay */}
      {showQrScanPrompt && (
        <div className="guest-success-overlay" style={{ backdropFilter: 'blur(20px)', zIndex: 1000 }}>
          <div className="guest-success-card guest-glass-panel" style={{ maxWidth: '480px', textAlign: 'center', padding: '40px' }}>
            <div className="guest-success-icon" style={{ background: 'rgba(255, 23, 68, 0.1)', color: 'var(--g-accent)', border: '1px solid rgba(255, 23, 68, 0.2)' }}>🛈</div>
            <h2>Scan Invitation QR</h2>
            <p style={{ color: 'var(--g-text-muted)', fontSize: '0.95rem', margin: '20px 0', lineHeight: '1.6' }}>
              Registrations are restricted. Please scan the QR code printed on your official manual invitation letter to access the registration form.
            </p>
            <div style={{ marginTop: '25px' }}>
              <button onClick={() => navigate('/')} className="guest-btn guest-btn-secondary" style={{ width: '100%' }}>
                Return to Homepage
              </button>
            </div>
          </div>
        </div>
      )}
    </GuestLayout>
  )
}
