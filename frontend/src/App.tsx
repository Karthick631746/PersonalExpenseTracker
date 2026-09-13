import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/Auth';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Categories from './pages/Categories';
import Budgets from './pages/Budgets';
import CreditCards from './pages/CreditCards';
import Milestones from './pages/Milestones';
import Gold from './pages/Gold';
import Accounts from './pages/Accounts';
import DebitCards from './pages/DebitCards';
import MonthlyTodo from './pages/MonthlyTodo';
import { Analytics, Upcoming, Settings } from './pages/Extra';
import { ToastProvider } from './components/Toast';
import './index.css';

function Private({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-ink grid place-items-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#1e2130] border-t-[#8b5cf6] rounded-full animate-spin" />
          <div className="text-sm font-semibold muted">Loading FinTrack…</div>
        </div>
      </div>
    );
  }
  
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Auth />} />
            <Route path="/register" element={<Auth register />} />
            
            <Route path="/*" element={
              <Private>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/accounts" element={<Accounts />} />
                  <Route path="/debit-cards" element={<DebitCards />} />
                  <Route path="/budgets" element={<Budgets />} />
                  <Route path="/milestones" element={<Milestones />} />
                  <Route path="/gold" element={<Gold />} />
                  <Route path="/credit-cards" element={<CreditCards />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/monthly-todo" element={<MonthlyTodo />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/upcoming" element={<Upcoming />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Private>
            } />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
