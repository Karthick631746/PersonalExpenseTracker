import { ReactNode, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, Landmark, ClipboardCheck, Menu,
  CreditCard, Target, Wallet, CalendarClock, Tags, BarChart3,
  Settings, LogOut, X, Bell, ChevronRight,
  Coins, Building2, ListChecks, Plus,
} from 'lucide-react';
import { useAuth } from '../context/Auth';
import QuickAdd from './QuickAdd';

/* ── Desktop sidebar nav ─────────────────────────── */
const sidebarNav = [
  ['/dashboard',    'Dashboard',     LayoutDashboard],
  ['/transactions', 'Transactions',  ArrowLeftRight],
  ['/accounts',     'Accounts',      Building2],
  ['/debit-cards',  'Debit Cards',   Landmark],
  ['/credit-cards', 'Credit Cards',  CreditCard],
  ['/budgets',      'Budgets',       Wallet],
  ['/milestones',   'Milestones',    Target],
  ['/gold',         'Gold',          Coins],
  ['/monthly-todo', 'Monthly To-Do', ListChecks],
  ['/analytics',    'Analytics',     BarChart3],
  ['/upcoming',     'Upcoming',      CalendarClock],
  ['/categories',   'Categories',    Tags],
  ['/settings',     'Settings',      Settings],
] as const;

/* ── Mobile bottom nav (primary 4 + More) ────────── */
const bottomNav = [
  { to: '/dashboard',    label: 'Home',     Icon: LayoutDashboard },
  { to: '/transactions', label: 'Transfers', Icon: ArrowLeftRight },
  { to: '/accounts',     label: 'Accounts', Icon: Building2 },
  { to: '/monthly-todo', label: 'To-Do',    Icon: ClipboardCheck },
] as const;

/* ── More menu items ─────────────────────────────── */
const moreItems = [
  { to: '/credit-cards', label: 'Credit Cards',  Icon: CreditCard,     color: '#f59e0b' },
  { to: '/debit-cards',  label: 'Debit Cards',   Icon: Landmark,       color: '#8b5cf6' },
  { to: '/milestones',   label: 'Milestones',    Icon: Target,         color: '#22c55e' },
  { to: '/budgets',      label: 'Budgets',       Icon: Wallet,         color: '#0ea5e9' },
  { to: '/upcoming',     label: 'Upcoming',      Icon: CalendarClock,  color: '#f43f5e' },
  { to: '/categories',   label: 'Categories',    Icon: Tags,           color: '#ec4899' },
  { to: '/gold',         label: 'Gold',          Icon: Coins,          color: '#d4af37' },
  { to: '/analytics',    label: 'Analytics',     Icon: BarChart3,      color: '#8b5cf6' },
  { to: '/settings',     label: 'Settings',      Icon: Settings,       color: '#8b92a5' },
] as const;

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/transactions': 'Transactions',
  '/accounts':     'Accounts',
  '/debit-cards':  'Debit Cards',
  '/credit-cards': 'Credit Cards',
  '/budgets':      'Budgets',
  '/milestones':   'Milestones',
  '/monthly-todo': 'Monthly To-Do',
  '/analytics':    'Analytics',
  '/upcoming':     'Upcoming',
  '/categories':   'Categories',
  '/gold':         'Gold',
  '/settings':     'Settings',
};

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const go = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const handleLogout = async () => { await logout(); go('/login'); };
  const initial = user?.name?.[0]?.toUpperCase() || '?';
  const currentTitle = PAGE_TITLES[location.pathname] || 'FinTrack';

  // Is "More" section active?
  const moreActive = moreItems.some(({ to }) => location.pathname === to);

  return (
    <div className="min-h-screen bg-ink text-white flex">

      {/* ── Desktop sidebar ──────────────────────────── */}
      <aside className="hidden md:flex w-60 border-r border-[#1e2130] p-4 flex-col fixed h-screen bg-ink-3 z-30">
        <div className="text-xl font-black mb-8 px-3 py-2">
          Fin<span style={{ color: '#8b5cf6' }}>Track</span>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {sidebarNav.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
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
          <button onClick={handleLogout} className="sidebar-link w-full">
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Mobile drawer overlay ─────────────────────── */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        >
          <aside
            className="w-72 h-full bg-ink-3 border-r border-[#1e2130] p-4 flex flex-col"
            style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
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

            <div className="flex items-center gap-3 px-2 mb-6 py-3 rounded-2xl" style={{ background: 'rgba(139,92,246,0.08)' }}>
              <div
                className="w-10 h-10 rounded-full grid place-items-center font-bold flex-shrink-0"
                style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd' }}
              >
                {initial}
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-semibold truncate">{user?.name}</div>
                <div className="text-xs muted truncate">{user?.email}</div>
              </div>
            </div>

            <nav className="flex-1 space-y-0.5 overflow-y-auto">
              {sidebarNav.map(([to, label, Icon]) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
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

      {/* ── More bottom sheet ─────────────────────────── */}
      {moreOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-51 sheet slide-up" style={{ zIndex: 51 }}>
            <div className="sheet-handle" />
            <div className="px-5 py-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">More</h2>
                <button onClick={() => setMoreOpen(false)} className="btn btn-ghost btn-icon">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-1">
                {moreItems.map(({ to, label, Icon, color }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      `settings-row rounded-xl ${isActive ? 'bg-[rgba(139,92,246,0.08)]' : ''}`
                    }
                    style={{ borderBottom: 'none' }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0"
                      style={{ background: `${color}20` }}
                    >
                      <Icon size={18} style={{ color }} />
                    </div>
                    <span className="flex-1 text-sm font-medium">{label}</span>
                    <ChevronRight size={16} className="muted" />
                  </NavLink>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-[#1e2130]">
                <button
                  onClick={handleLogout}
                  className="settings-row w-full rounded-xl"
                  style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)', borderBottom: 'none' }}
                >
                  <div className="w-9 h-9 rounded-xl grid place-items-center" style={{ background: 'rgba(244,63,94,0.15)' }}>
                    <LogOut size={18} style={{ color: '#f43f5e' }} />
                  </div>
                  <span className="flex-1 text-sm font-medium" style={{ color: '#f43f5e' }}>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Main content ──────────────────────────────── */}
      <main className="w-full md:ml-60 min-h-screen">

        {/* Mobile header */}
        <header className="mobile-header md:hidden">
          <div className="flex items-center gap-3">
            <button className="btn btn-ghost btn-icon" onClick={() => setSidebarOpen(true)} aria-label="Menu">
              <Menu size={22} />
            </button>
            <span className="text-base font-bold">
              Fin<span style={{ color: '#8b5cf6' }}>Track</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuickAddOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold"
              style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd' }}
              aria-label="Quick add"
            >
              <Plus size={15} />
              Add
            </button>
            <div
              className="w-8 h-8 rounded-full grid place-items-center text-sm font-bold"
              style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd' }}
            >
              {initial}
            </div>
          </div>
        </header>

        {/* Desktop header */}
        <header
          className="hidden md:flex sticky top-0 z-20 justify-between items-center px-8 py-4 border-b border-[#1e2130]"
          style={{ background: 'rgba(8,9,13,0.92)', backdropFilter: 'blur(12px)' }}
        >
          <div className="text-sm muted">Personal Finance Dashboard</div>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full grid place-items-center text-sm font-bold"
              style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd' }}
            >
              {initial}
            </div>
            <span className="text-sm font-medium">{user?.name}</span>
          </div>
        </header>

        {/* Page content */}
        <section className="page-content">
          {children}
        </section>
      </main>

      {/* ── Mobile bottom navigation ──────────────────── */}
      <nav className="mobile-nav md:hidden">
        {bottomNav.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className="mobile-nav-item"
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={22}
                  style={{ color: isActive ? '#a78bfa' : '#636878' }}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#a78bfa' : '#636878',
                  }}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {/* More button */}
        <button
          className="mobile-nav-item"
          onClick={() => setMoreOpen(true)}
          aria-label="More"
        >
          <Menu
            size={22}
            style={{ color: moreActive ? '#a78bfa' : '#636878' }}
            strokeWidth={moreActive ? 2.2 : 1.8}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: moreActive ? 700 : 500,
              color: moreActive ? '#a78bfa' : '#636878',
            }}
          >
            More
          </span>
        </button>
      </nav>

      {/* Global QuickAdd (from header + button) */}
      <QuickAdd
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onDone={() => {}}
      />
    </div>
  );
}
