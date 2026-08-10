import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  FiUser, FiPhone, FiMail, FiBell, FiShield, FiClock,
  FiTrash2, FiLock, FiRefreshCw, FiSave, FiChevronLeft, FiChevronRight,
  FiPlusCircle,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import useStore from '../store/useStore.js'
import ChangePasswordModal from '../components/ChangePasswordModal.jsx'
import DeleteAccountModal from '../components/DeleteAccountModal.jsx'
import UpgradePlanModal from '../components/UpgradePlanModal.jsx'
import ApiKeySection from '../components/ApiKeySection.jsx'
import AddSupplierModal from '../components/AddSupplierModal.jsx'
import AlertsSection from '../components/AlertsSection.jsx'

const CATEGORIES = ['Fashion', 'Electronics', 'Beauty', 'Home', 'Grocery', 'Toys', 'Sports', 'Books']
const PLATFORMS  = ['Facebook Ads', 'Daraz', 'TikTok Shop', 'Instagram', 'OLX']
const CITIES     = ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Rawalpindi', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala']

const PLAN_STYLES = {
  free:     'bg-gray-700/50 text-gray-300 border-gray-600/50',
  pro:      'bg-primary-600/30 text-primary-300 border-primary-500/40',
  business: 'bg-accent-500/20 text-accent-300 border-accent-500/40',
}

const CHANNEL_LABEL = { email: 'Email', whatsapp: 'WhatsApp', both: 'Both' }

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'alerts',  label: 'Alerts'  },
]

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 bg-primary-600/20 border border-primary-500/20 rounded-lg flex items-center justify-center">
          <Icon size={15} className="text-primary-400" />
        </div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div>
        <p className="text-sm text-gray-200">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative rounded-full transition-colors duration-200 flex-shrink-0 ${checked ? 'bg-primary-600' : 'bg-white/10'}`}
        style={{ width: 40, height: 22 }}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-[18px]' : 'translate-x-0'}`}
        />
      </button>
    </div>
  )
}

function MultiSelect({ options, selected, onChange, color = 'primary' }) {
  const toggle = (val) =>
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val])

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            selected.includes(opt)
              ? color === 'accent'
                ? 'bg-accent-500/20 border-accent-500/40 text-accent-300'
                : 'bg-primary-600/25 border-primary-500/40 text-primary-300'
              : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

export default function Profile() {
  const { profile, fetchProfile, updateProfile, fetchAlertHistory, alertHistory, alertHistoryPagination } = useStore()
  const [activeTab, setActiveTab]               = useState('profile')
  const [form, setForm]                         = useState(null)
  const [saving, setSaving]                     = useState(false)
  const [historyPage, setHistoryPage]           = useState(1)
  const [historyLoading, setHistoryLoading]     = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal]     = useState(false)
  const [showUpgradeModal, setShowUpgradeModal]   = useState(false)
  const [showAddSupplier, setShowAddSupplier]     = useState(false)

  useEffect(() => {
    fetchProfile()
    loadHistory(1)
  }, [])

  useEffect(() => {
    if (profile && !form) {
      setForm({
        name:                  profile.name || '',
        phoneNumber:           profile.phoneNumber || '',
        city:                  profile.city || '',
        selectedCategories:    profile.selectedCategories || [],
        selectedPlatforms:     profile.selectedPlatforms || [],
        emailNotifications:    profile.emailNotifications ?? true,
        whatsappNotifications: profile.whatsappNotifications ?? false,
        dailyDigest:           profile.dailyDigest ?? false,
        digestTime:            profile.digestTime || '08:00',
      })
    }
  }, [profile])

  const loadHistory = async (page) => {
    setHistoryLoading(true)
    await fetchAlertHistory(page)
    setHistoryPage(page)
    setHistoryLoading(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateProfile(form)
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (profile === false) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <p className="text-gray-400 text-sm">Unable to load your profile.</p>
        <button
          onClick={() => fetchProfile()}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-medium transition-all"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!profile || !form) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6 pb-10">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
            {profile.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
            <p className="text-sm text-gray-400">{profile.email}</p>
          </div>
          <div className="ml-auto">
            <span className={`text-xs px-3 py-1 rounded-full border font-medium capitalize ${PLAN_STYLES[profile.subscriptionPlan] || PLAN_STYLES.free}`}>
              {profile.subscriptionPlan} plan
            </span>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex items-end gap-1 border-b border-white/10">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-t-xl transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-primary-600/25 border border-b-0 border-primary-500/40 text-white'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              {tab.id === 'alerts' && <FiBell size={13} />}
              {tab.id === 'profile' && <FiUser size={13} />}
              {tab.label}
              {activeTab === tab.id && (
                <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* ── Alerts tab ── */}
        {activeTab === 'alerts' && (
          <div className="animate-fade-in">
            <AlertsSection />
          </div>
        )}

        {/* ── Profile tab ── */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-fade-in">
            <form onSubmit={handleSave} className="space-y-6">
              {/* Personal Information */}
              <SectionCard title="Personal Information" icon={FiUser}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/50 text-sm"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Email Address</label>
                    <div className="flex items-center gap-2 bg-white/3 border border-white/5 rounded-xl px-4 py-2.5">
                      <FiMail size={14} className="text-gray-600" />
                      <span className="text-sm text-gray-500">{profile.email}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Phone Number</label>
                    <div className="relative">
                      <FiPhone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="tel"
                        value={form.phoneNumber}
                        onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                        placeholder="+923001234567"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/50 text-sm"
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Pakistani format: +923XXXXXXXXX</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Member Since</label>
                    <div className="flex items-center gap-2 bg-white/3 border border-white/5 rounded-xl px-4 py-2.5">
                      <FiClock size={14} className="text-gray-600" />
                      <span className="text-sm text-gray-500">
                        {profile.createdAt ? format(new Date(profile.createdAt), 'MMM d, yyyy') : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Business Preferences */}
              <SectionCard title="Business Preferences" icon={FiShield}>
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Default City</label>
                    <select
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      className="w-full sm:w-56 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                    >
                      <option value="">All Cities</option>
                      {CITIES.map((c) => (
                        <option key={c} value={c} className="bg-gray-900">{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Interested Categories</label>
                    <MultiSelect
                      options={CATEGORIES}
                      selected={form.selectedCategories}
                      onChange={(v) => setForm((f) => ({ ...f, selectedCategories: v }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Where do you sell?</label>
                    <MultiSelect
                      options={PLATFORMS}
                      selected={form.selectedPlatforms}
                      onChange={(v) => setForm((f) => ({ ...f, selectedPlatforms: v }))}
                      color="accent"
                    />
                  </div>
                </div>
              </SectionCard>

              {/* Notification Settings */}
              <SectionCard title="Notification Settings" icon={FiBell}>
                <div className="divide-y divide-white/5">
                  <Toggle
                    checked={form.emailNotifications}
                    onChange={(v) => setForm((f) => ({ ...f, emailNotifications: v }))}
                    label="Email Alerts"
                    description="Receive product alerts via email"
                  />
                  <Toggle
                    checked={form.whatsappNotifications}
                    onChange={(v) => setForm((f) => ({ ...f, whatsappNotifications: v }))}
                    label="WhatsApp Alerts"
                    description="Receive alerts on your WhatsApp number"
                  />
                  <Toggle
                    checked={form.dailyDigest}
                    onChange={(v) => setForm((f) => ({ ...f, dailyDigest: v }))}
                    label="Daily Email Digest"
                    description="Get a summary of top products every morning"
                  />
                  {form.dailyDigest && (
                    <div className="pt-3 pb-1">
                      <label className="block text-xs text-gray-400 mb-1.5">Digest Time</label>
                      <input
                        type="time"
                        value={form.digestTime}
                        onChange={(e) => setForm((f) => ({ ...f, digestTime: e.target.value }))}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                      />
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Save button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FiSave size={15} />
                  )}
                  Save Changes
                </button>
              </div>
            </form>

            {/* Subscription & API */}
            <SectionCard title="Subscription & API Access" icon={FiShield}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300">Current Plan</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {profile.subscriptionPlan === 'free' ? 'Limited features' : 'Full access'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-3 py-1 rounded-full border font-medium capitalize ${PLAN_STYLES[profile.subscriptionPlan] || PLAN_STYLES.free}`}>
                      {profile.subscriptionPlan}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowUpgradeModal(true)}
                      className="px-4 py-1.5 bg-accent-500/20 border border-accent-500/30 text-accent-300 hover:bg-accent-500/30 rounded-xl text-xs font-medium transition-all"
                    >
                      Upgrade Plan
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-2">API Key</p>
                  <ApiKeySection apiKey={profile.apiKey} subscriptionPlan={profile.subscriptionPlan} />
                </div>
              </div>
            </SectionCard>

            {/* Alert History */}
            <SectionCard title="Alert History" icon={FiBell}>
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">{alertHistoryPagination.total} alerts total</p>
                  <button
                    type="button"
                    onClick={() => loadHistory(historyPage)}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-all"
                  >
                    <FiRefreshCw size={12} className={historyLoading ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>

                {historyLoading ? (
                  <div className="flex justify-center py-8">
                    <span className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                  </div>
                ) : alertHistory.length === 0 ? (
                  <div className="text-center py-10 text-gray-600 text-sm">
                    No alerts sent yet. Create an alert to get started.
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="text-left text-xs text-gray-500 font-medium pb-2 pr-4">Product</th>
                            <th className="text-left text-xs text-gray-500 font-medium pb-2 pr-4">Score</th>
                            <th className="text-left text-xs text-gray-500 font-medium pb-2 pr-4">Channel</th>
                            <th className="text-left text-xs text-gray-500 font-medium pb-2 pr-4">Date</th>
                            <th className="text-left text-xs text-gray-500 font-medium pb-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {alertHistory.map((alert, i) => (
                            <tr key={i} className="hover:bg-white/3 transition-colors">
                              <td className="py-2.5 pr-4 text-gray-200 font-medium truncate max-w-[160px]">{alert.productName}</td>
                              <td className="py-2.5 pr-4">
                                <span className={`text-xs font-bold ${
                                  alert.winScore >= 85 ? 'text-green-400' :
                                  alert.winScore >= 70 ? 'text-yellow-400' : 'text-gray-400'
                                }`}>{alert.winScore}</span>
                              </td>
                              <td className="py-2.5 pr-4 text-xs text-gray-400 capitalize">
                                {CHANNEL_LABEL[alert.channel] || alert.channel}
                              </td>
                              <td className="py-2.5 pr-4 text-xs text-gray-500">
                                {format(new Date(alert.sentAt), 'MMM d, h:mm a')}
                              </td>
                              <td className="py-2.5">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  alert.delivered ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                                }`}>
                                  {alert.delivered ? 'Delivered' : 'Failed'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {alertHistoryPagination.pages > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-gray-600">
                          Page {alertHistoryPagination.page} of {alertHistoryPagination.pages}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => loadHistory(historyPage - 1)}
                            disabled={historyPage <= 1}
                            className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                          >
                            <FiChevronLeft size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => loadHistory(historyPage + 1)}
                            disabled={historyPage >= alertHistoryPagination.pages}
                            className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                          >
                            <FiChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </SectionCard>

            {/* Community Contributions */}
            <SectionCard title="Community Contributions" icon={FiPlusCircle}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">Know a local supplier?</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Share suppliers you work with — help other TrendSpy sellers source products faster.
                    Submissions are reviewed within 24–48 hours.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddSupplier(true)}
                  className="ml-4 flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-primary-600/20 border border-primary-500/30 hover:bg-primary-600/30 text-primary-300 rounded-xl text-sm font-medium transition-all"
                >
                  <FiPlusCircle size={15} />
                  Add Supplier
                </button>
              </div>
            </SectionCard>

            {/* Account Management */}
            <SectionCard title="Account Management" icon={FiShield}>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-sm text-gray-300 transition-all"
                >
                  <FiLock size={15} />
                  Change Password
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-xl text-sm text-red-400 transition-all"
                >
                  <FiTrash2 size={15} />
                  Delete Account
                </button>
              </div>
            </SectionCard>
          </div>
        )}
      </div>

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
      {showDeleteModal   && <DeleteAccountModal  onClose={() => setShowDeleteModal(false)} />}
      {showAddSupplier   && <AddSupplierModal    onClose={() => setShowAddSupplier(false)} />}
      {showUpgradeModal  && (
        <UpgradePlanModal
          currentPlan={profile.subscriptionPlan}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </>
  )
}
