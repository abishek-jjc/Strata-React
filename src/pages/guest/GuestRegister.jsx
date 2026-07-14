import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import GuestLayout from '../../components/layout/GuestLayout'
import { Html5Qrcode } from 'html5-qrcode'
import { decryptCollegePayload } from '../../utils/qrCrypto'

export default function GuestRegister() {
  const location = useLocation()
  const navigate = useNavigate()
  
  // App Config & Meta State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // QR Code decryption state
  const [isDecrypted, setIsDecrypted] = useState(false)
  const [scanError, setScanError] = useState('')
  const [collegeName, setCollegeName] = useState('')
  const [leaderDept, setLeaderDept] = useState('')

  // Google OAuth Session State
  const [sessionUser, setSessionUser] = useState(null)
  const [alreadyRegisteredLeader, setAlreadyRegisteredLeader] = useState('')

  // Leader Profile Inputs
  const [leaderName, setLeaderName] = useState('')
  const [leaderPhone, setLeaderPhone] = useState('')
  const [leaderEmail, setLeaderEmail] = useState('')

  // Rules popup state
  const [rules, setRules] = useState([])
  const [agreeRules, setAgreeRules] = useState(false)
  const [showRulesModal, setShowRulesModal] = useState(false)

  // Fetch rules list for rules modal popup
  useEffect(() => {
    async function loadRules() {
      try {
        const { data } = await supabase
          .from(TABLES.RULES)
          .select('*')
          .order('created_at', { ascending: true })
        if (data) setRules(data)
      } catch (err) {
        console.error('Error fetching rules:', err)
      }
    }
    loadRules()
  }, [])

  // Helper to query if a college has already registered a student leader
  async function checkCollegeRegistration(name, department) {
    if (!name || !department) return false
    try {
      const { data: collegeRow } = await supabase
        .from(TABLES.COLLEGES)
        .select('id')
        .eq('college', name.trim())
        .eq('department', department.trim())
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

  // Common function to initiate pre-registration login redirect
  async function handlePreAuthRedirect(college, department) {
    if (sessionUser) {
      setCollegeName(college)
      setLeaderDept(department)
      setIsDecrypted(true)
    } else {
      sessionStorage.setItem('pending_college_name', college)
      sessionStorage.setItem('pending_leader_dept', department)
      
      const { error: oAuthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/register'
        }
      })
      if (oAuthError) {
        setScanError(oAuthError.message || 'Failed to initialize Google login.')
      }
    }
  }

  // 1. Google OAuth Session Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionUser(data.session?.user || null)
      if (!data.session?.user) {
        setLoading(false)
      }
    })
    
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user || null)
      if (!session?.user) {
        setLoading(false)
      }
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
          } else {
            // Pre-fill email if they are already logged in but not registered
            setLeaderEmail(sessionUser.email)
            // Pre-fill name if available
            setLeaderName(sessionUser.user_metadata?.full_name || '')
            
            // Check if there is a pending college registration stored in sessionStorage
            const savedCol = sessionStorage.getItem('pending_college_name')
            const savedDept = sessionStorage.getItem('pending_leader_dept')
            if (savedCol && savedDept) {
              const isReg = await checkCollegeRegistration(savedCol, savedDept)
              if (!isReg) {
                setCollegeName(savedCol)
                setLeaderDept(savedDept)
                setIsDecrypted(true)
              }
            }
          }
        } catch (err) {
          console.error(err)
        } finally {
          setLoading(false)
        }
      }
      checkExistingLeader()
    }
  }, [sessionUser])

  // 3. QR Camera Scanner Initialization
  useEffect(() => {
    if (loading || isDecrypted || successMessage || alreadyRegisteredLeader) return

    // Safely check that the reader element is present in the DOM
    const targetElement = document.getElementById("reader")
    if (!targetElement) return

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
  }, [loading, isDecrypted, alreadyRegisteredLeader, successMessage])

  // 4. Handle initial router state redirects from Home
  useEffect(() => {
    if (loading) return
    if (location.state?.autoDecryptedCollege && location.state?.autoDecryptedDept) {
      checkCollegeRegistration(location.state.autoDecryptedCollege, location.state.autoDecryptedDept).then((isReg) => {
        if (!isReg) {
          setCollegeName(location.state.autoDecryptedCollege)
          setLeaderDept(location.state.autoDecryptedDept)
          setIsDecrypted(true)
        }
      })
    }
  }, [location.state, loading])

  // Submit Leader Registration Form
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!leaderPhone || leaderPhone.trim().length < 10) {
      return setError('Please enter a valid 10-digit mobile number.')
    }
    if (!agreeRules) {
      return setError('You must agree to the Rules & Regulations to proceed.')
    }

    setSubmitting(true)
    try {
      // 1. Call database RPC function to pre-register the leader and check constraints
      const { data: rpcResult, error: configureError } = await supabase.rpc('pre_register_leader', {
        p_leader_name: leaderName.trim(),
        p_phone: leaderPhone.trim(),
        p_email: leaderEmail.trim().toLowerCase(),
        p_department: leaderDept.trim(),
        p_college_name: collegeName.trim()
      })
      if (configureError) throw configureError

      // Cleanup pending session storage
      sessionStorage.removeItem('pending_college_name')
      sessionStorage.removeItem('pending_leader_dept')

      setSuccessMessage('Leader profile successfully registered!')

      // 2. Auth handling - Registration complete, redirect to login page
      navigate('/login')
    } catch (err) {
      setError(err.message || 'Failed to configure leader profile.')
      setSubmitting(false)
    }
  }

  async function handleLogout() {
    setError('')
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setSessionUser(null)
      setAlreadyRegisteredLeader('')
      setIsDecrypted(false)
      sessionStorage.removeItem('pending_college_name')
      sessionStorage.removeItem('pending_leader_dept')
      window.location.reload()
    } catch (err) {
      alert('Sign out failed: ' + err.message)
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

  // Already registered view (Login landing screen showing registered google id)
  if (alreadyRegisteredLeader && sessionUser) {
    return (
      <GuestLayout>
        <section className="guest-section" style={{ padding: '40px 20px' }}>
          <div className="guest-section-header">
            <span className="guest-section-tag">Portal Access</span>
            <h2 className="guest-section-title">Login Status</h2>
          </div>

          <div className="guest-glass-panel" style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '20px' }}>🔐</span>
            <h3 style={{ fontFamily: 'Syne, sans-serif', color: '#00e5ff', marginBottom: '15px' }}>
              Logged In Successfully
            </h3>
            
            <p style={{ color: 'var(--g-text-secondary)', fontSize: '0.95rem', marginBottom: '8px' }}>
              Authenticated Google Account:
            </p>
            <div style={{
              background: 'rgba(0, 229, 255, 0.05)',
              border: '1px solid rgba(0, 229, 255, 0.2)',
              borderRadius: '12px',
              padding: '12px 20px',
              fontWeight: 'bold',
              color: '#00e5ff',
              marginBottom: '20px',
              display: 'inline-block',
              fontSize: '1.1rem'
            }}>
              {sessionUser.email}
            </div>

            <p style={{ color: 'var(--g-text-muted)', fontSize: '0.95rem', marginBottom: '25px', lineHeight: '1.6' }}>
              Welcome back, <strong>{alreadyRegisteredLeader}</strong>!<br />
              Your leader profile has already been verified. Click below to manage participants and team registrations.
            </p>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', maxWidth: '400px', margin: '0 auto' }}>
              <button 
                type="button" 
                onClick={() => navigate('/leader/register')} 
                className="guest-btn guest-btn-primary" 
                style={{ flex: 1 }}
              >
                Go to Team Registration
              </button>
              <button 
                type="button" 
                onClick={handleLogout} 
                className="guest-btn guest-btn-secondary" 
                style={{ flex: 1 }}
              >
                Change Account
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
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '2.2rem', marginBottom: '15px', color: '#fff' }}>Pre-Registered!</h2>
            <p style={{ color: 'var(--g-text-muted)', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '25px' }}>{successMessage}</p>

            <button 
              type="button" 
              onClick={() => navigate('/leader/register')} 
              className="guest-btn guest-btn-primary"
              style={{ width: '100%', padding: '14px' }}
            >
              Enter Team Registration
            </button>
          </div>
        </section>
      </GuestLayout>
    )
  }

  // Step 1: Scanning Invitation QR Code
  if (!isDecrypted) {
    return (
      <GuestLayout>
        <section className="guest-section" style={{ padding: '40px 20px' }}>
          <div className="guest-section-header">
            <span className="guest-section-tag">Verify Invitation</span>
            <h2 className="guest-section-title">Invitation Scanner</h2>
          </div>

          <div className="guest-glass-panel" style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <h3 style={{ fontFamily: 'Syne, sans-serif', color: 'var(--g-secondary)', marginBottom: '15px' }}>
              Scan QR Code to Register
            </h3>
            <p style={{ color: 'var(--g-text-muted)', fontSize: '0.95rem', marginBottom: '25px', lineHeight: '1.6' }}>
              Please scan the QR code printed on your official STRATA invitation letter using your device camera to unlock the leader registration form.
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

  // Step 2: Sign in with Google (button page)
  if (isDecrypted && !sessionUser) {
    return (
      <GuestLayout>
        <section className="guest-section" style={{ padding: '40px 20px' }}>
          <div className="guest-section-header">
            <span className="guest-section-tag">Step 2: Authentication</span>
            <h2 className="guest-section-title">Sign In with Google</h2>
          </div>

          <div className="guest-glass-panel" style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '20px' }}>🔑</span>
            <h3 style={{ fontFamily: 'Syne, sans-serif', color: 'var(--g-secondary)', marginBottom: '15px' }}>
              Verify Institution Invitation
            </h3>
            
            <p style={{ color: 'var(--g-text-secondary)', fontSize: '0.95rem', marginBottom: '8px' }}>
              QR code verified for:
            </p>
            <div style={{
              background: 'rgba(0, 229, 255, 0.05)',
              border: '1px solid rgba(0, 229, 255, 0.2)',
              borderRadius: '12px',
              padding: '12px 20px',
              fontWeight: 'bold',
              color: '#00e5ff',
              marginBottom: '20px',
              display: 'inline-block'
            }}>
              {collegeName} <br />
              <span style={{ fontSize: '0.85rem', color: 'var(--g-text-muted)', fontWeight: 'normal' }}>({leaderDept} Department)</span>
            </div>

            <p style={{ color: 'var(--g-text-muted)', fontSize: '0.9rem', marginBottom: '30px', lineHeight: '1.6' }}>
              Sign in with your Google account to automatically pre-fill your name and email. We will map this Google ID to your leadership role.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '320px', margin: '0 auto' }}>
              <button 
                type="button" 
                onClick={() => handlePreAuthRedirect(collegeName, leaderDept)} 
                className="guest-btn guest-btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  background: 'linear-gradient(135deg, #4285F4, #357AE8)',
                  border: 'none',
                  boxShadow: '0 4px 15px rgba(66,133,244,0.3)',
                  padding: '14px',
                  fontWeight: 'bold',
                  width: '100%'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.47-.806 5.96-2.184l-2.908-2.258c-.806.54-1.837.86-3.052.86-2.35 0-4.337-1.587-5.048-3.719H.924v2.332C2.404 15.96 5.438 18 9 18z" fill="#34A853"/>
                  <path d="M3.952 10.699c-.18-.54-.282-1.117-.282-1.699s.102-1.159.282-1.699V4.969H.924C.335 6.147 0 7.481 0 9s.335 2.853.924 4.031l3.028-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.32 0 2.5.454 3.436 1.348l2.578-2.578C13.468 1.096 11.43 0 9 0 5.438 0 2.404 2.04 10.924 4.969l3.028 2.332c.711-2.132 2.698-3.721 5.048-3.721z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </button>
            </div>
          </div>
        </section>
      </GuestLayout>
    )
  }

  // Step 3: QR Decrypted, Session user active, not yet registered - show leader profile creation form
  return (
    <GuestLayout>
      <section className="guest-section" style={{ padding: '40px 20px' }}>
        <div className="guest-section-header">
          <span className="guest-section-tag">Pre-registration</span>
          <h2 className="guest-section-title">Configure Leader Profile</h2>
        </div>

        {error && (
          <div className="guest-glass-panel" style={{ background: 'rgba(255, 23, 68, 0.08)', border: '1px solid rgba(255, 23, 68, 0.3)', color: 'var(--g-accent)', padding: '15px 25px', borderRadius: '12px', marginBottom: '30px', fontSize: '0.95rem', maxWidth: '800px', margin: '0 auto 30px auto' }}>
            <strong>Error: </strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ maxWidth: '800px', margin: '0 auto' }}>
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
                  readOnly
                  style={{ backgroundColor: 'rgba(255,255,255,0.02)', cursor: 'not-allowed', opacity: 0.8 }}
                  placeholder="Pre-filled from Google login" 
                />
              </label>
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
            </div>

            <div className="guest-form-row">
              <label className="guest-field">
                <span>Google Account Email (Auth Mail ID) *</span>
                <input 
                  type="email" 
                  required
                  placeholder="Pre-filled from Google login"
                  readOnly
                  style={{ backgroundColor: 'rgba(255,255,255,0.02)', cursor: 'not-allowed', opacity: 0.8 }}
                  value={leaderEmail}
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

            <div className="guest-form-row" style={{ marginBottom: '20px' }}>
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

            {/* Rules Checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '24px', borderTop: '1px solid var(--g-glass-border)', paddingTop: '20px' }}>
              <input 
                type="checkbox" 
                id="agree-rules" 
                checked={agreeRules} 
                onChange={(e) => setAgreeRules(e.target.checked)}
                required
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--g-secondary)' }}
              />
              <label htmlFor="agree-rules" style={{ color: 'var(--g-text-secondary)', fontSize: '0.92rem', cursor: 'pointer', userSelect: 'none' }}>
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => setShowRulesModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: 'var(--g-secondary)',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.92rem',
                    fontFamily: 'inherit'
                  }}
                >
                  Rules & Regulations
                </button>{' '}
                of STRATA 2K26
              </label>
            </div>
          </div>

          <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', gap: '15px' }}>
            <button type="button" className="guest-btn guest-btn-secondary" onClick={() => setIsDecrypted(false)}>
              Back to Scanner
            </button>
            <button type="submit" className="guest-btn guest-btn-primary" disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Leader & Go To Team Portal →'}
            </button>
          </div>
        </form>
      </section>

      {/* Rules Modal Popup */}
      {showRulesModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(5, 7, 10, 0.9)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div className="guest-glass-panel" style={{
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            position: 'relative',
            padding: '30px',
            borderRadius: '16px',
            border: '1px solid var(--g-glass-border)'
          }}>
            <button 
              onClick={() => setShowRulesModal(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: '1.5rem',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
            
            <h3 style={{ fontFamily: 'Syne, sans-serif', color: 'var(--g-secondary)', margin: 0, borderBottom: '1px solid var(--g-glass-border)', paddingBottom: '12px' }}>
              STRATA 2K26 Rules & Regulations
            </h3>
            
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px', paddingRight: '8px' }}>
              {rules.length > 0 ? (
                rules.map((rule) => (
                  <div key={rule.id}>
                    <h4 style={{ color: '#fff', margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700 }}>{rule.title}</h4>
                    <ul style={{ color: 'var(--g-text-muted)', fontSize: '0.9rem', margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                      {rule.points.split('\n').map((pt, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--g-text-muted)', textAlign: 'center' }}>No general rules published yet.</p>
              )}
            </div>

            <button 
              onClick={() => setShowRulesModal(false)}
              className="guest-btn guest-btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: '10px' }}
            >
              I Understand & Accept
            </button>
          </div>
        </div>
      )}
    </GuestLayout>
  )
}
