🎯 Hunting Goals — AI-Powered Winning Product Finder

> **Find winning products before your competitors.**  
> Hunting Goals is a full-stack SaaS platform that analyzes real-time Facebook and Instagram ads to help Pakistani e-commerce sellers identify trending products with high profit potential.

![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![React](https://img.shields.io/badge/React-18.x-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔥 **Real-Time Ad Intelligence** | Scrapes Facebook & Instagram ads via Meta Ad Library |
| 🏆 **Win Score Engine** | Proprietary algorithm based on 4+ real ad signals |
| 🤖 **AI Product Analysis** | Groq AI generates profit estimates, ad copy (Urdu/English), and supplier links |
| 📱 **Real-Time Alerts** | WhatsApp (Green API) and Email notifications when products cross thresholds |
| 📊 **Seasonal Intelligence** | 650+ keywords across 5 seasons |
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

## 🚀 Quick Start (Local Setup)

### Step 1: Clone the Repository


git clone https://github.com/waheed477/HuntingGoals-Winning-Product-Finder.git
cd HuntingGoals-Winning-Product-Finder
### Step 2: Install All Dependencies

npm run install:all
This installs dependencies for frontend, backend, and root in one command.

### Step 3: Set Up Environment Variables
Create a .env file inside the backend/ folder:

cd backend
cp .env.example .env
Then open .env and fill in the required values:


MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/trendspy
JWT_SECRET=your_super_secret_key_here
See backend/.env.example for all optional variables (AI, Alerts, WhatsApp, etc.).

### Step 4: Run the Application
From the root folder, run:

npm run dev

### Step 5: Access the Application
Service	URL
Frontend	http://localhost:5000
Backend API	http://localhost:3001/api/health


📁 Project Structure

HuntingGoals-Winning-Product-Finder/
├── backend/
│   ├── server/          # Express server
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── middleware/      # Auth, logging, rate limiting
│   ├── services/        # Business logic
│   ├── scrapers/        # Facebook/Instagram ad scrapers
│   ├── jobs/            # Cron jobs
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


### ⚙️ Environment Variables (Optional Features)
Variable	Purpose
GROQ_API_KEY	AI-powered product analysis
FB_SESSION_COOKIE	Live Facebook ad scraping
EMAIL_USER / EMAIL_PASS	Email alerts (Gmail)
GREEN_API_INSTANCE_ID / GREEN_API_TOKEN	WhatsApp alerts
ADMIN_API_KEY	Admin access
ALERTS_ENABLED	Enable alert system
If not set, the app runs with fallbacks (limited functionality).

🧪 Testing

# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
📄 License
MIT © 2025 Waheed Aslam

📬 Contact
Email: waheeddd62@gmail.com

GitHub: waheed477

🙏 Acknowledgments
Meta Ad Library — Ad data source

Groq — AI language model

Green API — WhatsApp integration

MongoDB Atlas — Cloud database
