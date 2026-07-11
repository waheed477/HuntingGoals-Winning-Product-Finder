import { useState } from 'react'
import { FiX, FiMapPin, FiTag, FiPhone, FiGlobe, FiHome, FiUser } from 'react-icons/fi'
import toast from 'react-hot-toast'

const CITIES = [
  'Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Rawalpindi',
  'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala',
]

const CATEGORIES = [
  'Fashion', 'Electronics', 'Beauty', 'Home',
  'Grocery', 'Toys', 'Sports', 'Books', 'General',
]

const EMPTY = {
  name: '', city: '', category: 'General',
  phone: '', website: '', address: '',
}

export default function AddSupplierModal({ onClose }) {
  const [form, setForm]       = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Supplier name is required')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/suppliers/add', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to submit')
      setSubmitted(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md glass-card rounded-2xl p-6 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white">Add a Supplier</h2>
            <p className="text-xs text-gray-400 mt-0.5">Share a supplier you know with the community</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <FiX size={18} />
          </button>
        </div>

        {submitted ? (
          /* Success state */
          <div className="text-center py-8 space-y-4">
            <div className="w-14 h-14 bg-green-500/20 border border-green-500/30 rounded-2xl flex items-center justify-center mx-auto">
              <span className="text-2xl">✓</span>
            </div>
            <div>
              <p className="text-white font-semibold">Supplier submitted!</p>
              <p className="text-sm text-gray-400 mt-1">
                Thank you! Your supplier will be reviewed within 24–48 hours and listed for all sellers.
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-medium transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Supplier / Business Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <FiUser size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="e.g. Malik Fabrics Lahore"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/50 text-sm"
                />
              </div>
            </div>

            {/* City + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  <FiMapPin size={11} className="inline mr-1" />City
                </label>
                <select
                  value={form.city}
                  onChange={set('city')}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                >
                  <option value="">Select city</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c} className="bg-gray-900">{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  <FiTag size={11} className="inline mr-1" />Category
                </label>
                <select
                  value={form.category}
                  onChange={set('category')}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-gray-900">{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                <FiPhone size={11} className="inline mr-1" />Phone (optional)
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="+92 300 1234567"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/50 text-sm"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                <FiGlobe size={11} className="inline mr-1" />Website (optional)
              </label>
              <input
                type="url"
                value={form.website}
                onChange={set('website')}
                placeholder="https://example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/50 text-sm"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                <FiHome size={11} className="inline mr-1" />Address (optional)
              </label>
              <input
                type="text"
                value={form.address}
                onChange={set('address')}
                placeholder="e.g. Hall Road, Lahore"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/50 text-sm"
              />
            </div>

            {/* Info note */}
            <p className="text-xs text-gray-500 bg-white/3 border border-white/8 rounded-xl px-3 py-2.5">
              After submission, our team will review and verify the supplier within 24–48 hours before it appears publicly.
            </p>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 text-sm text-gray-400 border border-white/10 rounded-xl hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 text-sm font-semibold bg-primary-600 hover:bg-primary-500 text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : null}
                {submitting ? 'Submitting…' : 'Submit Supplier'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
