import { useState, useEffect, useRef, useCallback } from 'react'
import { FiBell, FiX, FiCheck } from 'react-icons/fi'
import { formatDistanceToNow } from 'date-fns'
import useStore from '../store/useStore.js'

const TYPE_ICON = {
  alert:          '🔥',
  daily_digest:   '📊',
  product_update: '📦',
  system:         '🔔',
}

function NotificationItem({ n, onMarkRead, onDelete }) {
  const ago = n.createdAt
    ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })
    : ''

  return (
    <div
      className={`px-4 py-3 border-b border-white/5 last:border-0 transition-colors duration-150 ${
        n.read ? 'opacity-70' : 'bg-primary-500/5'
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="text-base mt-0.5 flex-shrink-0">{TYPE_ICON[n.type] || '🔔'}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold leading-snug ${n.read ? 'text-gray-400' : 'text-white'}`}>
            {n.title}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{n.message}</p>
          <p className="text-[10px] text-gray-600 mt-1">{ago}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!n.read && (
            <button
              onClick={(e) => { e.stopPropagation(); onMarkRead(n._id) }}
              className="p-1 text-gray-600 hover:text-primary-400 rounded transition-colors"
              title="Mark read"
            >
              <FiCheck size={11} />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(n._id) }}
            className="p-1 text-gray-700 hover:text-red-400 rounded transition-colors"
            title="Delete"
          >
            <FiX size={11} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function NotificationBell() {
  const user           = useStore((s) => s.user)
  const token          = user?.token
  const notifBumpCount = useStore((s) => s.notifBumpCount)

  const [open,          setOpen]          = useState(false)
  const [unread,        setUnread]        = useState(0)
  const [notifications, setNotifications] = useState([])
  const [loading,       setLoading]       = useState(false)
  const panelRef = useRef(null)

  // ── Fetch unread count (lightweight) ──────────────────────────────────────
  const fetchCount = useCallback(async () => {
    if (!token) return
    try {
      const res  = await fetch('/api/notifications/count', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setUnread(data.unread)
    } catch { /* network error — silent */ }
  }, [token])

  // ── Fetch full notification list (on panel open) ───────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res  = await fetch('/api/notifications?limit=20', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setNotifications(data.data.notifications || [])
        setUnread(data.data.unread ?? 0)
      }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [token])

  // ── Real-time: bump badge instantly when socket fires alertTriggered ─────────
  const prevBump = useRef(0)
  useEffect(() => {
    if (notifBumpCount > prevBump.current) {
      prevBump.current = notifBumpCount
      setUnread((c) => c + 1)
      if (open) fetchNotifications()
    }
  }, [notifBumpCount, open, fetchNotifications])

  // Poll for count every 30 s (fallback / reconciliation)
  useEffect(() => {
    if (!token) return
    fetchCount()
    const id = setInterval(fetchCount, 30_000)
    return () => clearInterval(id)
  }, [fetchCount, token])

  // Load list when panel opens
  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // ── Actions ───────────────────────────────────────────────────────────────
  const markRead = async (id) => {
    try {
      await fetch('/api/notifications', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ notificationId: 'all' }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnread(0)
    } catch { /* silent */ }
  }

  const deleteOne = async (id) => {
    try {
      await fetch(`/api/notifications?id=${id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const wasUnread = notifications.find((n) => n._id === id && !n.read)
      setNotifications((prev) => prev.filter((n) => n._id !== id))
      if (wasUnread) setUnread((c) => Math.max(0, c - 1))
    } catch { /* silent */ }
  }

  if (!token) return null

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
        title="Notifications"
      >
        <FiBell size={15} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 glass-card border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <FiBell size={13} className="text-primary-400" />
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unread > 0 && (
                <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full font-medium">
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] text-primary-400 hover:text-primary-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-xs text-gray-600">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <FiBell size={20} className="mx-auto mb-2 text-gray-700" />
                <p className="text-xs text-gray-600">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n._id}
                  n={n}
                  onMarkRead={markRead}
                  onDelete={deleteOne}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-white/5 px-4 py-2 text-center">
              <a
                href="/notifications"
                className="text-[11px] text-primary-400 hover:text-primary-300 transition-colors"
                onClick={() => setOpen(false)}
              >
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
