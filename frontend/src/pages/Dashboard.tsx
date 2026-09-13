import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { money, formatShortDate, pct } from '../lib/utils';
import CategoryIcon from '../components/CategoryIcon';
import QuickAdd from '../components/QuickAdd';
import TransferModal from '../components/TransferModal';
import {
  TrendingUp, TrendingDown, Wallet, CreditCard, Target,
  ArrowUpRight, ArrowDownRight, ChevronRight, Plus,
  Building2, ArrowLeftRight, Zap,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/Auth';

const PERIODS = [
  { label: 'Month',      value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'This Year',  value: 'this_year' },
  { label: 'All Time',   value: 'all' },
];

const COLORS = ['#8b5cf6','#22c55e','#f59e0b','#ef4444','#06b6d4','#ec4899','#a3e635','#fb923c'];

function TrendBadge({ pct: p }: { pct: number | null }) {
  if (p === null) return <span className="text-xs muted">—</span>;
  const up = p >= 0;
  return (
    <span className="text-xs flex items-center gap-0.5" style={{ color: up ? '#22c55e' : '#f43f5e' }}>
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(p)}%
    </span>
  );
}

function SectionHeader({ title, to }: { title: string; to?: string }) {
  return (
    <div className="section-header">
      <h2 className="section-title">{title}</h2>
      {to && (
        <Link to={to} className="text-xs flex items-center gap-1 font-medium" style={{ color: '#8b5cf6' }}>
          See all <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('this_month');
  const [summary, setSummary] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [catSpending, setCatSpending] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'income'|'expense'|'credit_card_payment'|undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t, c, a] = await Promise.all([
        api.get(`/analytics/summary?period=${period}`),
        api.get('/analytics/monthly-trend?months=6'),
        api.get(`/analytics/categories?period=${period}`),
        api.get('/accounts'),
      ]);
      setSummary(s.data);
      setTrend(t.data);
      setCatSpending(c.data.slice(0, 8));
      setAccounts(a.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const savings     = summary ? summary.income - summary.expense : 0;
  const savingsRate = summary?.income > 0
    ? Math.round((savings / summary.income) * 1000) / 10 : 0;

  const hour        = new Date().getHours();
  const greeting    = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName   = user?.name?.split(' ')[0] || '';

  if (loading && !summary) {
    return (
      <div className="fade-in">
        <div className="skeleton h-6 w-48 mb-2 rounded-xl" />
        <div className="skeleton h-12 w-40 mb-6 rounded-xl" />
        <div className="grid grid-cols-2 gap-3 mb-5">
          {Array(4).fill(0).map((_,i)=><div key={i} className="skeleton h-24 rounded-2xl"/>)}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">

      {/* ── Hero section ──────────────────────────────── */}
      <div className="balance-hero mb-5">
        <div className="text-sm muted font-medium mb-1">{greeting}, {firstName} 👋</div>
        <div className="balance-label">Total Balance</div>
        <div className="balance-amount" style={{ color: '#eef0f6' }}>
          {money(summary?.totalAccountBalance ?? 0)}
        </div>
      </div>

      {/* ── Period selector ───────────────────────────── */}
      <div className="pill-tabs mb-5">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            className={`pill-tab ${period === p.value ? 'active' : ''}`}
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Summary stat cards ────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { label: 'Income',   value: summary?.income   || 0, color: '#22c55e', Icon: TrendingUp,   trend: summary?.incomePct  ?? null },
          { label: 'Expenses', value: summary?.expense   || 0, color: '#f43f5e', Icon: TrendingDown, trend: summary?.expensePct ?? null },
          { label: 'CC Debt',  value: summary?.creditCards?.totalDebt || 0, color: '#f59e0b', Icon: CreditCard, trend: null },
          { label: 'Goals',    value: summary?.milestones?.saved || 0, color: '#8b5cf6', Icon: Target, trend: null },
        ].map(({ label, value, color, Icon, trend: t }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <span className="muted text-xs font-semibold uppercase tracking-wide">{label}</span>
              <div className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: `${color}20` }}>
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <div className="text-lg font-bold mb-0.5">{money(Math.abs(value))}</div>
            <TrendBadge pct={t} />
          </div>
        ))}
      </div>

      {/* ── Savings summary ───────────────────────────── */}
      <div className="card p-4 mb-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="section-title">Savings</h2>
          <span
            className="badge"
            style={{
              background: savingsRate >= 20 ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
              color: savingsRate >= 20 ? '#22c55e' : '#f59e0b',
            }}
          >
            {savingsRate}% Rate
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-base font-bold" style={{ color: '#22c55e' }}>{money(summary?.income || 0)}</div>
            <div className="text-xs muted mt-0.5">Income</div>
          </div>
          <div>
            <div className="text-base font-bold" style={{ color: '#f43f5e' }}>{money(summary?.expense || 0)}</div>
            <div className="text-xs muted mt-0.5">Spent</div>
          </div>
          <div>
            <div className="text-base font-bold" style={{ color: savings >= 0 ? '#8b5cf6' : '#f43f5e' }}>
              {money(Math.abs(savings))}
            </div>
            <div className="text-xs muted mt-0.5">{savings >= 0 ? 'Saved' : 'Deficit'}</div>
          </div>
        </div>
      </div>

      {/* ── Accounts strip ────────────────────────────── */}
      {accounts.length > 0 && (
        <div className="mb-5">
          <SectionHeader title="Accounts" to="/accounts" />
          <div className="grid grid-cols-2 gap-3">
            {accounts.slice(0, 4).map((acc: any) => (
              <div
                key={acc._id}
                className="card p-4"
                style={{
                  background: `linear-gradient(135deg, ${acc.color || '#8b5cf6'}18, ${acc.color || '#8b5cf6'}08)`,
                  borderColor: `${acc.color || '#8b5cf6'}30`,
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl grid place-items-center flex-shrink-0"
                    style={{ background: `${acc.color || '#8b5cf6'}25` }}>
                    <Building2 size={14} style={{ color: acc.color || '#8b5cf6' }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{acc.accountName}</div>
                    <div className="text-xs muted truncate">{acc.bankName || acc.accountType}</div>
                  </div>
                </div>
                <div className="text-base font-bold" style={{ color: acc.balance >= 0 ? '#eef0f6' : '#f43f5e' }}>
                  {money(acc.balance)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Budget status ─────────────────────────────── */}
      {(summary?.budgetCount ?? 0) > 0 && (
        <div className="card p-4 mb-5">
          <SectionHeader title="Budget Status" to="/budgets" />
          <div className="grid grid-cols-3 gap-2 text-center mb-3">
            <div>
              <div className="text-base font-bold">{money(summary?.totalBudget || 0)}</div>
              <div className="text-xs muted mt-0.5">Budgeted</div>
            </div>
            <div>
              <div className="text-base font-bold" style={{ color: '#f59e0b' }}>{money(summary?.totalBudgetSpent || 0)}</div>
              <div className="text-xs muted mt-0.5">Spent</div>
            </div>
            <div>
              <div className="text-base font-bold" style={{ color: '#22c55e' }}>{money(summary?.totalBudgetRemaining || 0)}</div>
              <div className="text-xs muted mt-0.5">Remaining</div>
            </div>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${pct(summary?.totalBudgetSpent || 0, summary?.totalBudget || 1)}%`,
                background: pct(summary?.totalBudgetSpent || 0, summary?.totalBudget || 1) >= 90 ? '#ef4444' : '#8b5cf6',
              }}
            />
          </div>
          <div className="text-xs muted mt-2 text-right">
            {pct(summary?.totalBudgetSpent || 0, summary?.totalBudget || 1)}% used
          </div>
        </div>
      )}

      {/* ── Milestones ────────────────────────────────── */}
      {summary?.milestones?.target > 0 && (
        <div className="card p-4 mb-5">
          <SectionHeader title="Savings Goals" to="/milestones" />
          <div className="flex justify-between items-baseline mb-3">
            <div className="text-2xl font-bold">{money(summary.milestones.saved)}</div>
            <div className="muted text-sm">of {money(summary.milestones.target)}</div>
          </div>
          <div className="progress-track mb-2">
            <div
              className="progress-fill"
              style={{
                width: `${pct(summary.milestones.saved, summary.milestones.target)}%`,
                background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
              }}
            />
          </div>
          <div className="text-xs muted">
            {pct(summary.milestones.saved, summary.milestones.target)}% of goals reached
          </div>
        </div>
      )}

      {/* ── Income vs Expenses chart ──────────────────── */}
      {trend.length > 0 && (
        <div className="card p-4 mb-5">
          <SectionHeader title="Income vs Expenses" />
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} barGap={3} margin={{ left: -20, right: 4, top: 4, bottom: 0 }}>
                <CartesianGrid stroke="#1e2130" vertical={false} />
                <XAxis dataKey="month" stroke="#636878" fontSize={10} tick={{ fill: '#636878' }} />
                <YAxis stroke="#636878" fontSize={10} tick={{ fill: '#636878' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#0d0f16', border: '1px solid #252836', borderRadius: 10, fontSize: 12 }}
                  formatter={(v: number) => [money(v), '']}
                />
                <Bar dataKey="income"  name="Income"   fill="#22c55e" radius={[4,4,0,0]} />
                <Bar dataKey="expense" name="Expenses" fill="#f43f5e" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Spending by category ──────────────────────── */}
      {catSpending.length > 0 && (
        <div className="card p-4 mb-5">
          <SectionHeader title="Spending by Category" to="/analytics" />
          <div className="flex gap-3">
            <div style={{ width: 120, height: 120, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={catSpending} dataKey="value" nameKey="name" innerRadius={32} outerRadius={52} paddingAngle={2}>
                    {catSpending.map((c, i) => (
                      <Cell key={i} fill={c.color || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0d0f16', border: '1px solid #252836', borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number) => [money(v), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2 overflow-hidden">
              {catSpending.slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: c.color || COLORS[i % COLORS.length] }} />
                    <span className="text-xs truncate">{c.name}</span>
                  </div>
                  <span className="text-xs font-semibold flex-shrink-0">{money(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Recent transactions ───────────────────────── */}
      <div className="mb-5">
        <SectionHeader title="Recent Transactions" to="/transactions" />
        {!summary?.recentTransactions?.length ? (
          <div className="card p-8 text-center">
            <div className="muted text-sm mb-3">No transactions yet.</div>
            <Link to="/transactions" className="btn btn-primary text-sm" style={{ padding: '10px 20px' }}>
              <Plus size={14} /> Add your first
            </Link>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {summary.recentTransactions.map((t: any) => {
              const cat = t.categoryId;
              const isIncome = t.type === 'income';
              return (
                <div key={t._id} className="tx-card">
                  <CategoryIcon icon={cat?.icon || 'Circle'} color={cat?.color || '#6b7280'} size={16} bgSize={38} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.description}</div>
                    <div className="text-xs muted mt-0.5 truncate">
                      {cat?.name || 'Uncategorized'} · {formatShortDate(t.date)}
                    </div>
                  </div>
                  <div
                    className="text-sm font-bold flex-shrink-0"
                    style={{ color: isIncome ? '#22c55e' : '#f43f5e' }}
                  >
                    {isIncome ? '+' : '−'}{money(t.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Quick action buttons (mobile) ────────────────── */}
      <div className="md:hidden mb-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { setQuickAddType('expense'); setQuickAddOpen(true); }}
            className="btn py-4 flex flex-col items-center gap-2 text-sm"
            style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)', color: '#f43f5e', borderRadius: 16 }}
          >
            <TrendingDown size={22} />
            <span className="font-bold">Add Expense</span>
          </button>
          <button
            onClick={() => { setQuickAddType('income'); setQuickAddOpen(true); }}
            className="btn py-4 flex flex-col items-center gap-2 text-sm"
            style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e', borderRadius: 16 }}
          >
            <TrendingUp size={22} />
            <span className="font-bold">Add Income</span>
          </button>
          <button
            onClick={() => { setTransferOpen(true); }}
            className="btn py-3 flex items-center justify-center gap-2 text-sm"
            style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)', color: '#0ea5e9', borderRadius: 16 }}
          >
            <ArrowLeftRight size={18} />
            <span className="font-semibold">Transfer</span>
          </button>
          <button
            onClick={() => { setQuickAddType('credit_card_payment'); setQuickAddOpen(true); }}
            className="btn py-3 flex items-center justify-center gap-2 text-sm"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', borderRadius: 16 }}
          >
            <CreditCard size={18} />
            <span className="font-semibold">CC Payment</span>
          </button>
        </div>
      </div>

      {/* ── Desktop FAB ───────────────────────────────── */}
      <div
        className="hidden md:flex fixed bottom-8 right-8 flex-col gap-2 z-30"
        style={{ alignItems: 'flex-end' }}
      >
        <div className="flex gap-2 flex-wrap justify-end">
          <button
            onClick={() => setTransferOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold shadow-lg transition-all hover:scale-105"
            style={{ background: 'rgba(59,130,246,0.9)', color: '#fff' }}
          >
            <ArrowLeftRight size={15} /> Transfer
          </button>
          <button
            onClick={() => { setQuickAddType('credit_card_payment'); setQuickAddOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold shadow-lg transition-all hover:scale-105"
            style={{ background: 'rgba(245,158,11,0.9)', color: '#fff' }}
          >
            <CreditCard size={15} /> CC Pay
          </button>
          <button
            onClick={() => { setQuickAddType('expense'); setQuickAddOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold shadow-lg transition-all hover:scale-105"
            style={{ background: 'rgba(244,63,94,0.9)', color: '#fff' }}
          >
            <TrendingDown size={15} /> Expense
          </button>
          <button
            onClick={() => { setQuickAddType('income'); setQuickAddOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold shadow-lg transition-all hover:scale-105"
            style={{ background: 'rgba(34,197,94,0.9)', color: '#fff' }}
          >
            <TrendingUp size={15} /> Income
          </button>
        </div>
        <div className="flex items-center gap-1 text-xs muted justify-end">
          <Zap size={10} /> Quick Add
        </div>
      </div>

      <QuickAdd
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onDone={load}
        defaultType={quickAddType}
      />
      <TransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        onDone={load}
      />
    </div>
  );
}
