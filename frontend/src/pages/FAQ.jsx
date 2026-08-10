import { useState } from 'react'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'
import PublicLayout from '../components/PublicLayout.jsx'
import { Link } from 'react-router-dom'

const FAQS = [
  {
    q: 'Is Hunting Goals free?',
    a: `Hunting Goals offers a free tier that gives you access to the dashboard, daily top products, and basic filters. Pro and Business plans unlock unlimited AI analysis, advanced ad-spy filters, Telegram/WhatsApp alerts, city-level demand maps, and API access. You can start for free — no credit card required.`,
  },
  {
    q: 'How do I get product alerts?',
    a: `Go to Profile → Alert Settings. You can set up alerts by product category, Win Score threshold, or price range. Supported channels are email (always on), Telegram (connect your chat ID), and WhatsApp (via Green API). When a product crosses your threshold, we notify you within minutes.`,
  },
  {
    q: 'Where does the product data come from?',
    a: `Our data comes from real, publicly available Facebook and Instagram ad feeds targeting Pakistani audiences. We analyze ads running on Facebook's ad transparency system — the same ads your competitors are spending money on — and extract product name, category, advertiser count, ad longevity, and engagement signals.`,
  },
  {
    q: 'How is the Win Score calculated?',
    a: `The Win Score (0–100) is a proprietary formula that weighs several factors:\n\n• Number of active advertisers in the last 7 days (heavy weight)\n• Longest running ad duration (indicates profitability)\n• Category demand index for Pakistan\n• Price-to-demand ratio\n• Trend velocity (rising vs. declining)\n\nA score above 85 indicates a strong, currently trending product. Above 70 is worth investigating.`,
  },
  {
    q: 'Can I export products?',
    a: `Yes. On the Products page and Dashboard, you can export the current product list as a CSV file by clicking the Export button. Each row includes product name, Win Score, price range, category, city demand, and number of active ads.`,
  },
  {
    q: 'How do I delete my account?',
    a: `Go to Profile → Account Settings → scroll to the "Danger Zone" section → click "Delete Account". You will be asked to confirm with your password. Account deletion is permanent and removes all your data, alerts, notifications, and preferences within 24 hours. We do not keep backups of deleted accounts.`,
  },
  {
    q: 'Who can use Hunting Goals?',
    a: `Hunting Goals is designed for:\n\n• Daraz sellers looking for trending products to list.\n• OLX traders searching for high-demand items.\n• Facebook and TikTok Shop sellers researching ad-backed products.\n• Wholesale buyers who want data-driven sourcing decisions.\n• Freelancers doing product research for clients.\n\nYou must be at least 18 years old and agree to our Terms of Service to use the platform.`,
  },
]

function FAQItem({ item, isOpen, onToggle }) {
  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left gap-4 hover:bg-white/5 transition-colors"
      >
        <span className="text-sm font-medium text-white">{item.q}</span>
        <span className="flex-shrink-0 text-primary-400">
          {isOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
        </span>
      </button>
      {isOpen && (
        <div className="px-6 pb-5 border-t border-white/5">
          <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-line pt-4">
            {item.a}
          </p>
        </div>
      )}
    </div>
  )
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">

        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-xs font-semibold text-primary-400 uppercase tracking-widest">Help Centre</span>
          <h1 className="text-4xl font-bold text-white mt-3 mb-3">Frequently Asked Questions</h1>
          <p className="text-gray-400 text-sm">
            Can't find your answer?{' '}
            <Link to="/contact" className="text-primary-400 hover:text-primary-300 transition-colors">
              Contact our team
            </Link>
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {FAQS.map((item, i) => (
            <FAQItem
              key={i}
              item={item}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </div>

        {/* Still have questions */}
        <div className="mt-10 glass-card p-6 text-center border border-primary-500/20">
          <p className="text-sm text-gray-300 mb-4">Still have a question not answered here?</p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-xl font-medium text-sm transition-all"
          >
            Get in Touch
          </Link>
        </div>

      </div>
    </PublicLayout>
  )
}
