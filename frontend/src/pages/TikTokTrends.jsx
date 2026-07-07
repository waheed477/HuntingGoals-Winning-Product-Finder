import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FiEye, FiHeart, FiShare2, FiHash, FiSearch,
  FiRefreshCw, FiMessageCircle, FiAlertCircle,
} from 'react-icons/fi'
import useStore from '../store/useStore.js'

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Electronics', 'Fashion', 'Beauty', 'Sports', 'Home & Garden']

const CATEGORY_HASHTAGS = {
  All:              'pakistanshopping',
  Electronics:      'electronicshopping',
  Fashion:          'fashionpakistan',
  Beauty:           'beautypakistan',
  Sports:           'sportspakistan',
  'Home & Garden':  'homedekorpakistan',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCount(n) {
  if (!n || isNaN(n)) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchTikTokVideos({ category, keyword, token }) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization:  `Bearer ${token}`,
  }

  if (keyword.trim()) {
    const res  = await fetch('/api/tiktok/search', {
      method:  'POST',
      headers,
      body:    JSON.stringify({ query: keyword.trim(), limit: 30 }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || 'Search failed')
    return { videos: data.videos || [], metrics: data.metrics || {}, relatedHashtags: data.relatedHashtags || [], sandbox: data.sandbox }
  }

  // Category browse — use trending endpoint
  const params = new URLSearchParams({ limit: '30' })
  if (category !== 'All') params.set('category', category)

  const res  = await fetch(`/api/tiktok/trending?${params}`, { headers })
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Fetch failed')

  const videos = data.videos || []
  return {
    videos,
    metrics: {
      totalViews:    videos.reduce((s, v) => s + (v.viewCount    || 0), 0),
      totalLikes:    videos.reduce((s, v) => s + (v.likeCount    || 0), 0),
      totalShares:   videos.reduce((s, v) => s + (v.shareCount   || 0), 0),
      totalComments: videos.reduce((s, v) => s + (v.commentCount || 0), 0),
    },
    relatedHashtags: [...new Set(videos.flatMap((v) => v.hashtags || []))].slice(0, 10),
    sandbox: data.sandbox,
  }
}

// ─── Video Card ───────────────────────────────────────────────────────────────

function VideoCard({ video }) {
  return (
    <div className="glass-card-hover p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.53V6.75a4.85 4.85 0 01-1.02-.06z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500">@{video.author || 'tiktok'}</p>
          <p className="text-sm text-gray-200 leading-snug line-clamp-2 mt-0.5">
            {video.description || '—'}
          </p>
        </div>
        {video.url && (
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary-400 hover:text-primary-300 flex-shrink-0"
          >
            View
          </a>
        )}
      </div>

      {/* Engagement stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: FiEye,           val: video.viewCount,    color: 'text-pink-400',   bg: 'bg-pink-500/10',  label: 'Views'    },
          { icon: FiHeart,         val: video.likeCount,    color: 'text-red-400',    bg: 'bg-red-500/10',   label: 'Likes'    },
          { icon: FiShare2,        val: video.shareCount,   color: 'text-blue-400',   bg: 'bg-blue-500/10',  label: 'Shares'   },
          { icon: FiMessageCircle, val: video.commentCount, color: 'text-green-400',  bg: 'bg-green-500/10', label: 'Comments' },
        ].map(({ icon: Icon, val, color, bg, label }) => (
          <div key={label} className={`${bg} rounded-lg p-2 text-center`}>
            <Icon className={`${color} mx-auto mb-0.5`} size={11} />
            <p className="text-xs font-semibold text-white">{formatCount(val)}</p>
            <p className="text-[10px] text-gray-600">{label}</p>
          </div>
        ))}
      </div>

      {/* Hashtags */}
      {video.hashtags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {video.hashtags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-[10px] text-gray-500 bg-white/5 rounded-full px-2 py-0.5">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass-card p-4 animate-pulse space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-white/5 rounded w-1/3" />
              <div className="h-3 bg-white/5 rounded w-full" />
              <div className="h-3 bg-white/5 rounded w-2/3" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-12 bg-white/5 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TikTokTrends() {
  const user              = useStore((s) => s.user)
  const [category, setCategory] = useState('All')
  const [search,   setSearch]   = useState('')
  const [keyword,  setKeyword]  = useState('')

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey:  ['tiktok-trends', category, keyword],
    queryFn:   () => fetchTikTokVideos({ category, keyword, token: user?.token }),
    enabled:   !!user?.token,
    staleTime: 5 * 60_000,
    retry:     1,
  })

  const handleSearch = useCallback((e) => {
    e.preventDefault()
    setKeyword(search.trim())
  }, [search])

  const clearSearch = useCallback(() => {
    setSearch('')
    setKeyword('')
  }, [])

  const videos          = data?.videos || []
  const metrics         = data?.metrics || {}
  const relatedHashtags = data?.relatedHashtags || []

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-pink-400">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.53V6.75a4.85 4.85 0 01-1.02-.06z" />
            </svg>
            TikTok Trends
          </h1>
          <p className="section-subtitle">Pakistan's top trending TikTok products by category</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-lg transition-all disabled:opacity-50"
          title="Refresh"
        >
          <FiRefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Search + Category filters */}
      <div className="glass-card p-4 space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search TikTok... e.g. "smart watch", "skin serum"'
              className="input-field pl-9 py-2.5 text-sm w-full"
            />
          </div>
          {keyword && (
            <button
              type="button"
              onClick={clearSearch}
              className="px-3 py-2.5 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-xl text-sm transition-all"
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            disabled={!search.trim() || isLoading}
            className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50"
          >
            Search
          </button>
        </form>

        {/* Category tabs — hidden when keyword search is active */}
        {!keyword && (
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  category === cat
                    ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                    : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {keyword && (
          <p className="text-xs text-gray-500">
            Showing results for <span className="text-pink-400 font-medium">"{keyword}"</span>
          </p>
        )}
      </div>

      {/* Aggregate stats */}
      {!isLoading && videos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Views',    val: metrics.totalViews,    icon: FiEye,           color: 'text-pink-400',   bg: 'bg-pink-500/10'  },
            { label: 'Total Likes',    val: metrics.totalLikes,    icon: FiHeart,          color: 'text-red-400',    bg: 'bg-red-500/10'   },
            { label: 'Total Shares',   val: metrics.totalShares,   icon: FiShare2,         color: 'text-blue-400',   bg: 'bg-blue-500/10'  },
            { label: 'Total Comments', val: metrics.totalComments, icon: FiMessageCircle,  color: 'text-green-400',  bg: 'bg-green-500/10' },
          ].map(({ label, val, icon: Icon, color, bg }) => (
            <div key={label} className="glass-card p-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={color} size={14} />
              </div>
              <div>
                <p className="text-base font-bold text-white leading-none">{formatCount(val)}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Related hashtags */}
      {!isLoading && relatedHashtags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <FiHash className="text-gray-600 flex-shrink-0" size={13} />
          {relatedHashtags.map((tag) => (
            <button
              key={tag}
              onClick={() => { setSearch(tag); setKeyword(tag) }}
              className="text-xs text-primary-300 bg-primary-500/10 border border-primary-500/20 rounded-full px-2.5 py-1 hover:bg-primary-500/20 transition-all"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="glass-card p-5 flex items-start gap-3 border-yellow-500/20 bg-yellow-500/5">
          <FiAlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={16} />
          <div>
            <p className="text-sm font-medium text-white mb-0.5">TikTok data unavailable</p>
            <p className="text-xs text-gray-400">
              {error.message?.includes('configured')
                ? 'TikTok API credentials not set up yet. Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in secrets.'
                : error.message || 'Failed to load TikTok data.'}
            </p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && <Skeleton />}

      {/* No results */}
      {!isLoading && !error && videos.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-pink-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-pink-400/50">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.53V6.75a4.85 4.85 0 01-1.02-.06z" />
            </svg>
          </div>
          <p className="text-white font-medium mb-1">No videos found</p>
          <p className="text-gray-500 text-sm">
            {keyword ? `No TikTok results for "${keyword}"` : 'Try a different category or search keyword'}
          </p>
        </div>
      )}

      {/* Video grid */}
      {!isLoading && videos.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {videos.map((video) => (
              <VideoCard key={video.videoId || Math.random()} video={video} />
            ))}
          </div>

          {data?.sandbox && (
            <p className="text-xs text-gray-700 text-center pt-2">
              Sandbox mode · Submit TikTok app for review to unlock full production data
            </p>
          )}
        </>
      )}
    </div>
  )
}
