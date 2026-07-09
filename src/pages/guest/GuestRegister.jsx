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
  
  // App Config & Meta State
  const [events, setEvents] = useState([])
  const [rulesList, setRulesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [whatsappLink, setWhatsappLink] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Wizard state: 1 (Leader Auth & Profile creation), 2 (Participants creation), 3 (Food & Submit)
  const [step, setStep] = useState(1)

  // QR Code decryption state
  const [isDecrypted, setIsDecrypted] = useState(false)
  const [scanError, setScanError] = useState('')
  const [collegeName, setCollegeName] = useState('')
  const [leaderDept, setLeaderDept] = useState('')

  // Google OAuth Session State
  const [sessionUser, setSessionUser] = useState(null)
  const [alreadyRegisteredLeader, setAlreadyRegisteredLeader] = useState('')

  // Step 1: Leader Profile Inputs
  const [leaderName, setLeaderName] = useState('')
  const [leaderPhone, setLeaderPhone] = useState('')
  const [collegeId, setCollegeId] = useState('')
  const [leaderId, setLeaderId] = useState('')

  // Step 2: Tab & Participant inputs map: { eventId: [ { studentName, year, email, gender } ] }
  const [activeEventId, setActiveEventId] = useState('')
  const [participants, setParticipants] = useState({})
  const [uniqueCount, setUniqueCount] = useState(0)
  const [maxAllowedLimit, setMaxAllowedLimit] = useState(10)
  const [warningText, setWarningText] = useState('')
  const [submitDisabled, setSubmitDisabled] = useState(false)

  // Step 3: Food & Declaration Inputs
  const [vegCount, setVegCount] = useState(0)
  const [nonVegCount, setNonVegCount] = useState(0)
  const [agreeRules, setAgreeRules] = useState(false)
  const [showRulesModal, setShowRulesModal] = useState(false)

  // Helper to query if a college + department has already registered a student leader
  async function checkCollegeRegistration(name, dept) {
    if (!name || !dept) return false
    try {
      const { data: collegeRow } = await supabase
        .from(TABLES.COLLEGES)
        .select('id')
        .eq('college', name.trim())
        .eq('department', dept.trim())
        .maybeSingle()

      if (collegeRow) {
        const { data: leaderRow } = await supabase
          .from(TABLES.STUDENT_LEADERS)
          .select('name')
          .eq('college_id', collegeRow.id)
          .eq('status', 'active')
          .maybeSingle()

        if (leaderRow) {
          setAlreadyRegisteredLeader(leaderRow.name)
          return true
        }
      }
    } catch (err) {
      console.error('Error checking college registration:', err)
    }
    return false
  }

  // 1. Google OAuth Session Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionUser(data.session?.user || null)
    })
    
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user || null)
    })
    
    return () => listener.subscription.unsubscribe()
  }, [])

  // 2. Trigger check when sessionUser loads
  useEffect(() => {
    if (sessionUser) {
      async function checkExistingLeader() {
        try {
          const { data: leader } = await supabase
            .from(TABLES.STUDENT_LEADERS)
            .select('name, id, college_id')
            .eq('email', sessionUser.email)
            .maybeSingle()

          if (leader) {
            // Already registered leader
            setAlreadyRegisteredLeader(leader.name)
            setLeaderId(leader.id)
            setCollegeId(leader.college_id)
          } else {
            // Check if there is a pending college registration stored in sessionStorage
            const savedCol = sessionStorage.getItem('pending_college_name')
            const savedDept = sessionStorage.getItem('pending_leader_dept')
            if (savedCol && savedDept) {
              const isReg = await checkCollegeRegistration(savedCol, savedDept)
              if (!isReg) {
                setCollegeName(savedCol)
                setLeaderDept(savedDept)
                setIsDecrypted(true)
                // Initialize leader name from Google profile metadata
                setLeaderName(sessionUser.user_metadata?.full_name || '')
              }
            }
          }
        } catch (err) {
          console.error(err)
        }
      }
      checkExistingLeader()
    }
  }, [sessionUser])

  // 3. QR Camera Scanner Initialization
  useEffect(() => {
    if (isDecrypted || loading || successMessage || alreadyRegisteredLeader || sessionUser) return

    const qrScanner = new Html5Qrcode("reader")

    const qrCodeSuccessCallback = (decodedText) => {
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
        qrScanner.stop().then(() => {
          qrScanner.clear()
        }).catch(err => console.error("Failed to stop scanner", err))

        checkCollegeRegistration(decrypted.college, decrypted.department).then((isReg) => {
          if (!isReg) {
            setCollegeName(decrypted.college)
            setLeaderDept(decrypted.department)
            setIsDecrypted(true)
            setScanError('')
          }
        })
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
  }, [isDecrypted, loading, alreadyRegisteredLeader, sessionUser])

  // 4. Handle initial router state redirects
  useEffect(() => {
    if (location.state?.autoDecryptedCollege && location.state?.autoDecryptedDept) {
      checkCollegeRegistration(location.state.autoDecryptedCollege, location.state.autoDecryptedDept).then((isReg) => {
        if (!isReg) {
          setCollegeName(location.state.autoDecryptedCollege)
          setLeaderDept(location.state.autoDecryptedDept)
          setIsDecrypted(true)
          if (sessionUser) {
            setLeaderName(sessionUser.user_metadata?.full_name || '')
          }
        }
      })
    }
  }, [location.state, sessionUser])

  // 5. Load configuration, active events and fests
  useEffect(() => {
    async function loadData() {
      const { data: eventsData } = await supabase
        .from(TABLES.EVENTS)
        .select('*')
        .eq('status', 'active')
        .order('event_name', { ascending: true })

      const { data: rulesData } = await supabase
        .from(TABLES.RULES)
        .select('*')
        .order('created_at', { ascending: true })

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
        
        let totalLimit = 0
        const initialParts = {}
        eventsData.forEach(e => {
          const cap = e.team_size || 1
          totalLimit += cap
          
          initialParts[e.id] = Array.from({ length: cap }, () => ({
            studentName: '',
            rollNo: ''
          }))
        })
        
        setMaxAllowedLimit(totalLimit || 10)
        setParticipants(initialParts)

        if (eventsData.length > 0) {
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

  // 6. Recalculate unique team counts
  useEffect(() => {
    if (events.length === 0) return

    const uniqueNames = new Set()
    const leaderClean = leaderName.trim().toLowerCase()

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

  function isTabFilled(eventId) {
    const list = participants[eventId]
    return list && list[0]?.studentName.trim() !== ''
  }

  // Step 1 Redirect Trigger to Google OAuth
  async function handleRegisterGoogleLogin() {
    setError('')
    try {
      sessionStorage.setItem('pending_college_name', collegeName)
      sessionStorage.setItem('pending_leader_dept', leaderDept)
      
      const { error: oAuthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/register'
        }
      })
      if (oAuthError) throw oAuthError
    } catch (err) {
      setError('OAuth initialization failed: ' + err.message)
    }
  }

  // Proceed Leader Profile Form (Saves leader row and links profile)
  async function handleProceedLeaderProfile(e) {
    e.preventDefault()
    setError('')
    if (!leaderPhone || leaderPhone.trim().length < 10) {
      return setError('Please enter a valid 10-digit mobile number.')
    }

    setSubmitting(true)
    try {
      const { data: rpcResult, error: configureError } = await supabase.rpc('configure_leader_profile', {
        p_user_id: sessionUser.id,
        p_leader_name: leaderName,
        p_leader_phone: leaderPhone.trim(),
        p_leader_dept: leaderDept.trim(),
        p_college_name: collegeName.trim()
      })
      if (configureError) throw configureError

      const { college_id, leader_id } = rpcResult
      setCollegeId(college_id)
      setLeaderId(leader_id)

      setStep(2)
    } catch (err) {
      setError('Failed to configure leader profile: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Final submit handler for Step 3
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!agreeRules) {
      return setError('You must agree to the STRATA Rules & Regulations.')
    }

    const activeRegs = []
    let activeEventsCount = 0
    let validationError = ''
    
    // To check for duplicate roll numbers globally across all events
    const allRollNos = new Set()

    events.forEach(event => {
      if (isTabFilled(event.id)) {
        activeEventsCount++
        const list = participants[event.id] || []
        const filled = list.filter(p => p.studentName.trim() !== '')
        
        if (filled.length !== event.team_size) {
          validationError = `Event "${event.event_name}" requires exactly ${event.team_size} participant(s) — currently you have entered ${filled.length}.`
          return
        }

        if (filled.some(p => p.studentName.trim().length < 3)) {
          validationError = `Participant names in event "${event.event_name}" must be at least 3 characters long.`
          return
        }

        filled.forEach(p => {
          const roll = (p.rollNo || '').trim().toLowerCase()
          if (!roll) {
             validationError = `Roll Number is missing for participant ${p.studentName.trim()} in event "${event.event_name}".`
          } else if (allRollNos.has(roll)) {
             validationError = `Duplicate Roll Number found: "${roll}". A student can only have one unique roll number, and cannot be registered twice with the same roll number.`
          } else {
             allRollNos.add(roll)
          }
        })

        if (validationError) return

        activeRegs.push({
          eventId: event.id,
          participants: filled.map(p => ({
            studentName: p.studentName.trim(),
            rollNo: (p.rollNo || '').trim()
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
      // Loop to register for each selected event
      for (const reg of activeRegs) {
        const { data: regId, error: regError } = await supabase.rpc('register_team', {
          p_college_id: collegeId,
          p_leader_id: leaderId,
          p_event_id: reg.eventId,
          p_participants: reg.participants
        })
        if (regError) throw regError
        
        // Update lunch count choices
        const { error: countError } = await supabase.rpc('update_registration_food_count', {
          p_registration_id: regId,
          p_veg_count: vegCount,
          p_nonveg_count: nonVegCount
        })
        if (countError) throw countError
      }

      setSuccessMessage('Your college team has been successfully registered under your Google Account!')
      
      // Cleanup pending session storage
      sessionStorage.removeItem('pending_college_name')
      sessionStorage.removeItem('pending_leader_dept')

    } catch (err) {
      setError(err.message || 'Error occurred during registration.')
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <GuestLayout>
        <section className="guest-section">
          <p style={{ textAlign: 'center', color: 'var(--g-text-muted)', paddingTop: '60px' }}>Loading registration...</p>
        </section>
      </GuestLayout>
    )
  }

  // Already registered view
  if (alreadyRegisteredLeader) {
    return (
      <GuestLayout>
        <section className="guest-section">
          <div className="guest-section-header">
            <span className="guest-section-tag">Access Blocked</span>
            <h2 className="guest-section-title">Already Registered</h2>
          </div>

          <div className="guest-glass-panel" style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '20px' }}>🔒</span>
            <h3 style={{ fontFamily: 'Syne, sans-serif', color: 'var(--g-secondary)', marginBottom: '15px' }}>
              Registration Complete
            </h3>
            <p style={{ color: 'var(--g-text-muted)', fontSize: '0.95rem', marginBottom: '25px', lineHeight: '1.6' }}>
              Your college has already been registered in the STRATA portal by:
            </p>
            <div style={{
              background: 'rgba(0, 229, 255, 0.05)',
              border: '1px solid rgba(0, 229, 255, 0.2)',
              borderRadius: '12px',
              padding: '15px 20px',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              color: '#00e5ff',
              marginBottom: '30px',
              display: 'inline-block'
            }}>
              {alreadyRegisteredLeader}
            </div>
            <p style={{ color: 'var(--g-text-muted)', fontSize: '0.85rem', marginBottom: '25px', lineHeight: '1.5' }}>
              Only one registration is allowed per institution. Please access your leader portal dashboard.
            </p>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button type="button" onClick={() => navigate('/leader')} className="guest-btn guest-btn-primary" style={{ flex: 1 }}>
                Go to Leader Dashboard
              </button>
              <button type="button" onClick={() => navigate('/')} className="guest-btn guest-btn-secondary" style={{ flex: 1 }}>
                Return Home
              </button>
            </div>
          </div>
        </section>
      </GuestLayout>
    )
  }

  // Registration successful message
  if (successMessage) {
    return (
      <GuestLayout>
        <section className="guest-section" style={{ display: 'flex', minHeight: '65vh', justifyContent: 'center', alignItems: 'center', padding: '20px 0' }}>
          <div className="guest-success-card guest-glass-panel" style={{ maxWidth: '550px', width: '100%', padding: '40px', borderRadius: '24px', textAlign: 'center' }}>
            <div className="guest-success-icon" style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #00e5ff, #7c4dff)', color: '#fff', fontSize: '2.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 25px auto', boxShadow: '0 0 20px rgba(0,229,255,0.4)' }}>✓</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '2.2rem', marginBottom: '15px', color: '#fff' }}>Registration Successful!</h2>
            <p style={{ color: 'var(--g-text-muted)', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '25px' }}>{successMessage}</p>
            
            {whatsappLink && (
              <div style={{ marginBottom: '25px', textAlign: 'center' }}>
                <p style={{ color: 'var(--g-text-muted)', fontSize: '0.95rem', marginBottom: '15px' }}>
                  <strong>Note:</strong> Join the WhatsApp group for more information.
                </p>
                <a 
                  href={whatsappLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="guest-btn" 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '10px', 
                    padding: '14px 28px', 
                    borderRadius: '12px', 
                    textDecoration: 'none', 
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #25D366, #128C7E)',
                    border: 'none',
                    boxShadow: '0 4px 15px rgba(37,211,102,0.3)',
                    color: '#fff'
                  }}
                >
                  Join Official WhatsApp Group
                </a>
              </div>
            )}

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--g-glass-border)', borderRadius: '16px', padding: '20px', marginBottom: '25px', textAlign: 'left' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: 'var(--g-secondary)', fontFamily: 'Syne, sans-serif' }}>Google Login Verified</h4>
              <p style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.85)', margin: 0 }}>
                You have successfully signed up and logged in via your verified Google account: <strong>{sessionUser?.email}</strong>. No passwords are required.
              </p>
            </div>

            <button 
              type="button" 
              onClick={() => navigate('/leader')} 
              className="guest-btn guest-btn-primary"
              style={{ width: '100%', padding: '14px' }}
            >
              Enter Leader Dashboard
            </button>
          </div>
        </section>
      </GuestLayout>
    )
  }

  // Case 1: Scanning Invitation QR Code
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

  // Case 2: invitation decrypted, but not logged in via Google OAuth
  if (!sessionUser) {
    return (
      <GuestLayout>
        <section className="guest-section">
          <div className="guest-section-header">
            <span className="guest-section-tag">Invitation Verified</span>
            <h2 className="guest-section-title">Google Authentication</h2>
          </div>

          <div className="guest-glass-panel" style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '20px' }}>🔐</span>
            <h3 style={{ fontFamily: 'Syne, sans-serif', color: 'var(--g-secondary)', marginBottom: '10px' }}>
              {collegeName}
            </h3>
            <p className="muted" style={{ fontSize: '0.95rem', marginBottom: '30px' }}>
              Department of {leaderDept}
            </p>

            {error && (
              <div style={{ color: 'var(--g-accent)', fontSize: '0.95rem', margin: '15px 0', padding: '10px 15px', borderRadius: '8px', background: 'rgba(255,23,68,0.05)', border: '1px solid rgba(255,23,68,0.2)' }}>
                {error}
              </div>
            )}

            <p style={{ color: 'var(--g-text-muted)', fontSize: '0.95rem', marginBottom: '25px', lineHeight: '1.6' }}>
              To complete the college registration, please authenticate using a verified Google Account. This account will be assigned as the Student Leader for this event.
            </p>

            <button
              type="button"
              className="guest-btn guest-btn-primary"
              onClick={handleRegisterGoogleLogin}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #4285F4, #357AE8)',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 15px rgba(66,133,244,0.3)',
                border: 'none'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.47-.806 5.96-2.184l-2.908-2.258c-.806.54-1.837.86-3.052.86-2.35 0-4.337-1.587-5.048-3.719H.924v2.332C2.404 15.96 5.438 18 9 18z" fill="#34A853"/>
                <path d="M3.952 10.699c-.18-.54-.282-1.117-.282-1.699s.102-1.159.282-1.699V4.969H.924C.335 6.147 0 7.481 0 9s.335 2.853.924 4.031l3.028-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.32 0 2.5.454 3.436 1.348l2.578-2.578C13.468 1.096 11.43 0 9 0 5.438 0 2.404 2.04 10.924 4.969l3.028 2.332c.711-2.132 2.698-3.721 5.048-3.721z" fill="#EA4335"/>
              </svg>
              Sign in with Google to Continue
            </button>
          </div>
        </section>
      </GuestLayout>
    )
  }

  // Case 3: Invitation decrypted + Logged in. Step forms flow:
  const borderColors = ['#7c4dff', '#00e5ff', '#ff1744', '#ffeb3b', '#4caf50', '#ff9800']
  const activeEvent = events.find(e => e.id === activeEventId)

  return (
    <GuestLayout>

      {/* Rules & Regulations Modal */}
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
          </div>
          <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <button type="button" className="guest-btn guest-btn-secondary" onClick={() => setShowRulesModal(false)}>
              Close & Continue
            </button>
          </div>
        </div>
      </div>

      <section className="guest-section">
        <div className="guest-section-header">
          <span className="guest-section-tag">Step {step} of 3</span>
          <h2 className="guest-section-title">
            {step === 1 ? 'Configure Leader Profile' : step === 2 ? 'Register Event Participants' : 'Food counts & declaration'}
          </h2>
        </div>

        {error && (
          <div className="guest-glass-panel" style={{ background: 'rgba(255, 23, 68, 0.08)', border: '1px solid rgba(255, 23, 68, 0.3)', color: 'var(--g-accent)', padding: '15px 25px', borderRadius: '12px', marginBottom: '30px', fontSize: '0.95rem' }}>
            <strong>Error: </strong> {error}
          </div>
        )}

        {/* STEP 1: COMPLETE LEADER PROFILE */}
        {step === 1 && (
          <form onSubmit={handleProceedLeaderProfile}>
            <div className="guest-glass-panel" style={{ padding: '40px' }}>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.4rem', color: 'var(--g-secondary)', marginBottom: '25px', borderBottom: '1px solid var(--g-glass-border)', paddingBottom: '12px' }}>
                Student Leader Information
              </h3>
              <div className="guest-form-row">
                <label className="guest-field">
                  <span>Leader Full Name *</span>
                  <input 
                    type="text" 
                    required 
                    value={leaderName}
                    onChange={(e) => setLeaderName(e.target.value)}
                    placeholder="e.g. Alex Mercer" 
                  />
                </label>
                <label className="guest-field">
                  <span>Google Account Email *</span>
                  <input 
                    type="email" 
                    readOnly
                    style={{ backgroundColor: 'rgba(255,255,255,0.02)', cursor: 'not-allowed', opacity: 0.8 }}
                    value={sessionUser.email}
                  />
                </label>
              </div>

              <div className="guest-form-row">
                <label className="guest-field">
                  <span>Mobile Phone Number *</span>
                  <input 
                    type="text" 
                    required 
                    placeholder="10-digit mobile number" 
                    value={leaderPhone}
                    onChange={(e) => setLeaderPhone(e.target.value)}
                  />
                </label>
                <label className="guest-field">
                  <span>Department</span>
                  <input 
                    type="text" 
                    readOnly
                    style={{ backgroundColor: 'rgba(255,255,255,0.02)', cursor: 'not-allowed', opacity: 0.8 }}
                    value={leaderDept}
                  />
                </label>
              </div>

              <div className="guest-form-row" style={{ margin: 0 }}>
                <label className="guest-field" style={{ gridColumn: 'span 2' }}>
                  <span>College Name</span>
                  <input 
                    type="text" 
                    readOnly
                    style={{ backgroundColor: 'rgba(255,255,255,0.02)', cursor: 'not-allowed', opacity: 0.8 }}
                    value={collegeName}
                  />
                </label>
              </div>
            </div>

            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="guest-btn guest-btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save & Proceed to Participants'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: ADD PARTICIPANTS */}
        {step === 2 && (
          <div>
            <div className="guest-glass-panel" style={{ padding: '40px' }}>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.4rem', color: 'var(--g-secondary)', marginBottom: '25px', borderBottom: '1px solid var(--g-glass-border)', paddingBottom: '12px' }}>
                Contest Portals & Sub-teams Selection
              </h3>

              {events.length > 0 ? (
                <>
                  <div className="guest-events-accordion">
                    {events.map((event) => {
                      const isExpanded = activeEventId === event.id
                      const isFilled = isTabFilled(event.id)
                      const borderColors = ['#00e5ff', '#b388ff', '#f48fb1', '#ffb74d']
                      
                      return (
                        <div key={event.id} style={{ marginBottom: '15px', border: '1px solid var(--g-glass-border)', borderRadius: '12px', overflow: 'hidden' }}>
                          <button
                            type="button"
                            onClick={() => setActiveEventId(isExpanded ? '' : event.id)}
                            style={{
                              width: '100%',
                              padding: '16px 20px',
                              background: isFilled ? 'rgba(0, 229, 255, 0.05)' : 'rgba(255,255,255,0.03)',
                              border: 'none',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              color: 'var(--g-text)',
                              fontSize: '1.05rem',
                              fontWeight: '600'
                            }}
                          >
                            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', textAlign: 'left' }}>
                              <span>{event.event_name}</span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--g-text-muted)', fontWeight: 'normal', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '20px' }}>
                                Max {event.team_size} members
                              </span>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {isFilled && <span style={{ color: '#00e5ff', fontSize: '0.9rem' }}>✓ Registered</span>}
                              <span style={{ transition: 'transform 0.3s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="guest-event-expanded-content">
                              <div className="guest-sub-team-inputs-container">
                                {Array.from({ length: event.team_size || 1 }).map((_, idx) => {
                                  const pData = participants[event.id]?.[idx] || { studentName: '', rollNo: '' }
                                  const isRequired = isTabFilled(event.id)
                                  const leftColor = borderColors[idx % borderColors.length]
                                  
                                  return (
                                    <div 
                                      className="guest-participant-card-styled" 
                                      style={{ borderLeft: `3px solid ${leftColor}` }}
                                      key={idx}
                                    >
                                      <div className="guest-participant-card-title-styled">
                                        Participant #{idx + 1} {idx === 0 && (
                                          <span style={{ fontSize: '0.75rem', color: 'var(--g-text-muted)', fontWeight: 'normal', display: 'block', marginTop: '4px' }}>
                                            (Filling Participant 1 registers the team for this event)
                                          </span>
                                        )}
                                      </div>
                                      <div className="guest-form-row" style={{ margin: 0 }}>
                                        <label className="guest-field">
                                          <span>Full Name {isRequired && '*'}</span>
                                          <input 
                                            type="text" 
                                            placeholder="Enter full name" 
                                            value={pData.studentName}
                                            required={isRequired}
                                            onChange={(e) => updateParticipant(event.id, idx, 'studentName', e.target.value)}
                                          />
                                        </label>
                                        <label className="guest-field">
                                          <span>Roll Number {isRequired && '*'}</span>
                                          <input 
                                            type="text" 
                                            placeholder="Enter roll number" 
                                            value={pData.rollNo || ''}
                                            required={isRequired}
                                            onChange={(e) => updateParticipant(event.id, idx, 'rollNo', e.target.value)}
                                          />
                                        </label>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--g-text-muted)', padding: '30px' }}>
                  No active fests or events loaded.
                </div>
              )}
            </div>

            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" className="guest-btn guest-btn-secondary" onClick={() => setStep(1)}>
                Back to Profile
              </button>
              <button 
                type="button" 
                className="guest-btn guest-btn-primary" 
                onClick={() => setStep(3)}
              >
                Proceed to Food & Submit
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: FOOD COUNTS & DECLARATION */}
        {step === 3 && (
          <form onSubmit={handleSubmit}>
            <div className="guest-glass-panel" style={{ padding: '40px' }}>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.4rem', color: 'var(--g-secondary)', marginBottom: '25px', borderBottom: '1px solid var(--g-glass-border)', paddingBottom: '12px' }}>
                Final Verification & Food Counts
              </h3>
              <p style={{ color: 'var(--g-text-muted)', fontSize: '0.95rem', marginBottom: '25px', lineHeight: '1.5' }}>
                Verify your food choices. The sum of Veg and Non-Veg counts must equal exactly the total number of unique registered team members.
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
                  onChange={(e) => setAgreeRules(e.target.checked)}
                  required
                />
                <label htmlFor="agree_rules" style={{ color: 'var(--g-text-muted)', fontSize: '0.95rem', cursor: 'pointer' }}>
                  I agree to the <span style={{ color: 'var(--g-secondary)', textDecoration: 'underline', fontWeight: 600 }} onClick={(e) => { e.preventDefault(); setShowRulesModal(true) }}>STRATA Rules & Regulations</span>
                </label>
              </div>

              {warningText && (
                <div style={{ color: 'var(--g-accent)', fontSize: '0.95rem', marginTop: '20px', padding: '10px 15px', borderRadius: '8px', background: 'rgba(255,23,68,0.05)', border: '1px solid rgba(255,23,68,0.2)' }}>
                  {warningText}
                </div>
              )}
            </div>

            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" className="guest-btn guest-btn-secondary" onClick={() => setStep(2)}>
                Back to Participants
              </button>
              <button type="submit" className="guest-btn guest-btn-primary" disabled={submitDisabled || submitting}>
                {submitting ? 'Submitting...' : 'Submit Registration'}
              </button>
            </div>
          </form>
        )}
      </section>
    </GuestLayout>
  )
}
