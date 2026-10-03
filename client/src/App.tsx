import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router'
import GuestOnly from './components/GuestOnly'
import PhoneFrame from './components/PhoneFrame'
import RequireAuth from './components/RequireAuth'
import AuthProvider from './context/AuthContext'
import ThemeProvider from './context/ThemeContext'
import ToastProvider from './context/ToastContext'
import AppLayout from './layouts/AppLayout'
import Advisor from './pages/Advisor'
import CreateAccount from './pages/auth/CreateAccount'
import EnterPin from './pages/auth/EnterPin'
import PhoneEntry from './pages/auth/PhoneEntry'
import VerifyOtp from './pages/auth/VerifyOtp'
import FundDetail from './pages/FundDetail'
import Funds from './pages/Funds'
import Home from './pages/Home'
import Onboarding from './pages/Onboarding'
import Transactions from './pages/Transactions'
import Pay from './pages/Pay'
import Portfolio from './pages/Portfolio'
import Profile from './pages/Profile'
import Setup from './pages/Setup'

/** Old /invest/:id links (bookmarks, earlier builds) now live at /funds/:id. */
function LegacyFundRedirect() {
  const { fundId } = useParams()
  return <Navigate to={`/funds/${fundId ?? ''}`} replace />
}

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
                  {/* Screens with the bottom tab bar */}
                  <Route element={<AppLayout />}>
                    <Route index element={<Home />} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/portfolio" element={<Portfolio />} />
                    <Route path="/advisor" element={<Advisor />} />
                    <Route path="/settings" element={<Profile />} />
                    <Route path="/funds" element={<Funds />} />
                  </Route>
                  {/* Full-screen flows */}
                  <Route path="/pay" element={<Pay />} />
                  <Route path="/funds/:fundId" element={<FundDetail />} />

                  {/* Old paths */}
                  <Route path="/invest" element={<Navigate to="/funds" replace />} />
                  <Route path="/invest/:fundId" element={<LegacyFundRedirect />} />
                  <Route path="/history" element={<Navigate to="/transactions" replace />} />
                  <Route path="/passbook" element={<Navigate to="/transactions" replace />} />
                  <Route path="/profile" element={<Navigate to="/settings" replace />} />
                  <Route path="/ai" element={<Navigate to="/advisor" replace />} />
                  <Route path="/goals" element={<Navigate to="/advisor" replace />} />
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
