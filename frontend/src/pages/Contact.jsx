import { useState } from 'react'
import { FiMail, FiClock, FiMapPin, FiCheckCircle, FiSend } from 'react-icons/fi'
import PublicLayout from '../components/PublicLayout.jsx'
import toast from 'react-hot-toast'

const INFO = [
  {
    icon: FiMail,
    label: 'Email',
    value: 'support@huntinggoals.com',
    href: 'mailto:support@huntinggoals.com',
  },
  {
    icon: FiClock,
    label: 'Response Time',
    value: 'Within 24 hours',
    href: null,
  },
  {
    icon: FiMapPin,
    label: 'Location',
    value: 'Pakistan',
    href: null,
  },
]

const TOPICS = [
  'General Inquiry',
  'Technical Support',
  'Billing / Subscription',
  'Feature Request',
  'Report a Bug',
  'Data / Privacy',
  'Partnership',
]

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', topic: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all required fields')
      return
    }
    setLoading(true)
    // Simulate a brief delay to feel responsive
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">

        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-xs font-semibold text-primary-400 uppercase tracking-widest">Get in Touch</span>
          <h1 className="text-4xl font-bold text-white mt-3 mb-3">Contact Us</h1>
          <p className="text-gray-400 text-sm max-w-lg mx-auto">
            Have a question, feedback, or issue? We'd love to hear from you. Our team responds within 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Info sidebar */}
          <div className="lg:col-span-2 space-y-4">
            {INFO.map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="glass-card p-4 flex items-start gap-4">
                <div className="w-9 h-9 bg-primary-600/20 border border-primary-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-primary-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                  {href ? (
                    <a href={href} className="text-sm text-gray-200 hover:text-primary-400 transition-colors">{value}</a>
                  ) : (
                    <p className="text-sm text-gray-200">{value}</p>
                  )}
                </div>
              </div>
            ))}

            <div className="glass-card p-4 border border-primary-500/20">
              <p className="text-xs text-gray-400 leading-relaxed">
                For account deletion or data export requests, you can also use the self-service tools in
                <span className="text-primary-400"> Profile → Account Settings</span>.
              </p>
            </div>
          </div>

          {/* Contact form */}
          <div className="lg:col-span-3 glass-card p-6">
            {submitted ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <div className="w-14 h-14 bg-green-500/20 border border-green-500/30 rounded-2xl flex items-center justify-center mb-5">
                  <FiCheckCircle size={28} className="text-green-400" />
                </div>
                <h2 className="text-lg font-bold text-white mb-2">Message sent!</h2>
                <p className="text-sm text-gray-400 max-w-xs">
                  Thanks for reaching out. We'll get back to you at <span className="text-white">{form.email}</span> within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Name <span className="text-red-400">*</span></label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Your name"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Email <span className="text-red-400">*</span></label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/50 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Topic</label>
                  <select
                    name="topic"
                    value={form.topic}
                    onChange={handleChange}
                    className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-2.5 text-gray-200 focus:outline-none focus:border-primary-500/50 text-sm"
                  >
                    <option value="">Select a topic…</option>
                    {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Message <span className="text-red-400">*</span></label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Describe your question or issue in detail…"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/50 text-sm resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><FiSend size={14} /> Send Message</>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

      </div>
    </PublicLayout>
  )
}
