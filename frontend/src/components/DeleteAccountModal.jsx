import { useState } from 'react'
import { FiX, FiAlertTriangle, FiTrash2 } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore.js'

export default function DeleteAccountModal({ onClose }) {
  const deleteAccount = useStore((s) => s.deleteAccount)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      toast.error('Type DELETE to confirm')
      return
    }
    setLoading(true)
    try {
      await deleteAccount()
      toast.success('Account deleted')
      navigate('/login')
    } catch (err) {
      toast.error(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center justify-center">
              <FiAlertTriangle size={18} className="text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Delete Account</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all">
            <FiX size={18} />
          </button>
        </div>

        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-5">
          <p className="text-red-300 text-sm leading-relaxed">
            This action is <strong>permanent and irreversible</strong>. All your alerts, notification history, and account data will be deleted immediately.
          </p>
        </div>

        <div className="mb-5">
          <label className="block text-xs text-gray-400 mb-1.5">
            Type <span className="font-mono text-red-400 font-bold">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 text-sm font-mono"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 text-sm transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={confirmText !== 'DELETE' || loading}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><FiTrash2 size={15} /> Delete Account</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
