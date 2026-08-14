import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiUser, FiShield } from 'react-icons/fi'
import AuthMessage from '../components/AuthMessage.jsx'
import useStore from '../store/useStore.js'

const GOOGLE_ERROR_MESSAGES = {
  google_cancelled: 'Google sign-in was cancelled.',
  google_token:     'Failed to complete Google sign-in. Please try again.',
  google_no_email:  'Google did not share an email address.',
  google_server:    'A server error occurred during Google sign-in.',
  magic_invalid:    'That sign-in link is invalid or was already used — request a fresh one.',
  magic_expired:    'That sign-in link expired — request a fresh one.',
  magic_server:     'A server error occurred while verifying your link. Please try again.',
}

export default function Login() {
  const [name, setName]                   = useState('')
  const [email, setEmail]                 = useState('')
  const [password, setPassword]           = useState('')
  const [showPassword, setShowPassword]   = useState(false)
  const [isLoading, setIsLoading]         = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [isSignup, setIsSignup]           = useState(false)
  const [notice, setNotice]               = useState(null) // {type:'error'|'success', msg} — inline banner above the fields
  const setUser   = useStore((s) => s.setUser)
  const navigate  = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const googleStatus = searchParams.get('google')
    const magicStatus  = searchParams.get('magic')
    const token        = searchParams.get('token')
    const name         = searchParams.get('name')
    const error        = searchParams.get('error')

    if (error) { setNotice({ type: 'error', msg: GOOGLE_ERROR_MESSAGES[error] || 'Sign-in failed.' }); return }

    if ((googleStatus === 'success' || magicStatus === 'success') && token) {
      const displayName = decodeURIComponent(name || '')
      setGoogleLoading(true)
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then(async (data) => {
          if (data.success) {
            setUser({ ...data.data.user, token })
            // Route fresh accounts to onboarding, returning users straight in
            try {
              const s = await fetch('/api/user/onboarding/status', { headers: { Authorization: `Bearer ${token}` } })
              const sj = await s.json()
              navigate(sj.data?.needsOnboarding ? '/onboarding' : '/dashboard')
            } catch { navigate('/dashboard') }
          } else {
            setNotice({ type: 'error', msg: 'Session error. Please try again.' })
          }
        })
        .catch(() => setNotice({ type: 'error', msg: 'Connection error after sign-in.' }))
        .finally(() => setGoogleLoading(false))
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setNotice(null)
    if (!email || !password) { setNotice({ type: 'error', msg: 'Please fill in all fields' }); return }
    if (isSignup && !name.trim()) { setNotice({ type: 'error', msg: 'Name is required' }); return }

    setIsLoading(true)
    try {
      const endpoint = isSignup ? '/api/auth/register' : '/api/auth/login'
      const body     = isSignup ? { name: name.trim(), email, password } : { email, password }

      const res  = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!data.success) { setNotice({ type: 'error', msg: data.error || 'Authentication failed' }); setIsLoading(false); return }

      if (data.requiresVerification) {
        navigate(`/verify-email?email=${encodeURIComponent(data.email)}`)
        return
      }

      const { user, token } = data.data
      setUser({ ...user, token })
      setNotice({ type: 'success', msg: `Welcome${isSignup ? '' : ' back'}, ${user.name || user.email.split('@')[0]}!` })

      if (isSignup) {
        // Arm the one-shot welcome tour (consumed by WelcomeTour on mount)
        try { localStorage.setItem('hg_tour_pending', '1') } catch { /* ignore */ }
        navigate('/onboarding')
      } else {
        try {
          const statusRes  = await fetch('/api/user/onboarding/status', {
            headers: { Authorization: `Bearer ${token}` },
          })
          const statusData = await statusRes.json()
          navigate(statusData.data?.needsOnboarding ? '/onboarding' : '/dashboard')
        } catch {
          navigate('/dashboard')
        }
      }
    } catch (err) {
      setNotice({ type: 'error', msg: 'Connection error. Is the backend running?' })
      if (import.meta.env.DEV) console.error('[Login]', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Magic Link — passwordless sign-in via email (Brevo-backed on the server).
  // (Google OAuth button removed; backend routes stay available for later.)
  const [magicLoading, setMagicLoading] = useState(false)
  const handleMagicLink = async () => {
    setNotice(null)
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNotice({ type: 'error', msg: 'Type your email in the field below first, then tap "Sign in with Magic Link".' })
      return
    }
    setMagicLoading(true)
    try {
      const res  = await fetch('/api/auth/magic-link', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.success) {
        setNotice({ type: 'success', msg: `Magic link sent to ${email} — open your inbox and tap it (valid 15 min). One tap signs you in.` })
      } else {
        setNotice({ type: 'error', msg: data.error || 'Could not send the link — please try again.' })
      }
    } catch {
      setNotice({ type: 'error', msg: 'Connection error. Please try again.' })
    } finally {
      setMagicLoading(false)
    }
  }

  /* Input field style */
  const inputClass = `
    w-full font-body text-sm rounded-xl pl-10 pr-4 py-3 outline-none transition-all duration-200
    bg-[var(--color-ink-3)] border text-[var(--color-bone)] placeholder:text-[var(--color-moss)]
    border-[var(--color-ink-4)] focus:border-[var(--color-acid)] focus:ring-1 focus:ring-[var(--color-acid-3)]
  `

  if (googleLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-ink)] flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: 'var(--color-ink-4)', borderTopColor: 'var(--color-acid)' }}
          />
          <p className="font-mono-label text-[10px] text-[var(--color-moss)] uppercase tracking-[0.2em]">
            Signing you in with Google…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-ink)] gridlines-dark flex items-center justify-center p-4">
      {/* Background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(200,245,66,0.04) 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6 group">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{ backgroundColor: 'var(--color-acid)' }}
            >
              <span className="font-display font-bold text-sm text-[var(--color-ink)]">HG</span>
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-[var(--color-bone)]">
              Hunting<span className="text-[var(--color-acid)]"> Goals</span>
            </span>
          </Link>
          <h1 className="font-display font-bold text-2xl text-[var(--color-bone)] tracking-tight mb-1">
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="font-body text-sm text-[var(--color-moss)]">
            {isSignup ? 'Start hunting winning products today' : "Pakistan's #1 product hunting tool"}
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 border"
          style={{ backgroundColor: 'var(--color-ink-2)', borderColor: 'var(--color-ink-4)' }}
        >
          {/* Magic Link Sign-In (replaces Google — one tap from your inbox) */}
          <button
            onClick={handleMagicLink}
            disabled={magicLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border text-sm font-body font-medium transition-all duration-200 mb-5 disabled:opacity-60"
            style={{
              backgroundColor: 'var(--color-ink-3)',
              borderColor: 'var(--color-ink-4)',
              color: 'var(--color-bone)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-smoke)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-ink-4)' }}
          >
            {magicLoading ? (
              <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-moss)', borderTopColor: 'var(--color-acid)' }} />
            ) : (
              <FiMail size={18} style={{ color: 'var(--color-acid)' }} />
            )}
            {magicLoading ? 'Sending your link…' : 'Sign in with Magic Link'}
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-ink-4)' }} />
            <span className="font-mono-label text-[10px] text-[var(--color-moss)] uppercase tracking-[0.15em]">
              or email
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-ink-4)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Inline auth message — directly above the fields */}
            <AuthMessage notice={notice} />

            {isSignup && (
              <div>
                <label className="block font-mono-label text-[10px] text-[var(--color-smoke)] uppercase tracking-[0.2em] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <FiUser size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-moss)]" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-mono-label text-[10px] text-[var(--color-smoke)] uppercase tracking-[0.2em] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <FiMail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-moss)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-mono-label text-[10px] text-[var(--color-smoke)] uppercase tracking-[0.2em]">
                  Password
                </label>
                {!isSignup && (
                  <Link
                    to="/forgot-password"
                    className="text-xs font-body text-[var(--color-moss)] hover:text-[var(--color-acid)] transition-colors"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <FiLock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-moss)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-moss)] hover:text-[var(--color-smoke)] transition-colors"
                >
                  {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
              {isSignup && (
                <p className="text-xs text-[var(--color-moss)] font-body mt-1">Minimum 6 characters</p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-shine w-full py-3 font-display font-bold text-sm rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(200,245,66,0.25)]"
              style={{ backgroundColor: 'var(--color-acid)', color: 'var(--color-ink)' }}
            >
              {isLoading ? (
                <span
                  className="w-4 h-4 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'rgba(15,17,10,0.3)', borderTopColor: 'var(--color-ink)' }}
                />
              ) : (
                <>
                  {isSignup ? 'Create Account' : 'Sign In'}
                  <FiArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Toggle */}
          <div
            className="mt-5 pt-5 border-t text-center"
            style={{ borderColor: 'var(--color-ink-4)' }}
          >
            <button
              onClick={() => { setIsSignup(!isSignup); setName('') }}
              className="text-sm font-body text-[var(--color-moss)] hover:text-[var(--color-bone)] transition-colors"
            >
              {isSignup ? (
                <>Already have an account? <span className="text-[var(--color-acid)] font-medium">Sign in</span></>
              ) : (
                <>Don't have an account? <span className="text-[var(--color-acid)] font-medium">Sign up free</span></>
              )}
            </button>
          </div>
        </div>

        {/* Security note */}
        <p className="text-center font-mono-label text-[10px] text-[var(--color-moss)] uppercase tracking-[0.15em] mt-4 flex items-center justify-center gap-1.5">
          <FiShield size={11} />
          Your data is encrypted and never shared
        </p>
      </div>
    </div>
  )
}
