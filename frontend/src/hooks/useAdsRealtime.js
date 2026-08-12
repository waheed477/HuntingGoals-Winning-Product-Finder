import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import toast from '../lib/toast.js'
import useStore from '../store/useStore.js'
import { normalizeBaseUrl } from '../lib/baseUrl.js'

// Socket.io shares the API's origin (single backend process/port), so the
// API base URL is the socket URL. VITE_SOCKET_URL remains as an optional
// override; empty means same-origin (works with the Vite dev proxy).
function buildSocketUrl() {
  return normalizeBaseUrl(import.meta.env.VITE_API_URL || import.meta.env.VITE_SOCKET_URL) || undefined
}
const SOCKET_URL = buildSocketUrl()

export function useAdsRealtime({ onSchedulerRan } = {}) {
  const user        = useStore((s) => s.user)
  const queryClient = useQueryClient()
  const socketRef   = useRef(null)

  useEffect(() => {
    if (!user?.token) return

    const socket = io(SOCKET_URL, {
      auth: { token: user.token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 3000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      if (import.meta.env.DEV) console.log('[useAdsRealtime] connected')
    })

    socket.on('newAdsDetected', ({ count, categories = [] } = {}) => {
      queryClient.invalidateQueries({ queryKey: ['ads'] })
      toast(`${count} new ad${count !== 1 ? 's' : ''} detected${categories.length ? ` in ${categories.slice(0, 2).join(', ')}` : ''}`, {
        icon: '📘',
        style: {
          background: '#1e1e3f',
          color: '#fff',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '12px',
          fontSize: '14px',
        },
        duration: 5000,
      })
    })

    socket.on('schedulerRan', ({ scraper, totalSaved = 0, errors = 0 } = {}) => {
      if (scraper !== 'facebookAds') return
      queryClient.invalidateQueries({ queryKey: ['ads'] })
      if (totalSaved > 0) {
        toast.success(`Scrape complete — ${totalSaved} new ad${totalSaved !== 1 ? 's' : ''} saved`, {
          style: {
            background: '#1e1e3f',
            color: '#fff',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          duration: 6000,
        })
      } else {
        toast(`Scrape complete — no new ads found${errors > 0 ? ` (${errors} error${errors !== 1 ? 's' : ''})` : ''}`, {
          icon: '🔄',
          style: {
            background: '#1e1e3f',
            color: '#fff',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          duration: 5000,
        })
      }
      onSchedulerRan?.()
    })

    socket.on('connect_error', (err) => {
      if (import.meta.env.DEV) console.warn('[useAdsRealtime] connection error:', err.message)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user?.token, queryClient, onSchedulerRan])

  return socketRef
}
