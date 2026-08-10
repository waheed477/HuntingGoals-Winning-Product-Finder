import { useState, useEffect, useRef } from 'react'
import { FiEye, FiHeart, FiShare2, FiHash, FiAlertCircle } from 'react-icons/fi'
import useStore from '../store/useStore.js'

function formatCount(n) {
  if (!n || isNaN(n)) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1)     + 'K'
  return String(n)
}

export default function TikTokPanel({ productName }) {
  const user            = useStore((s) => s.user)
  const [data, setData] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const abortRef = useRef(null)

  useEffect(() => {
    if (!productName || !user?.token) return

    // Cancel any in-flight request
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setError(null)
    setData(null)

    fetch('/api/tiktok/search', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${user.token}`,
      },
      body:   JSON.stringify({ query: productName, limit: 10 }),
      signal: abortRef.current.signal,
    })
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) throw new Error(json.error || 'TikTok fetch failed')
        setData(json)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message)
      })
      .finally(() => setLoading(false))

    return () => abortRef.current?.abort()
  }, [productName, user?.token])

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="glass-card p-5 flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/70 rounded-full animate-spin flex-shrink-0" />
        <p className="text-sm text-gray-400">Fetching TikTok data…</p>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    const isCfg = error.toLowerCase().includes('configured') || error.toLowerCase().includes('client_key')
    return (
      <div className="glass-card p-5 flex items-start gap-3 border-yellow-500/20 bg-yellow-500/5">
        <FiAlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={16} />
        <p className="text-sm text-gray-400">
          {isCfg ? 'TikTok API not configured yet.' : 'No TikTok data available for this product.'}
        </p>
      </div>
    )
  }

  // ── No data ──────────────────────────────────────────────────────────────────
  if (!data || !data.videos?.length) {
    return (
      <div className="glass-card p-5 text-center">
        <p className="text-sm text-gray-500">No TikTok data available for this product.</p>
      </div>
    )
  }

  const topVideos = data.videos.slice(0, 5)
  const previews  = data.videos.slice(0, 2)
  const hashtags  = (data.relatedHashtags || []).slice(0, 5)

  const totalViews = topVideos.reduce((s, v) => s + (v.viewCount || 0), 0)
  const totalLikes = topVideos.reduce((s, v) => s + (v.likeCount || 0), 0)

  // ── Panel ─────────────────────────────────────────────────────────────────────
  return (
    <div className="glass-card p-5 space-y-5">

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-pink-500/15 flex items-center justify-center flex-shrink-0">
            <FiEye className="text-pink-400" size={14} />
          </div>
          <div>
            <p className="text-lg font-bold text-white leading-none">{formatCount(totalViews)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Views</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <FiHeart className="text-red-400" size={14} />
          </div>
          <div>
            <p className="text-lg font-bold text-white leading-none">{formatCount(totalLikes)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Likes</p>
          </div>
        </div>
      </div>

      {/* Trending hashtags */}
      {hashtags.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FiHash size={11} /> Trending Hashtags
          </p>
          <div className="flex flex-wrap gap-2">
            {hashtags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-primary-500/10 text-primary-300 border border-primary-500/20 rounded-full px-3 py-1"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sample videos */}
      {previews.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Top Videos</p>
          <div className="space-y-2">
            {previews.map((v) => (
              <div
                key={v.videoId}
                className="bg-white/5 rounded-xl p-3 flex items-start gap-3"
              >
                {/* TikTok logo placeholder */}
                <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.53V6.75a4.85 4.85 0 01-1.02-.06z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 leading-snug line-clamp-2">
                    {v.description || '@' + v.author}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <FiEye size={10} /> {formatCount(v.viewCount)}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <FiHeart size={10} /> {formatCount(v.likeCount)}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <FiShare2 size={10} /> {formatCount(v.shareCount)}
                    </span>
                  </div>
                </div>
                {v.url && (
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-400 hover:text-primary-300 flex-shrink-0"
                  >
                    View
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.sandbox && (
        <p className="text-xs text-gray-600 text-right">Sandbox mode · live data after app review</p>
      )}
    </div>
  )
}
