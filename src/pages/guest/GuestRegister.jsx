import { useState, useEffect } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import GuestLayout from '../../components/layout/GuestLayout'
import { Html5Qrcode } from 'html5-qrcode'
import { decryptCollegePayload } from '../../utils/qrCrypto'

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
  const [successCredentials, setSuccessCredentials] = useState(null)
  const [whatsappLink, setWhatsappLink] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Unique team members count & validation states
  const [uniqueCount, setUniqueCount] = useState(0)
  const [maxAllowedLimit, setMaxAllowedLimit] = useState(10)
  const [warningText, setWarningText] = useState('')
  const [submitDisabled, setSubmitDisabled] = useState(false)

  const [isDecrypted, setIsDecrypted] = useState(false)
  const [scanError, setScanError] = useState('')

  useEffect(() => {
    if (isDecrypted || loading || successMessage) return

    const qrScanner = new Html5Qrcode("reader")

    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
      let ciphertext = decodedText
      if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
        try {
          const url = new URL(decodedText)
          ciphertext = url.searchParams.get('payload') || ''
        } catch (e) {
          ciphertext = ''
        }
      }

      const decrypted = decryptCollegePayload(ciphertext)
      if (decrypted && decrypted.college && decrypted.department) {
        setCollegeName(decrypted.college)
        setLeaderDept(decrypted.department)
        setIsDecrypted(true)
        setScanError('')
        
        qrScanner.stop().then(() => {
          qrScanner.clear()
        }).catch(err => console.error("Failed to stop scanner", err))
      } else {
        setScanError('Invalid QR Code. Decryption failed. Please scan a valid invitation QR.')
      }
    }

    const config = { fps: 10 }
    
    qrScanner.start(
      { facingMode: "environment" },
      config,
      qrCodeSuccessCallback,
      () => {}
    ).catch((err) => {
      console.error("Camera start error:", err)
      let msg = "Failed to start camera scanner. Please ensure camera permissions are granted."
      if (!window.isSecureContext) {
        msg = "Camera access requires a secure connection (HTTPS) or localhost. Please reload the page securely."
      } else if (err && (String(err).includes("NotAllowedError") || String(err).includes("Permission denied"))) {
        msg = "Camera permission was denied. Please grant camera access in your browser settings."
      } else if (err && (String(err).includes("NotFoundError") || String(err).includes("no devices"))) {
        msg = "No camera device found on this system."
      } else if (err && (String(err).includes("supported") || String(err).includes("streaming"))) {
        msg = "Camera streaming is not supported by your browser or environment."
      } else if (err) {
        msg = `Camera scanner error: ${err}`
      }
      setScanError(msg)
    })

    return () => {
      if (qrScanner.isScanning) {
        qrScanner.stop().then(() => {
          qrScanner.clear()
        }).catch(err => console.error("Clean stop error:", err))
      }
    }
  }, [isDecrypted, loading])

  useEffect(() => {
    if (location.state?.autoDecryptedCollege && location.state?.autoDecryptedDept) {
      setCollegeName(location.state.autoDecryptedCollege)
      setLeaderDept(location.state.autoDecryptedDept)
      setIsDecrypted(true)
    }
  }, [location.state])

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

      // 3. Fetch settings for WhatsApp group link
      const { data: settingsData } = await supabase
        .from(TABLES.SETTINGS)
        .select('*')

      if (settingsData) {
        const wa = settingsData.find((s) => s.key_name === 'whatsapp_group_link')?.value || ''
        setWhatsappLink(wa)
      }

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

    if (leaderName.trim().length < 3) {
      return setError('Student leader name must be at least 3 characters long.')
    }

    // Identify registered events
    const activeRegs = []
    let activeEventsCount = 0
    let validationError = ''

    events.forEach(event => {
      if (isTabFilled(event.id)) {
        activeEventsCount++
        const list = participants[event.id] || []
        
        // Filter out empty rows
        const filled = list.filter(p => p.studentName.trim() !== '')
        
        if (filled.length !== event.team_size) {
          validationError = `Event "${event.event_name}" requires exactly ${event.team_size} participant(s) — currently you have entered ${filled.length}.`
          return
        }

        if (filled.some(p => p.studentName.trim().length < 3)) {
          validationError = `Participant names in event "${event.event_name}" must be at least 3 characters long.`
          return
        }

        activeRegs.push({
          eventId: event.id,
          participants: filled.map(p => ({
            studentName: p.studentName.trim(),
            gender: p.gender || 'Male',
            department: leaderDept.trim(), // Default to Leader's Department
            year: p.year.trim()
          }))
        })
      }
    })

    if (validationError) {
      return setError(validationError)
    }

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

      setSuccessCredentials({
        email: leaderEmail,
        phone: leaderPhone,
        whatsappLink: whatsappLink
      })
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
      setIsDecrypted(false)
      
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

  if (loading) {
    return (
      <GuestLayout>
        <section className="guest-section">
          <p style={{ textAlign: 'center', color: 'var(--g-text-muted)', paddingTop: '60px' }}>Loading registration...</p>
        </section>
      </GuestLayout>
    )
  }

  if (successMessage && successCredentials) {
    return (
      <GuestLayout>
        <section className="guest-section" style={{ display: 'flex', minHeight: '65vh', justifyContent: 'center', alignItems: 'center', padding: '20px 0' }}>
          <div className="guest-success-card guest-glass-panel" style={{ maxWidth: '550px', width: '100%', padding: '40px', borderRadius: '24px', textAlign: 'center' }}>
            <div className="guest-success-icon" style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #00e5ff, #7c4dff)', color: '#fff', fontSize: '2.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 25px auto', boxShadow: '0 0 20px rgba(0,229,255,0.4)' }}>✓</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '2.2rem', marginBottom: '15px', color: '#fff' }}>Registration Successful!</h2>
            <p style={{ color: 'var(--g-text-muted)', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '25px' }}>{successMessage}</p>
            
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--g-glass-border)', borderRadius: '16px', padding: '20px', marginBottom: '25px', textAlign: 'left' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: 'var(--g-secondary)', fontFamily: 'Syne, sans-serif' }}>Your Login Credentials</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.8)' }}>
                  <strong style={{ color: 'var(--g-text-muted)' }}>Login ID (Email): </strong>
                  <code style={{ fontSize: '1rem', color: '#00e5ff', background: 'rgba(0,229,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{successCredentials.email}</code>
                </div>
                <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.8)' }}>
                  <strong style={{ color: 'var(--g-text-muted)' }}>Password (Mobile): </strong>
                  <code style={{ fontSize: '1rem', color: '#00e5ff', background: 'rgba(0,229,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{successCredentials.phone}</code>
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--g-accent)', marginTop: '12px', margin: '12px 0 0 0', opacity: 0.9 }}>
                ⚠️ Please note down these details. Use them to log in to your dashboard to track verification status.
              </p>
            </div>

            {successCredentials.whatsappLink && (
              <a 
                href={successCredentials.whatsappLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="guest-btn" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '10px', 
                  padding: '14px 28px', 
                  borderRadius: '12px', 
                  textDecoration: 'none', 
                  marginBottom: '25px', 
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #25D366, #128C7E)',
                  border: 'none',
                  boxShadow: '0 4px 15px rgba(37,211,102,0.3)',
                  color: '#fff'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}>
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436.002 9.858-4.417 9.86-9.86.001-2.638-1.024-5.117-2.884-6.979C16.574 1.897 14.1 1.072 11.464 1.072c-5.404 0-9.81 4.403-9.811 9.845 0 1.698.448 3.355 1.3 4.803L1.93 21.05l5.525-1.453.192.115zm10.763-7.061c-.29-.145-1.71-.845-1.973-.94-.264-.096-.456-.145-.647.145-.19.29-.738.94-.902 1.129-.165.19-.33.213-.62.068-.29-.145-1.226-.452-2.336-1.441-.864-.771-1.447-1.724-1.616-2.014-.17-.29-.018-.447.127-.591.13-.13.29-.338.435-.507.145-.169.19-.29.29-.483.096-.193.048-.361-.025-.506-.072-.145-.647-1.56-.887-2.138-.233-.564-.49-.488-.673-.497-.174-.007-.375-.009-.575-.009-.201 0-.528.075-.802.375-.274.3-.1.748.1.94.2.19.435.507.69.75.25.244.526.471.821.683.473.342.92.518 1.341.528.433.01.87-.197 1.13-.393.26-.197.66-.456.9-.663.24-.207.45-.483.626-.827.177-.345.263-.662.13-.94-.132-.276-.757-1.828-.757-1.828s-.24-.583-.6-.72c-.36-.137-1.225.412-1.225.412s-.78.583-.98 1.46c-.2.877-.52 2.508.82 4.417 1.34 1.91 3.52 3.65 6.08 4.67.66.26 1.3.47 1.83.64.6.19 1.16.16 1.6.1.48-.07 1.48-.6 1.69-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.19-.52-.335z"/>
                </svg>
                Join Official WhatsApp Group
              </a>
            )}

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button 
                type="button" 
                onClick={() => {
                  setSuccessMessage('')
                  setSuccessCredentials(null)
                  navigate('/login')
                }} 
                className="guest-btn guest-btn-primary"
                style={{ flex: 1 }}
              >
                Go to Login Portal
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setSuccessMessage('')
                  setSuccessCredentials(null)
                  navigate('/')
                }} 
                className="guest-btn guest-btn-secondary"
                style={{ flex: 1 }}
              >
                Return Home
              </button>
            </div>
          </div>
        </section>
      </GuestLayout>
    )
  }

  if (!isDecrypted) {
    return (
      <GuestLayout>
        <section className="guest-section">
          <div className="guest-section-header">
            <span className="guest-section-tag">Verify Invitation</span>
            <h2 className="guest-section-title">Invitation Scanner</h2>
          </div>

          <div className="guest-glass-panel" style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <h3 style={{ fontFamily: 'Syne, sans-serif', color: 'var(--g-secondary)', marginBottom: '15px' }}>
              Scan QR Code to Register
            </h3>
            <p style={{ color: 'var(--g-text-muted)', fontSize: '0.95rem', marginBottom: '25px', lineHeight: '1.6' }}>
              Please scan the QR code printed on your official STRATA invitation letter using your device camera to unlock the registration form.
            </p>

            <div 
              id="reader" 
              style={{ 
                width: '100%', 
                maxWidth: '350px', 
                margin: '0 auto 25px auto', 
                borderRadius: '16px', 
                overflow: 'hidden',
                border: '1px solid var(--g-glass-border)',
                background: 'rgba(0,0,0,0.3)',
                aspectRatio: '1'
              }}
            ></div>

            {scanError && (
              <div style={{ color: 'var(--g-accent)', fontSize: '0.95rem', margin: '15px 0', padding: '10px 15px', borderRadius: '8px', background: 'rgba(255,23,68,0.05)', border: '1px solid rgba(255,23,68,0.2)' }}>
                {scanError}
              </div>
            )}

            <div style={{ marginTop: '20px' }}>
              <button type="button" onClick={() => navigate('/')} className="guest-btn guest-btn-secondary">
                Cancel & Return Home
              </button>
            </div>
          </div>
        </section>
      </GuestLayout>
    )
  }

  const borderColors = ['#7c4dff', '#00e5ff', '#ff1744', '#ffeb3b', '#4caf50', '#ff9800']
  const activeEvent = events.find(e => e.id === activeEventId)

  return (
    <GuestLayout>

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
                          const pData = participants[activeEvent.id]?.[idx] || { studentName: '', year: '', email: '', gender: '' }
                          const isRequired = isTabFilled(activeEvent.id)
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
                                  <span>Class {isRequired && '*'}</span>
                                  <select
                                    value={pData.year}
                                    required={isRequired}
                                    onChange={(e) => updateParticipant(activeEvent.id, idx, 'year', e.target.value)}
                                  >
                                    <option value="">Select Year…</option>
                                    <option value="1st">1st</option>
                                    <option value="2nd">2nd</option>
                                    <option value="3rd">3rd</option>
                                  </select>
                                </label>
                              </div>
                              <div className="guest-form-row" style={{ margin: 0 }}>
                                <label className="guest-field">
                                  <span>Gender {isRequired && '*'}</span>
                                  <select
                                    value={pData.gender || ''}
                                    required={isRequired}
                                    onChange={(e) => updateParticipant(activeEvent.id, idx, 'gender', e.target.value)}
                                  >
                                    <option value="">Select Gender…</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                  </select>
                                </label>
                                <label className="guest-field">
                                  <span>Email Address {isRequired && '*'}</span>
                                  <input 
                                    type="email" 
                                    placeholder="e.g. participant@gmail.com" 
                                    value={pData.email}
                                    required={isRequired}
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
                  I agree to all the <a href="#" onClick={(e) => { e.preventDefault(); setShowRulesModal(true); }} style={{ color: 'var(--g-secondary)', textDecoration: 'none', fontWeight: '500' }}>STRATA 2K26 Rules & Regulations</a> and certify that our team meets the eligibility requirements.
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
    </GuestLayout>
  )
}
