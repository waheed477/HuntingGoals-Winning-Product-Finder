import PublicLayout from '../components/PublicLayout.jsx'

const SECTIONS = [
  {
    title: '1. Information We Collect',
    content: `We collect information you provide directly to us, such as when you create an account, update your profile, or contact us for support. This includes:

• **Account information**: Name, email address, and password (hashed and never stored in plain text).
• **Profile data**: Business preferences, selected product categories, city, and platform preferences.
• **Usage data**: Pages visited, features used, search queries, and product alerts configured.
• **Device information**: Browser type, IP address, and operating system for security and analytics purposes.
• **Google OAuth data** (if you sign in with Google): Your Google account's name, email, and profile picture.`,
  },
  {
    title: '2. How We Use Your Information',
    content: `We use the information we collect to:

• Provide, maintain, and improve our services.
• Personalize your experience and deliver relevant product intelligence.
• Send product alerts and notifications you have subscribed to.
• Send transactional emails such as password reset codes and account confirmations.
• Detect and prevent fraud, abuse, and security incidents.
• Comply with legal obligations and enforce our Terms of Service.
• Analyze usage patterns to improve the platform (aggregated and anonymized).`,
  },
  {
    title: '3. Data Storage & Security',
    content: `Your data is stored on secure servers with industry-standard encryption at rest and in transit (TLS 1.2+). We implement the following safeguards:

• Passwords are hashed using bcrypt with a minimum work factor of 10.
• API access tokens are signed JSON Web Tokens (JWT) with expiration.
• Database access is restricted to application services only.
• We perform regular security reviews and dependency audits.

We retain your data for as long as your account is active or as needed to provide services. You may request deletion at any time (see Your Rights below).`,
  },
  {
    title: '4. Third-Party Services',
    content: `We use the following third-party services that may process your data:

• **MongoDB Atlas** (or in-memory in development): Database storage.
• **Google OAuth**: If you choose to sign in with Google, your authentication is handled by Google LLC under their Privacy Policy.
• **Nodemailer / Gmail SMTP**: Used to deliver email notifications and alerts.
• **Groq AI**: Product analysis prompts may include product names and category data. No personally identifiable information (PII) is sent.

We do not sell, rent, or share your personal data with advertisers or unaffiliated third parties.`,
  },
  {
    title: '5. Your Rights (GDPR / CCPA)',
    content: `Depending on your location, you may have the following rights:

• **Access**: Request a copy of the personal data we hold about you (GDPR export available in Profile → Account Settings).
• **Correction**: Update or correct inaccurate data in your profile settings.
• **Deletion**: Request deletion of your account and all associated data from Profile → Account Settings → Delete Account.
• **Portability**: Export your data in JSON format at any time.
• **Objection**: Object to certain types of processing, such as direct marketing.
• **Withdrawal of consent**: Withdraw consent for data processing where consent is the legal basis.

To exercise any right not available in-app, contact us at support@huntinggoals.com.`,
  },
  {
    title: '6. Cookies',
    content: `We use minimal, essential cookies and browser storage:

• **Authentication token**: Stored in localStorage to maintain your session.
• **Preferences**: Theme and UI preferences stored in localStorage (no cross-site tracking).

We do not use advertising cookies or third-party tracking cookies.`,
  },
  {
    title: '7. Contact',
    content: `For privacy-related inquiries, please contact us at:

**Email**: support@huntinggoals.com
**Response time**: Within 48 business hours
**Location**: Pakistan

This Privacy Policy was last updated on 1 June 2025.`,
  },
]

export default function PrivacyPolicy() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <span className="text-xs font-semibold text-primary-400 uppercase tracking-widest">Legal</span>
          <h1 className="text-3xl font-bold text-white mt-2 mb-3">Privacy Policy</h1>
          <p className="text-gray-400 text-sm">
            Last updated: 1 June 2025 &nbsp;·&nbsp; Effective: 1 June 2025
          </p>
          <p className="text-gray-300 mt-4 leading-relaxed">
            Hunting Goals (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting your personal information
            and your right to privacy. This Privacy Policy explains how we collect, use, and
            safeguard your information when you use our platform.
          </p>
        </div>

        <div className="space-y-8">
          {SECTIONS.map((s) => (
            <div key={s.title} className="glass-card p-6">
              <h2 className="text-base font-semibold text-white mb-3">{s.title}</h2>
              <div className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">
                {s.content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                  part.startsWith('**') && part.endsWith('**')
                    ? <strong key={i} className="text-gray-200 font-medium">{part.slice(2, -2)}</strong>
                    : part
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  )
}
