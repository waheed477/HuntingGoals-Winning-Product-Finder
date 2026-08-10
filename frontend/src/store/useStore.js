import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(
  persist(
    (set, get) => ({
      selectedCity: 'Lahore',
      selectedCategory: 'All',
      minWinScore: 0,
      user: null,
      darkMode: true,
      profile: null,
      alertHistory: [],
      alertHistoryPagination: { page: 1, limit: 20, total: 0, pages: 1 },
      notifBumpCount: 0,

      setSelectedCity:     (city)     => set({ selectedCity: city }),
      setSelectedCategory: (category) => set({ selectedCategory: category }),
      setMinWinScore:      (score)    => set({ minWinScore: score }),
      setUser:             (user)     => set({ user }),
      bumpNotifCount:      ()         => set((s) => ({ notifBumpCount: s.notifBumpCount + 1 })),
      toggleDarkMode:      ()         => set((s) => ({ darkMode: !s.darkMode })),

      logout: async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' })
        } catch {
          // ignore network errors on logout
        }
        set({ user: null, profile: null, alertHistory: [] })
      },

      validateSession: async () => {
        const token = get().user?.token
        if (!token) return false
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!res.ok) {
            set({ user: null, profile: null, alertHistory: [] })
            return false
          }
          return true
        } catch {
          return false
        }
      },

      fetchProfile: async () => {
        const token = get().user?.token
        if (!token) return
        try {
          const res = await fetch('/api/user/profile', {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.status === 401 || res.status === 403) {
            set({ user: null, profile: null, alertHistory: [] })
            window.location.href = '/login'
            return
          }
          const data = await res.json()
          if (data.success) {
            set({ profile: data.data.user })
          } else {
            set({ profile: false })
          }
        } catch (err) {
          console.error('[fetchProfile]', err)
          set({ profile: false })
        }
      },

      updateProfile: async (updates) => {
        const token = get().user?.token
        if (!token) throw new Error('Not authenticated')
        const res = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(updates),
        })
        if (res.status === 401 || res.status === 403) {
          set({ user: null, profile: null, alertHistory: [] })
          window.location.href = '/login'
          throw new Error('Session expired — please log in again')
        }
        const data = await res.json()
        if (!data.success) throw new Error(data.error || 'Update failed')
        set({ profile: data.data.user })
        return data.data.user
      },

      changePassword: async ({ currentPassword, newPassword }) => {
        const token = get().user?.token
        if (!token) throw new Error('Not authenticated')
        const res = await fetch('/api/user/password', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ currentPassword, newPassword }),
        })
        if (res.status === 401 || res.status === 403) {
          set({ user: null, profile: null, alertHistory: [] })
          window.location.href = '/login'
          throw new Error('Session expired — please log in again')
        }
        const data = await res.json()
        if (!data.success) throw new Error(data.error || 'Password change failed')
        return data
      },

      deleteAccount: async () => {
        const token = get().user?.token
        if (!token) throw new Error('Not authenticated')
        const res = await fetch('/api/user/account', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error || 'Delete failed')
        set({ user: null, profile: null, alertHistory: [] })
        return data
      },

      fetchAlertHistory: async (page = 1) => {
        const token = get().user?.token
        if (!token) return
        try {
          const res = await fetch(`/api/user/alerts/history?page=${page}&limit=20`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.status === 401 || res.status === 403) {
            set({ user: null, profile: null, alertHistory: [] })
            window.location.href = '/login'
            return
          }
          const data = await res.json()
          if (data.success) {
            set({
              alertHistory: data.data.alerts,
              alertHistoryPagination: data.data.pagination,
            })
          }
        } catch (err) {
          console.error('[fetchAlertHistory]', err)
        }
      },

      generateApiKey: async () => {
        const token = get().user?.token
        if (!token) throw new Error('Not authenticated')
        const res = await fetch('/api/user/apikey', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status === 401 || res.status === 403) {
          set({ user: null, profile: null, alertHistory: [] })
          window.location.href = '/login'
          throw new Error('Session expired — please log in again')
        }
        const data = await res.json()
        if (!data.success) throw new Error(data.error || 'Failed to generate key')
        set((s) => ({ profile: s.profile ? { ...s.profile, apiKey: data.data.apiKey } : s.profile }))
        return data.data.apiKey
      },
    }),
    {
      name: 'trendspy-storage',
      partialize: (state) => ({ user: state.user, darkMode: state.darkMode }),
    }
  )
)

export default useStore
