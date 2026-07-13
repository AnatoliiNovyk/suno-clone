import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { CreatePage } from './pages/CreatePage';
import { AdvancedPage } from './pages/AdvancedPage';
import { LibraryPage } from './pages/LibraryPage';
import { PricingPage } from './pages/PricingPage';
import { PaymentPage } from './pages/PaymentPage';
import { HubPage } from './pages/HubPage';
import { AdminRoute } from './components/admin/AdminRoute';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-neutral-900 text-neutral-50 font-body">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/create" element={<CreatePage />} />
              <Route path="/advanced" element={<AdvancedPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/payment" element={<PaymentPage />} />
              <Route path="/hub" element={<HubPage />} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminLayout />
                  </AdminRoute>
                }
              >
                <Route index element={<AdminDashboardPage />} />
              </Route>
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
