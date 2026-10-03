import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import GuestOnly from './components/GuestOnly'
import PhoneFrame from './components/PhoneFrame'
import RequireAuth from './components/RequireAuth'
import AuthProvider from './context/AuthContext'
import ThemeProvider from './context/ThemeContext'
import ToastProvider from './context/ToastContext'
import AppLayout from './layouts/AppLayout'
import CreateAccount from './pages/auth/CreateAccount'
import EnterPin from './pages/auth/EnterPin'
import PhoneEntry from './pages/auth/PhoneEntry'
import VerifyOtp from './pages/auth/VerifyOtp'
import FundDetail from './pages/FundDetail'
import Goals from './pages/Goals'
import History from './pages/History'
import Home from './pages/Home'
import Invest from './pages/Invest'
import Onboarding from './pages/Onboarding'
import Pay from './pages/Pay'
import Profile from './pages/Profile'
import Setup from './pages/Setup'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <PhoneFrame>
            <ToastProvider>
              <Routes>
                <Route element={<GuestOnly />}>
                  <Route path="/welcome" element={<Onboarding />} />
                  <Route path="/login" element={<PhoneEntry />} />
                  <Route path="/login/otp" element={<VerifyOtp />} />
                  <Route path="/login/create" element={<CreateAccount />} />
                  <Route path="/login/pin" element={<EnterPin />} />
                </Route>

                <Route element={<RequireAuth />}>
                  <Route path="/setup" element={<Setup />} />
                  <Route element={<AppLayout />}>
                    <Route index element={<Home />} />
                    <Route path="/invest" element={<Invest />} />
                    <Route path="/goals" element={<Goals />} />
                    <Route path="/profile" element={<Profile />} />
                  </Route>
                  <Route path="/pay" element={<Pay />} />
                  <Route path="/invest/:fundId" element={<FundDetail />} />
                  <Route path="/history" element={<History />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ToastProvider>
          </PhoneFrame>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
