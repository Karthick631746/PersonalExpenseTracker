import { ReactNode, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  WalletCards,
  Target,
  PieChart,
  Tags,
  CalendarClock,
  Settings,
  LogOut,
  CreditCard,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/Auth';

const nav = [
  ['/dashboard', 'Dashboard', LayoutDashboard],
  ['/transactions', 'Transactions', Receipt],
  ['/budgets', 'Budgets', WalletCards],
  ['/milestones', 'Milestones', Target],
  ['/credit-cards', 'Credit Cards', CreditCard],
  ['/analytics', 'Analytics', PieChart],
  ['/categories', 'Categories', Tags],
  ['/upcoming', 'Upcoming', CalendarClock],
  ['/settings', 'Settings', Settings],
] as const;

const mobileNav = nav.slice(0, 5);

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const go = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    go('/login');
  };

  const initial = user?.name?.[0]?.toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-ink text-white flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 border-r border-[#1e2130] p-4 flex-col fixed h-screen bg-ink-3 z-30">
        <div className="text-xl font-black mb-8 px-3 py-2">
          Fin<span style={{ color: '#8b5cf6' }}>Track</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {nav.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[#1e2130] pt-4 mt-4">
          <div className="flex items-center gap-3 px-3 mb-3">
            <div
              className="w-8 h-8 rounded-full grid place-items-center text-sm font-bold flex-shrink-0"
              style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd' }}
            >
              {initial}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-semibold truncate">{user?.name}</div>
              <div className="text-xs muted truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="sidebar-link w-full"
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        >
          <aside
            className="w-64 h-full bg-ink-3 border-r border-[#1e2130] p-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div className="text-xl font-black">
                Fin<span style={{ color: '#8b5cf6' }}>Track</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="btn btn-ghost btn-icon">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 space-y-1">
              {nav.map(([to, label, Icon]) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'active' : ''}`
                  }
                >
                  <Icon size={17} />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="border-t border-[#1e2130] pt-4">
              <button onClick={handleLogout} className="sidebar-link w-full">
                <LogOut size={17} />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="w-full md:ml-60 pb-24 md:pb-8 min-h-screen">
        {/* Top header */}
        <header
          className="sticky top-0 z-20 flex justify-between items-center px-5 md:px-8 py-4 border-b border-[#1e2130]"
          style={{ background: 'rgba(8,9,13,0.9)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-center gap-3">
            <button
              className="md:hidden btn btn-ghost btn-icon"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div className="md:hidden text-lg font-black">
              Fin<span style={{ color: '#8b5cf6' }}>Track</span>
            </div>
            <div className="hidden md:block text-sm muted">Personal Finance Dashboard</div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full grid place-items-center text-sm font-bold"
              style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd' }}
            >
              {initial}
            </div>
            <span className="hidden sm:block text-sm font-medium">{user?.name}</span>
          </div>
        </header>

        {/* Page content */}
        <section className="p-5 md:p-8 max-w-7xl mx-auto">
          {children}
        </section>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="mobile-nav md:hidden">
        {mobileNav.map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors ${
                isActive ? 'text-violet-300' : 'text-gray-500'
              }`
            }
          >
            <Icon size={20} />
            <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
