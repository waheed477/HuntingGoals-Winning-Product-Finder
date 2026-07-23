import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import VerifyEmail from './pages/VerifyEmail.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ProductHunt from './pages/ProductHunt.jsx'
import CityExplorer from './pages/CityExplorer.jsx'
import Trends from './pages/Trends.jsx'
import AdSpy from './pages/AdSpy.jsx'
import Profile from './pages/Profile.jsx'
import Notifications from './pages/Notifications.jsx'
import Layout from './components/Layout.jsx'
import useStore from './store/useStore.js'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import TermsOfService from './pages/TermsOfService.jsx'
import About from './pages/About.jsx'
import Contact from './pages/Contact.jsx'
import FAQ from './pages/FAQ.jsx'

function ProtectedRoute({ children }) {
  const user = useStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return children
}

function SessionValidator() {
  const user = useStore((s) => s.user)
  const validateSession = useStore((s) => s.validateSession)

  useEffect(() => {
    if (user?.token) {
      validateSession()
    }
  }, [])

  return null
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SessionValidator />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e1e3f',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <Layout><ProductHunt /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/city-explorer"
          element={
            <ProtectedRoute>
              <Layout><CityExplorer /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/trends"
          element={
            <ProtectedRoute>
              <Layout><Trends /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ad-spy"
          element={
            <ProtectedRoute>
              <Layout><AdSpy /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout><Profile /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Layout><Notifications /></Layout>
            </ProtectedRoute>
          }
        />
        {/* Public info pages */}
        <Route path="/privacy-policy"  element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/about"           element={<About />} />
        <Route path="/contact"         element={<Contact />} />
        <Route path="/faq"             element={<FAQ />} />

        <Route path="/city-explorer" element={<Navigate to="/dashboard" replace />} />
        <Route path="/trends"        element={<Navigate to="/dashboard" replace />} />
        <Route path="/ai-analyst"    element={<Navigate to="/dashboard" replace />} />
        <Route path="/alerts"        element={<Navigate to="/profile"   replace />} />
        <Route path="/seasonal"      element={<Navigate to="/dashboard" replace />} />
        <Route path="/scheduler"     element={<Navigate to="/dashboard" replace />} />
        <Route path="/tiktok-trends" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
