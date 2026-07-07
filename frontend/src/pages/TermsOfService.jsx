import PublicLayout from '../components/PublicLayout.jsx'

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    content: `By accessing or using Hunting Goals ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service.

These Terms constitute a legally binding agreement between you ("User") and Hunting Goals ("Company", "we", "us", or "our"). We reserve the right to update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms.`,
  },
  {
    title: '2. Description of Service',
    content: `Hunting Goals is a product intelligence platform designed for Pakistani e-commerce sellers. The Service provides:

• Product trend analysis and Win Score rankings.
• Facebook and Instagram ad intelligence data.
• City-specific demand insights across Pakistan.
• AI-powered product analysis and profit estimation.
• Automated alerts for winning products.

The Service is provided on an "as-is" basis and is subject to change without notice.`,
  },
  {
    title: '3. User Accounts',
    content: `To access the Service, you must create an account. You agree to:

• Provide accurate, current, and complete information during registration.
• Maintain and promptly update your account information.
• Keep your password secure and confidential.
• Notify us immediately of any unauthorized use of your account.
• Be responsible for all activity that occurs under your account.

You must be at least 18 years old to create an account. Accounts are for individual use only and may not be shared or transferred.`,
  },
  {
    title: '4. Acceptable Use',
    content: `You agree NOT to use the Service to:

• Scrape, crawl, or extract data from the platform through automated means beyond normal use.
• Reverse-engineer, decompile, or attempt to derive the source code of the platform.
• Use the Service for any unlawful purpose or in violation of Pakistani law.
• Upload or transmit malware, viruses, or any malicious code.
• Interfere with or disrupt the integrity or performance of the Service.
• Attempt to gain unauthorized access to other users' accounts or data.
• Resell or commercially exploit our data without written permission.`,
  },
  {
    title: '5. Data Ownership',
    content: `You retain ownership of any data you input into the platform (e.g., alerts, preferences).

Product intelligence data, Win Scores, ad intelligence, trend analysis, and AI-generated reports are proprietary to Hunting Goals and are licensed to you for personal business use only. You may not redistribute, republish, or sell this data without our written consent.`,
  },
  {
    title: '6. Intellectual Property',
    content: `All content, features, and functionality of the Service — including but not limited to text, graphics, logos, icons, and software — are the exclusive property of Hunting Goals and are protected by Pakistani and international copyright, trademark, and other intellectual property laws.

Nothing in these Terms grants you any right to use our trademarks, logos, or brand names.`,
  },
  {
    title: '7. Disclaimer of Warranties',
    content: `THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.

We do not warrant that:
• The Service will be uninterrupted, secure, or error-free.
• Product intelligence data is 100% accurate, complete, or up-to-date.
• Results obtained from the Service will meet your expectations.
• Profit estimates or Win Scores guarantee commercial success.`,
  },
  {
    title: '8. Limitation of Liability',
    content: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, HUNTING GOALS AND ITS DIRECTORS, EMPLOYEES, OR AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS OR DATA, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.

Our total liability to you for any cause shall not exceed the amount you paid us in the 3 months preceding the claim.`,
  },
  {
    title: '9. Termination',
    content: `We reserve the right to suspend or terminate your account at any time, with or without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.

You may terminate your account at any time from Profile → Account Settings → Delete Account. Upon termination, your right to use the Service ceases immediately and we will delete your data in accordance with our Privacy Policy.`,
  },
  {
    title: '10. Changes to Terms',
    content: `We may modify these Terms at any time. We will notify you of material changes via email or an in-app notice at least 7 days before the changes take effect. Your continued use of the Service after the effective date of the revised Terms constitutes acceptance.`,
  },
  {
    title: '11. Governing Law',
    content: `These Terms shall be governed by and construed in accordance with the laws of the Islamic Republic of Pakistan, without regard to its conflict-of-law provisions. Any disputes shall be subject to the exclusive jurisdiction of courts in Lahore, Pakistan.`,
  },
  {
    title: '12. Contact',
    content: `For legal inquiries regarding these Terms, please contact:

**Email**: support@huntinggoals.com
**Response time**: Within 48 business hours

These Terms of Service were last updated on 1 June 2025.`,
  },
]

export default function TermsOfService() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <span className="text-xs font-semibold text-primary-400 uppercase tracking-widest">Legal</span>
          <h1 className="text-3xl font-bold text-white mt-2 mb-3">Terms of Service</h1>
          <p className="text-gray-400 text-sm">
            Last updated: 1 June 2025 &nbsp;·&nbsp; Effective: 1 June 2025
          </p>
          <p className="text-gray-300 mt-4 leading-relaxed">
            Please read these Terms carefully before using Hunting Goals. By using our Service,
            you confirm that you have read, understood, and agreed to these Terms.
          </p>
        </div>

        <div className="space-y-6">
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
