🎯 Hunting Goals — AI-Powered Winning Product Finder

> **Find winning products before your competitors.**  
> Hunting Goals is a full-stack SaaS platform that analyzes real-time Facebook and Instagram ads to help Pakistani e-commerce sellers identify trending products with high profit potential.

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-in--memory%20%7C%20Atlas-brightgreen)](https://mongodb.com)

---

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔥 **Real-Time Ad Intelligence** | Scrapes Facebook & Instagram ads via Meta Ad Library |
| 🏆 **Win Score Engine** | Proprietary algorithm based on 4+ real ad signals |
| 🤖 **AI Product Analysis** | Groq AI generates profit estimates, ad copy (Urdu/English), and supplier links |
| 📱 **Real-Time Alerts** | WhatsApp (Green API) and Email notifications when products cross thresholds |
| 📊 **Seasonal Intelligence** | 650+ keywords across 5 seasons (Winter, Summer, Ramadan, Wedding, Back to School) |
| 🔐 **Authentication** | JWT-based auth + Google OAuth with session persistence |
| 🌓 **Dark/Light Mode** | User preference persists across sessions |
| 📱 **Responsive UI** | Optimized for mobile, tablet, and desktop |

---

## 🛠️ Tech Stack

### Frontend
- React 18 + Vite
- Tailwind CSS
- Socket.io-client (real-time updates)


### Backend
- Node.js + Express
- MongoDB (Atlas / Local)
- Puppeteer (ad scraping)
- Groq AI (product analysis)
- Socket.io (real-time events)
- Nodemailer (email alerts)
- Green API (WhatsApp alerts)

### Deployment
- Frontend: Netlify / Vercel
- Backend: Hugging Face Spaces / Render
- Database: MongoDB Atlas

---

## 🚀 Quick Start (3 Steps)

```bash
# 1. Clone the repository
git clone https://github.com/waheed477/HuntingGoals-Winning-Product-Finder.git
cd HuntingGoals-Winning-Product-Finder

# 2. Install all dependencies
npm run install:all

# 3. Run the application
npm run dev
Access:

Frontend: http://localhost:5000

Backend API: http://localhost:3001/api/health

⚙️ Environment Variables
Create backend/.env.local with the following:

env
# Required
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/trendspy
JWT_SECRET=your_super_secret_key_here

# Optional (full features)
GROQ_API_KEY=gsk_...                  # AI analysis
FB_SESSION_COOKIE=c_user=...; xs=... # Live ad scraping
EMAIL_USER=your_email@gmail.com      # Email alerts
EMAIL_PASS=your_app_password         # Gmail app password
GREEN_API_INSTANCE_ID=...            # WhatsApp alerts
GREEN_API_TOKEN=...                  # WhatsApp alerts
ADMIN_API_KEY=...                    # Admin access
ALERTS_ENABLED=true                  # Enable alert system
See backend/.env.example for a complete template.

📁 Project Structure
text
HuntingGoals-Winning-Product-Finder/
├── backend/
│   ├── server/          # Express server
│   ├── models/          # Mongoose schemas
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Auth, logging, rate limiting
│   ├── services/        # Business logic
│   ├── scrapers/        # Facebook/Instagram ad scrapers
│   ├── jobs/            # Cron jobs (scraping, alerts, digests)
│   └── Dockerfile       # Hugging Face deployment
├── frontend/
│   ├── src/
│   │   ├── pages/       # React pages
│   │   ├── components/  # Reusable components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── store/       # Zustand state management
│   │   └── api/         # API service layer
│   ├── public/          # Static assets
│   └── package.json
├── package.json         # Root scripts
└── README.md
🌟 Key Features in Detail
1. Win Score Engine
Combines 4+ real ad signals to score products (0–100):

Advertiser Diversity (40%) — Unique advertisers per product

Ad Volume (30%) — Total active ads

Longevity (20%) — Maximum days running

High Spend (10%) — Ads with "High" spend level

2. AI-Powered Product Analysis
Generates:

Profit calculator (buy price → sell price → margin)

Ad copy in English and Roman Urdu

Supplier recommendations

Seasonal relevance scores

3. Real-Time Alerts
WhatsApp: Instant notifications via Green API

Email: Daily digests and threshold alerts

In-App: Notification bell with unread counts

4. Ad Spy
Browse real Facebook/Instagram ads

Direct links to Meta Ad Library

Competitor tracking and spend analysis

🧪 Testing
bash
# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test
📄 License
MIT © 2025 Waheed Aslam

🤝 Contributing
Pull requests are welcome. For major changes, please open an issue first.

📬 Contact
Email: waheeddd62@gmail.com
GitHub: waheed477

🙏 Acknowledgments
Meta Ad Library — Ad data source

Groq — AI language model

Green API — WhatsApp integration

MongoDB Atlas — Cloud database

text
