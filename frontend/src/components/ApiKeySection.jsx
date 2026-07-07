import { useState } from 'react'
import { FiKey, FiRefreshCw, FiCopy, FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'
import useStore from '../store/useStore.js'

export default function ApiKeySection({ apiKey, subscriptionPlan }) {
  const generateApiKey = useStore((s) => s.generateApiKey)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const isPaid = subscriptionPlan === 'pro' || subscriptionPlan === 'business'

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 16)}${'•'.repeat(16)}`
    : null

  const handleGenerate = async () => {
    setLoading(true)
    try {
      await generateApiKey()
      toast.success('New API key generated')
      setRevealed(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!apiKey) return
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    toast.success('API key copied')
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isPaid) {
    return (
      <div className="flex items-center gap-3 p-4 bg-white/3 border border-white/10 rounded-xl">
        <FiKey size={16} className="text-gray-500 flex-shrink-0" />
        <p className="text-sm text-gray-500">API key access requires a Pro or Business plan.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {apiKey ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 font-mono text-sm text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap">
            {revealed ? apiKey : maskedKey}
          </div>
          <button
            onClick={() => setRevealed((r) => !r)}
            className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-gray-400 hover:text-white transition-all whitespace-nowrap"
          >
            {revealed ? 'Hide' : 'Show'}
          </button>
          <button
            onClick={handleCopy}
            className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all"
            title="Copy API key"
          >
            {copied ? <FiCheck size={16} className="text-green-400" /> : <FiCopy size={16} />}
          </button>
        </div>
      ) : (
        <div className="p-4 bg-white/3 border border-white/10 rounded-xl text-sm text-gray-500">
          No API key generated yet. Click below to generate one.
        </div>
      )}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
      >
        <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        {apiKey ? 'Regenerate Key' : 'Generate API Key'}
      </button>
      {apiKey && (
        <p className="text-xs text-gray-600">
          Keep your API key secret. Regenerating will invalidate the previous key.
        </p>
      )}
    </div>
  )
}
