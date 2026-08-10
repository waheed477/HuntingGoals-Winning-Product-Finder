import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiUser, FiAlertCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'
import useStore from '../store/useStore.js'

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  )
}

const GOOGLE_ERROR_MESSAGES = {
  google_cancelled: 'Google sign-in was cancelled.',
  google_token:     'Failed to complete Google sign-in. Please try again.',
  google_no_email:  'Google did not share an email address.',
  google_server:    'A server error occurred during Google sign-in.',
}

export default function Login() {
  const [name, setName]                 = useState('')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading]       = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [isSignup, setIsSignup]         = useState(false)
  const setUser  = useStore((s) => s.setUser)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Handle Google OAuth redirect back
  useEffect(() => {
    const googleStatus = searchParams.get('google')
    const token        = searchParams.get('token')
    const name         = searchParams.get('name')
    const error        = searchParams.get('error')

    if (error) {
      toast.error(GOOGLE_ERROR_MESSAGES[error] || 'Google sign-in failed.')
      return
    }

    if (googleStatus === 'success' && token) {
      const displayName = decodeURIComponent(name || '')
      setGoogleLoading(true)
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setUser({ ...data.data.user, token })
            toast.success(`Welcome${displayName ? `, ${displayName}` : ''}!`)
            navigate('/dashboard')
          } else {
            toast.error('Session error. Please try again.')
          }
        })
        .catch(() => toast.error('Connection error after Google sign-in.'))
        .finally(() => setGoogleLoading(false))
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Please fill in all fields'); return }
    if (isSignup && !name.trim()) { toast.error('Name is required'); return }

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

      if (!data.success) { toast.error(data.error || 'Authentication failed'); return }

      if (data.requiresVerification) {
        navigate(`/verify-email?email=${encodeURIComponent(data.email)}`)
        return
      }

      const { user, token } = data.data
      setUser({ ...user, token })
      toast.success(`Welcome${isSignup ? '' : ' back'}, ${user.name || user.email.split('@')[0]}!`)

      if (isSignup) {
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
      toast.error('Connection error. Is the backend running?')
      console.error('[Login]', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    window.location.href = '/api/auth/google/start'
  }

  if (googleLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Signing you in with Google…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">HG</span>
            </div>
            <span className="font-bold text-white text-2xl tracking-tight">
              Hunting<span className="gradient-text"> Goals</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-gray-400 text-sm">
            {isSignup ? 'Start hunting winning products today' : "Pakistan's #1 product hunting tool"}
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          {/* Google Sign-In */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-white transition-all duration-200 mb-5 text-sm font-medium"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500">or continue with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Full Name</label>
                <div className="relative">
                  <FiUser size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/50 text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Email Address</label>
              <div className="relative">
                <FiMail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/50 text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs text-gray-400">Password</label>
                {!isSignup && (
                  <Link to="/forgot-password" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <FiLock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/50 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
              {isSignup && (
                <p className="text-xs text-gray-600 mt-1">Minimum 6 characters</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isSignup ? 'Create Account' : 'Sign In'}
                  <FiArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-white/5 text-center">
            <button
              onClick={() => { setIsSignup(!isSignup); setName('') }}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              {isSignup ? (
                <>Already have an account? <span className="text-primary-400">Sign in</span></>
              ) : (
                <>Don't have an account? <span className="text-primary-400">Sign up free</span></>
              )}
            </button>
          </div>
        </div>

        {/* Security note */}
        <p className="text-center text-xs text-gray-600 mt-4 flex items-center justify-center gap-1.5">
          <FiAlertCircle size={11} />
          Your data is encrypted and never shared
        </p>
      </div>
    </div>
  )
}
