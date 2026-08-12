/**
 * Central toast helper — the single place for user-facing notifications.
 *
 * Wraps react-hot-toast so every popup across the app:
 *   1. Uses the app's existing dark-glass styling (same palette as the UI).
 *   2. Never shows raw technical error text to users — network failures,
 *      rate limits, session expiry and server faults are translated into
 *      clear, polite messages. Already-friendly server messages
 *      (e.g. "Invalid email or password") pass through untouched.
 *
 * Usage is a drop-in replacement:
 *   import toast from '../lib/toast.js'
 *   toast.success('Saved successfully')
 *   toast.error(err.message)
 */
import baseToast from 'react-hot-toast'

const SUCCESS_STYLE = {
  background:   '#0f2e1a',
  color:        '#fff',
  border:       '1px solid rgba(34,197,94,0.3)',
  borderRadius: '12px',
  fontSize:     '14px',
}

const ERROR_STYLE = {
  background:   '#1e1e3f',
  color:        '#fff',
  border:       '1px solid rgba(244,63,94,0.35)',
  borderRadius: '12px',
  fontSize:     '14px',
}

// Well-known server messages → polished user-facing copy (checked first)
const SERVER_MESSAGE_MAP = [
  [/invalid credentials/i,               'Incorrect email or password — please try again.'],
  [/account with this email already exists/i, 'This email is already registered — try signing in instead.'],
  [/^login failed$/i,                    'Could not sign you in — please try again.'],
  [/^registration failed$/i,             'Could not create your account — please try again.'],
  [/otp.*(invalid|expired)|invalid.*otp/i, 'That code is invalid or has expired — request a new one.'],
  [/please verify your email/i,          'Please verify your email first — we sent you a code.'],
]

// Technical patterns → user-friendly messages (checked in order)
const TECHNICAL_PATTERNS = [
  {
    re:  /failed to fetch|networkerror|network request failed|load failed|err_network/i,
    msg: 'Connection issue — please check your internet and try again.',
  },
  {
    re:  /econnrefused|etimedout|timeout|502|503|504|bad gateway|service unavailable/i,
    msg: 'Server is temporarily unreachable — please try again in a moment.',
  },
  {
    re:  /401|unauthorized|invalid token|jwt expired|token.*expired/i,
    msg: 'Your session has expired — please log in again.',
  },
  {
    re:  /429|too many requests|rate.?limit/i,
    msg: 'Too many attempts — please wait a few minutes and try again.',
  },
  {
    re:  /mongodb_uri|mongoose|topology|cast to objectid|e11000/i,
    msg: 'Service temporarily unavailable — please try again shortly.',
  },
]

const GENERIC_ERROR = 'Something went wrong — please try again.'
const MAX_HUMAN_MESSAGE_LENGTH = 120

/**
 * Convert raw/technical error text into a polite, user-readable message.
 * Friendly messages (a full sentence without technical keywords) pass through.
 */
export function friendlyError(input) {
  const raw = (typeof input === 'string' ? input : input?.message) || ''
  const message = raw.trim()

  if (!message) return GENERIC_ERROR

  for (const [re, msg] of SERVER_MESSAGE_MAP) {
    if (re.test(message)) return msg
  }
  for (const { re, msg } of TECHNICAL_PATTERNS) {
    if (re.test(message)) return msg
  }
  // Stack-trace-like or overly long text is never user-friendly
  if (message.length > MAX_HUMAN_MESSAGE_LENGTH || /\n|at\s+\w+\s+\(/m.test(message)) {
    return GENERIC_ERROR
  }
  return message
}

// Callable base (info/announcement toasts keep their own inline styles)
function toast(message, options = {}) {
  return baseToast(message, options)
}

toast.success = function (message, options = {}) {
  return baseToast.success(message, { duration: 4000, style: { ...SUCCESS_STYLE }, ...options })
}

toast.error = function (message, options = {}) {
  return baseToast.error(friendlyError(message), { duration: 4500, style: { ...ERROR_STYLE }, ...options })
}

toast.loading = function (message, options = {}) {
  return baseToast.loading(message, options)
}

toast.dismiss = function (id) {
  return baseToast.dismiss(id)
}

toast.promise = function (promise, messages, options = {}) {
  return baseToast.promise(promise, messages, options)
}

export default toast
