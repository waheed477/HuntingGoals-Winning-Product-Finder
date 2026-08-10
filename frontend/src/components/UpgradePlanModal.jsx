import { FiX, FiCheck, FiZap } from 'react-icons/fi'

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    color: 'border-white/10',
    badge: 'bg-gray-700 text-gray-300',
    features: [
      '10 product alerts/month',
      'Basic win score',
      'Dashboard access',
      'Email notifications',
      '3 cities',
    ],
    excluded: ['WhatsApp alerts', 'AI Analyst', 'API access', 'Ad Spy'],
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    color: 'border-primary-500/40',
    badge: 'bg-primary-600/30 text-primary-300',
    highlight: true,
    features: [
      'Unlimited alerts',
      'AI-powered win scores',
      'WhatsApp + email alerts',
      'AI Analyst (50 req/day)',
      'All 10 cities',
      'API key access',
      'Ad Spy tool',
    ],
    excluded: [],
  },
  {
    name: 'Business',
    price: '$49',
    period: '/month',
    color: 'border-accent-500/40',
    badge: 'bg-accent-500/20 text-accent-300',
    features: [
      'Everything in Pro',
      'AI Analyst (unlimited)',
      'Priority support',
      'White-label reports',
      'Team accounts (5 users)',
      'Custom city tracking',
    ],
    excluded: [],
  },
]

export default function UpgradePlanModal({ currentPlan = 'free', onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="glass-card w-full max-w-3xl p-6 rounded-2xl my-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-500/20 border border-accent-500/30 rounded-xl flex items-center justify-center">
              <FiZap size={18} className="text-accent-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Upgrade Your Plan</h2>
              <p className="text-xs text-gray-500">Current plan: <span className="capitalize text-gray-300">{currentPlan}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all">
            <FiX size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl border p-5 ${plan.color} ${plan.highlight ? 'bg-primary-900/20' : 'bg-white/3'}`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary-600 rounded-full text-xs font-medium text-white">
                  Most Popular
                </div>
              )}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${plan.badge}`}>{plan.name}</span>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold text-white">{plan.price}</span>
                <span className="text-gray-500 text-sm">{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-300">
                    <FiCheck size={13} className="text-green-400 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
                {plan.excluded.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-600 line-through">
                    <span className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={currentPlan === plan.name.toLowerCase()}
                className={`w-full py-2 rounded-xl text-sm font-medium transition-all ${
                  currentPlan === plan.name.toLowerCase()
                    ? 'bg-white/5 text-gray-500 cursor-default'
                    : plan.highlight
                    ? 'bg-primary-600 hover:bg-primary-500 text-white'
                    : 'bg-white/10 hover:bg-white/15 text-white'
                }`}
              >
                {currentPlan === plan.name.toLowerCase() ? 'Current Plan' : `Get ${plan.name}`}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-600 mt-5">
          Payment processing coming soon. Contact support to upgrade manually.
        </p>
      </div>
    </div>
  )
}
