import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiBell, FiPlus, FiTrash2, FiMail, FiMessageCircle, FiClock, FiCheck, FiLock } from 'react-icons/fi'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { fetchAlerts, createAlert, deleteAlert } from '../api/alerts.js'
import { CITIES, CATEGORIES } from '../utils/cityList.js'
import { getScoreClasses } from '../utils/scoreColor.js'
import useStore from '../store/useStore.js'

export default function Alerts() {
  const queryClient = useQueryClient()
  const user = useStore((s) => s.user)
  const alertHistory = useStore((s) => s.alertHistory)
  const storeAlertHistory = useStore((s) => s.fetchAlertHistory)
  const [notifyVia, setNotifyVia] = useState('email')
  const [digestEnabled, setDigestEnabled] = useState(true)
  const [digestTime, setDigestTime] = useState('08:00')
  const [form, setForm] = useState({ city: 'Lahore', category: 'Electronics', minScore: 75 })

  useEffect(() => {
    if (user?.token) storeAlertHistory()
  }, [user?.token])

  const { data: alerts } = useQuery({
    queryKey: ['alerts', user?.token],
    queryFn: fetchAlerts,
  })

  const createMutation = useMutation({
    mutationFn: createAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Alert created!')
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Alert deleted')
    },
    onError: (err) => toast.error(err.message),
  })

  const handleCreate = (e) => {
    e.preventDefault()
    createMutation.mutate({ ...form, notifyVia })
  }

  if (!user) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="section-title">Alerts</h1>
          <p className="section-subtitle">Get notified when products meet your criteria</p>
        </div>
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 bg-primary-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FiLock className="text-primary-400" size={28} />
          </div>
          <h3 className="text-white font-semibold mb-2">Login Required</h3>
          <p className="text-gray-500 text-sm">Sign in to create and manage product alerts.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="section-title">Alerts</h1>
        <p className="section-subtitle">Get notified when products meet your criteria</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <FiPlus className="text-primary-400" size={18} />
            <h3 className="text-base font-semibold text-white">Create New Alert</h3>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">City</label>
              <select
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className="select-field text-sm py-2"
              >
                <option value="All">All Cities</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="select-field text-sm py-2"
              >
                {CATEGORIES.filter((c) => c !== 'All').map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">
                Minimum Win Score: <span className="text-primary-400 font-semibold">{form.minScore}</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={form.minScore}
                onChange={(e) => setForm((f) => ({ ...f, minScore: Number(e.target.value) }))}
                className="w-full accent-primary-500"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>0</span><span>50</span><span>100</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-2 block">Notify via</label>
              <div className="flex gap-2">
                {[
                  { id: 'email', icon: FiMail, label: 'Email' },
                  { id: 'whatsapp', icon: FiMessageCircle, label: 'WhatsApp' },
                ].map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setNotifyVia(n.id)}
                    className={`flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                      notifyVia === n.id
                        ? 'bg-primary-600/20 border-primary-500/50 text-primary-400'
                        : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <n.icon size={14} />
                    {n.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <FiPlus size={16} />
                  Create Alert
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-white/10">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Daily Digest Settings</h4>
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  className={`w-10 h-5 rounded-full transition-colors duration-200 relative ${digestEnabled ? 'bg-primary-600' : 'bg-gray-700'}`}
                  onClick={() => setDigestEnabled(!digestEnabled)}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${digestEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-gray-300">Enable daily digest</span>
              </label>
            </div>
            {digestEnabled && (
              <div className="flex items-center gap-2">
                <FiClock className="text-gray-500" size={14} />
                <span className="text-xs text-gray-500">Send digest at:</span>
                <input
                  type="time"
                  value={digestTime}
                  onChange={(e) => setDigestTime(e.target.value)}
                  className="input-field text-sm py-1.5 w-auto"
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Active Alerts ({alerts?.length || 0})</h3>
            {!alerts?.length && (
              <p className="text-gray-500 text-sm text-center py-4">No alerts yet. Create your first one.</p>
            )}
            <div className="space-y-3">
              {alerts?.map((alert) => (
                <div key={alert.id} className="flex items-center gap-3 p-3 bg-white/3 rounded-xl border border-white/5">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${alert.active ? 'bg-green-400 animate-pulse-slow' : 'bg-gray-600'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {alert.city} · {alert.category}
                    </p>
                    <p className="text-xs text-gray-500">
                      Min score: {alert.minScore} · via {alert.notifyVia}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(alert.id)}
                    className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <FiBell className="text-accent-400" size={16} />
              <h3 className="text-sm font-semibold text-white">Alert History</h3>
            </div>
            {alertHistory.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No alert history yet.</p>
            ) : (
              <div className="space-y-2.5">
                {alertHistory.map((h, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FiCheck className="text-green-400" size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium truncate">{h.productName || h.product}</p>
                      <p className="text-xs text-gray-500">
                        {h.channel || h.notifyVia || 'email'} · Score {h.winScore}
                        {h.delivered === false && <span className="text-red-400 ml-1">· failed</span>}
                      </p>
                    </div>
                    <span className="text-xs text-gray-600 whitespace-nowrap">
                      {formatDistanceToNow(new Date(h.sentAt || h.triggeredAt || Date.now()), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
