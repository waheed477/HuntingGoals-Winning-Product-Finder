import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import useStore from '../store/useStore.js'

let _socket = null
let _token  = null

function getSharedSocket(token) {
  // Use VITE_SOCKET_URL or VITE_API_URL if set, otherwise fallback to same-origin (dev)
  const API_BASE = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || ''

  if (_socket && _token === token && (_socket.connected || _socket.connecting)) {
    return _socket
  }
  if (_socket) {
    _socket.disconnect()
    _socket = null
  }
  _token  = token
  // ✅ Connect to the actual backend URL (HF) in production, or same-origin in dev
  _socket = io(API_BASE || undefined, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 20000,
    timeout: 10000,
  })
  return _socket
}

export function useSocket() {
  const user           = useStore((s) => s.user)
  const token          = user?.token
  const bumpNotifCount = useStore((s) => s.bumpNotifCount)

  const [isConnected, setIsConnected] = useState(false)
  const [lastAlert,   setLastAlert]   = useState(null)
  const socketRef     = useRef(null)

  const onAlertTriggered = useCallback((data) => {
    const product = data?.product || {}
    const name    = product.name    || 'New Product'
    const score   = product.winScore ?? '—'
    const city    = Array.isArray(product.cities) ? product.cities[0] : (product.cities || '')

    setLastAlert(product)
    bumpNotifCount()

    toast(`🔥 ${name} · Score ${score}${city ? ' · ' + city : ''}`, {
      icon: '📦',
      style: {
        background: '#1e1e3f',
        color: '#fff',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: '12px',
        fontSize: '14px',
      },
      duration: 5000,
    })
  }, [bumpNotifCount])

  const onNewWinningProduct = useCallback((data) => {
    const product = data?.product || {}
    if (!product.name) return
    toast(`🏆 New winner: ${product.name} · Score ${product.winScore}`, {
      style: {
        background: '#0f2e1a',
        color: '#fff',
        border: '1px solid rgba(34,197,94,0.3)',
        borderRadius: '12px',
        fontSize: '14px',
      },
      duration: 4000,
    })
  }, [])

  useEffect(() => {
    if (!token) {
      setIsConnected(false)
      return
    }

    const socket = getSharedSocket(token)
    socketRef.current = socket

    const onConnect    = () => setIsConnected(true)
    const onDisconnect = () => setIsConnected(false)
    const onError      = (err) => {
      console.warn('[Socket] connect_error:', err.message)
      setIsConnected(false)
    }

    socket.on('connect',           onConnect)
    socket.on('disconnect',        onDisconnect)
    socket.on('connect_error',     onError)
    socket.on('alertTriggered',    onAlertTriggered)
    socket.on('newWinningProduct', onNewWinningProduct)

    if (socket.connected) setIsConnected(true)

    return () => {
      socket.off('connect',           onConnect)
      socket.off('disconnect',        onDisconnect)
      socket.off('connect_error',     onError)
      socket.off('alertTriggered',    onAlertTriggered)
      socket.off('newWinningProduct', onNewWinningProduct)
    }
  }, [token, onAlertTriggered, onNewWinningProduct])

  const subscribeToProducts = useCallback((productIds = []) => {
    if (socketRef.current?.connected && productIds.length) {
      socketRef.current.emit('subscribe', { productIds })
    }
  }, [])

  return { isConnected, lastAlert, subscribeToProducts }
}
