import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { FiMail, FiArrowRight, FiRefreshCw } from 'react-icons/fi'
import toast from 'react-hot-toast'
import useStore from '../store/useStore.js'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''
  const navigate = useNavigate()
  const setUser = useStore((s) => s.setUser)

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resendDisabled, setResendDisabled] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const inputRefs = useRef([])

  useEffect(() => {
    if (!email) navigate('/login', { replace: true })
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const next = [...otp]
    next[index] = value.slice(-1)
    setOtp(next)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = [...otp]
    pasted.split('').forEach((ch, i) => { next[i] = ch })
    setOtp(next)
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length !== 6) { toast.error('Please enter the 6-digit code'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code }),
      })
      const data = await res.json()
      if (data.success) {
        const { user, token } = data.data
        setUser({ ...user, token })
        toast.success('Email verified! Welcome to Hunting Goals.')
        navigate('/onboarding', { replace: true })
      } else {
        toast.error(data.error || 'Verification failed')
        setOtp(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch {
      toast.error('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResendDisabled(true)
    setCountdown(60)
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('New code sent to your email')
        setOtp(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      } else {
        toast.error(data.error || 'Failed to resend code')
        setResendDisabled(false)
        setCountdown(0)
      }
    } catch {
      toast.error('Connection error')
      setResendDisabled(false)
      setCountdown(0)
    }
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">TS</span>
            </div>
            <span className="font-bold text-white text-2xl tracking-tight">
              Trend<span className="gradient-text">Spy</span>
            </span>
          </Link>
        </div>

        <div className="glass-card p-8 rounded-2xl">
          <div className="text-center mb-7">
            <div className="w-14 h-14 bg-primary-600/20 border border-primary-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FiMail size={24} className="text-primary-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Verify your email</h1>
            <p className="text-sm text-gray-400">
              We sent a 6-digit code to<br />
              <span className="text-white font-medium">{email}</span>
            </p>
          </div>

          <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-14 text-center text-2xl font-bold bg-white/5 border-2 border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors"
              />
            ))}
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || otp.join('').length !== 6}
            className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Verify & Continue <FiArrowRight size={15} /></>
            )}
          </button>

          <div className="mt-5 text-center">
            <button
              onClick={handleResend}
              disabled={resendDisabled}
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-40"
            >
              <FiRefreshCw size={13} className={resendDisabled ? 'animate-spin' : ''} />
              {resendDisabled ? `Resend code in ${countdown}s` : 'Resend code'}
            </button>
          </div>

          <div className="mt-4 text-center">
            <Link to="/login" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              Back to login
            </Link>
          </div>
        </div>

        <p className="text-xs text-center text-gray-600 mt-4">
          Check your spam folder if you don't see it within a minute.
        </p>
      </div>
    </div>
  )
}
