import { useState, useEffect, useCallback } from 'react'
import { FiBell, FiCheck, FiTrash2, FiRefreshCw } from 'react-icons/fi'
import { formatDistanceToNow } from 'date-fns'
import useStore from '../store/useStore.js'

const TYPE_ICON = {
  alert:          '🔥',
  daily_digest:   '📊',
  product_update: '📦',
  system:         '🔔',
}

const TYPE_LABEL = {
  alert:          'Product Alert',
  daily_digest:   'Daily Digest',
  product_update: 'Product Update',
  system:         'System',
}

const TYPE_BADGE = {
  alert:          'bg-orange-500/15 text-orange-400 border-orange-500/25',
  daily_digest:   'bg-primary-500/15 text-primary-400 border-primary-500/25',
  product_update: 'bg-green-500/15 text-green-400 border-green-500/25',
  system:         'bg-gray-500/15 text-gray-400 border-gray-500/25',
}

const PAGE_SIZE = 20

export default function Notifications() {
  const user  = useStore((s) => s.user)
  const token = user?.token

  const [notifications, setNotifications] = useState([])
  const [unread,        setUnread]        = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [fetching,      setFetching]      = useState(false)
  const [offset,        setOffset]        = useState(0)
  const [hasMore,       setHasMore]       = useState(true)
  const [filter,        setFilter]        = useState('all') // 'all' | 'unread'

  const headers = { Authorization: `Bearer ${token}` }

  const load = useCallback(async (off = 0, reset = true) => {
    if (!token) return
    reset ? setLoading(true) : setFetching(true)
    try {
      const res  = await fetch(`/api/notifications?limit=${PAGE_SIZE}&offset=${off}`, { headers })
      const data = await res.json()
      if (data.success) {
        const list = data.data.notifications || []
        setNotifications((prev) => reset ? list : [...prev, ...list])
        setUnread(data.data.unread ?? 0)
        setHasMore(list.length === PAGE_SIZE)
        setOffset(off + list.length)
      }
    } catch (err) {
      console.error('[Notifications] fetch failed:', err)
    } finally {
      setLoading(false)
      setFetching(false)
    }
  }, [token]) // eslint-disable-line

  useEffect(() => { load(0, true) }, [load])

  const markRead = async (id) => {
    try {
      await fetch('/api/notifications', {
        method:  'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ notificationId: id }),
      })
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n))
      setUnread((c) => Math.max(0, c - 1))
    } catch { /* silent */ }
  }

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method:  'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ notificationId: 'all' }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnread(0)
    } catch { /* silent */ }
  }

  const deleteOne = async (id) => {
    try {
      await fetch(`/api/notifications?id=${id}`, { method: 'DELETE', headers })
      const wasUnread = notifications.find((n) => n._id === id && !n.read)
      setNotifications((prev) => prev.filter((n) => n._id !== id))
      if (wasUnread) setUnread((c) => Math.max(0, c - 1))
    } catch { /* silent */ }
  }

  const displayed = filter === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="section-title">Notifications</h1>
          <p className="section-subtitle">
            {unread > 0 ? `${unread} unread notification${unread !== 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary-600/20 border border-primary-500/30 text-primary-400 hover:bg-primary-600/30 rounded-lg transition-all"
            >
              <FiCheck size={12} />
              Mark all read
            </button>
          )}
          <button
            onClick={() => load(0, true)}
            disabled={loading}
            className="p-2 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-lg transition-all disabled:opacity-50"
            title="Refresh"
          >
            <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2">
        {['all', 'unread'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-150 ${
              filter === f
                ? 'bg-primary-600/30 border-primary-500/50 text-white'
                : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300'
            }`}
          >
            {f === 'all' ? 'All' : `Unread${unread > 0 ? ` (${unread})` : ''}`}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="glass-card p-12 flex items-center justify-center">
          <FiRefreshCw size={20} className="text-gray-600 animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <FiBell size={32} className="mx-auto mb-3 text-gray-700" />
          <p className="text-sm text-gray-500">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </p>
          <p className="text-xs text-gray-700 mt-1">
            You will be notified when winning products are found that match your alerts
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((n) => {
            const ago        = n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : ''
            const badgeCls   = TYPE_BADGE[n.type] || TYPE_BADGE.system
            const icon       = TYPE_ICON[n.type]  || '🔔'
            const typeLabel  = TYPE_LABEL[n.type]  || n.type

            return (
              <div
                key={n._id}
                className={`glass-card p-4 flex items-start gap-3 transition-all duration-200 cursor-pointer ${
                  n.read ? '' : 'border-l-2 border-l-primary-500'
                }`}
                onClick={() => { if (!n.read) markRead(n._id) }}
              >
                <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${badgeCls}`}>
                      {typeLabel}
                    </span>
                    {!n.read && (
                      <span className="w-1.5 h-1.5 bg-primary-400 rounded-full flex-shrink-0" />
                    )}
                    <span className="text-[10px] text-gray-600 ml-auto">{ago}</span>
                  </div>
                  <p className={`text-sm font-medium leading-snug ${n.read ? 'text-gray-400' : 'text-white'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{n.message}</p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {!n.read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markRead(n._id) }}
                      className="p-1.5 text-gray-600 hover:text-primary-400 rounded-lg transition-colors"
                      title="Mark as read"
                    >
                      <FiCheck size={13} />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteOne(n._id) }}
                    className="p-1.5 text-gray-700 hover:text-red-400 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Load more */}
      {!loading && hasMore && filter === 'all' && (
        <div className="flex justify-center">
          <button
            onClick={() => load(offset, false)}
            disabled={fetching}
            className="px-5 py-2 text-xs font-medium bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-lg transition-all disabled:opacity-50"
          >
            {fetching ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
