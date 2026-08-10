import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import useStore from '../store/useStore.js'

// In Replit the preview is proxied — ports are served as subdomains like "3002-xxx.replit.dev"
// rather than direct "hostname:3002". Detect and rewrite accordingly.
function buildSocketUrl() {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL
  const { protocol, hostname } = window.location
  // Replit pattern: "<port>-<id>.replit.dev"  →  replace the leading port prefix
  const replitMatch = hostname.match(/^(\d+)-(.+)$/)
  if (replitMatch) return `${protocol}//3002-${replitMatch[2]}`
  // Local dev: use direct port
  return `${protocol}//${hostname}:3002`
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
      console.log('[useAdsRealtime] connected')
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
      console.warn('[useAdsRealtime] connection error:', err.message)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user?.token, queryClient, onSchedulerRan])

  return socketRef
}
