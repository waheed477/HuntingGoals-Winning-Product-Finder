import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi'
import { api } from '../lib/api.js'

export default function BillingSuccess() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [state, setState] = useState({ status: 'loading', plan: null, error: null })

  useEffect(() => {
    if (!sessionId) {
      setState({ status: 'error', plan: null, error: 'Missing payment session id.' })
      return
    }
    let cancelled = false
    api.get(`/billing/confirm?session_id=${encodeURIComponent(sessionId)}`)
      .then((res) => {
        if (!cancelled) setState({ status: 'success', plan: res.data.plan, error: null })
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', plan: null, error: err.message })
      })
    return () => { cancelled = true }
  }, [sessionId])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-8 rounded-2xl text-center">
        {state.status === 'loading' && (
          <>
            <FiLoader size={40} className="mx-auto text-primary-400 animate-spin" />
            <h1 className="text-xl font-semibold text-white mt-4">Verifying your payment…</h1>
            <p className="text-sm text-gray-500 mt-2">Confirming with Stripe — ek second.</p>
          </>
        )}

        {state.status === 'success' && (
          <>
            <FiCheckCircle size={40} className="mx-auto text-green-400" />
            <h1 className="text-xl font-semibold text-white mt-4">Welcome to {state.plan === 'business' ? 'Business' : 'Pro'} 🎉</h1>
            <p className="text-sm text-gray-400 mt-2">
              Payment received — your plan has been upgraded to
              <span className="capitalize text-primary-300 font-medium"> {state.plan}</span>.
            </p>
            <div className="flex gap-3 justify-center mt-6">
              <Link
                to="/profile"
                className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-medium transition-all"
              >
                View Profile
              </Link>
              <Link
                to="/dashboard"
                className="px-5 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-medium transition-all"
              >
                Dashboard
              </Link>
            </div>
          </>
        )}

        {state.status === 'error' && (
          <>
            <FiXCircle size={40} className="mx-auto text-rose-400" />
            <h1 className="text-xl font-semibold text-white mt-4">Payment not confirmed</h1>
            <p className="text-sm text-gray-500 mt-2">{state.error}</p>
            <Link
              to="/profile"
              className="inline-block px-5 py-2 mt-6 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-medium transition-all"
            >
              Back to Profile
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
