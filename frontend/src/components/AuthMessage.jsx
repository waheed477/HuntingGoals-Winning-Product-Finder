import { FiAlertCircle, FiCheckCircle } from 'react-icons/fi'

/**
 * AuthMessage — inline form banner for auth pages (login / signup / verify).
 * Sits directly above the email field; slides down gently; no manual close —
 * it simply updates/clears on the next action.
 *   type: 'error' → soft red tint + exclamation    (no harsh cross-sign)
 *   type: 'success' → soft acid tint + check
 */
const STYLES = {
  error: {
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderColor:     'rgba(248,113,113,0.28)',
    color:           '#fca5a5',
  },
  success: {
    backgroundColor: 'rgba(200,245,66,0.08)',
    borderColor:     'rgba(200,245,66,0.28)',
    color:           'var(--color-acid)',
  },
}

export default function AuthMessage({ notice }) {
  if (!notice?.msg) return null
  const isErr = notice.type === 'error'
  const Icon  = isErr ? FiAlertCircle : FiCheckCircle
  const s     = STYLES[isErr ? 'error' : 'success']

  return (
    <>
      <style>{`@keyframes authMsgIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <div
        key={notice.msg}
        role={isErr ? 'alert' : 'status'}
        className="flex items-start gap-2 rounded-xl border px-3 py-2.5"
        style={{ ...s, animation: 'authMsgIn .3s cubic-bezier(.22,1,.36,1) both' }}
      >
        <Icon size={14} className="flex-shrink-0 mt-[1px]" />
        <p className="font-body text-xs leading-snug">{notice.msg}</p>
      </div>
    </>
  )
}
