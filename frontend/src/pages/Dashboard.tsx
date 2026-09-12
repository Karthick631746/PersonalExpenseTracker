import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { money, formatShortDate, pct } from '../lib/utils';
import CategoryIcon from '../components/CategoryIcon';
import {
  TrendingUp, TrendingDown, Wallet, CreditCard, Target,
  ArrowUpRight, ArrowDownRight, Minus, ChevronRight, Plus
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/Auth';

const PERIODS = [
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'This Year', value: 'this_year' },
  { label: 'All Time', value: 'all' },
];

const COLORS = ['#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#a3e635', '#fb923c'];

function TrendBadge({ pct: p }: { pct: number | null }) {
  if (p === null) return <span className="text-xs muted">No prev. data</span>;
  const up = p >= 0;
  return (
    <span
      className="text-xs flex items-center gap-0.5"
      style={{ color: up ? '#22c55e' : '#f43f5e' }}
    >
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(p)}% vs prev
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('this_month');
  const [summary, setSummary] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [catSpending, setCatSpending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t, c] = await Promise.all([
        api.get(`/analytics/summary?period=${period}`),
        api.get('/analytics/monthly-trend?months=6'),
        api.get(`/analytics/categories?period=${period}`),
      ]);
      setSummary(s.data);
      setTrend(t.data);
      setCatSpending(c.data.slice(0, 8));
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const savings = summary ? summary.income - summary.expense : 0;
  const savingsRate = summary?.income > 0
    ? Math.round((savings / summary.income) * 1000) / 10
    : 0;

  const statCards = [
    {
      label: 'Balance',
      value: savings,
      icon: Wallet,
      color: savings >= 0 ? '#22c55e' : '#f43f5e',
      trend: null as null | number,
      prefix: savings < 0 ? '-' : '',
    },
    {
      label: 'Income',
      value: summary?.income || 0,
      icon: TrendingUp,
      color: '#22c55e',
      trend: summary?.incomePct ?? null,
      prefix: '',
    },
    {
      label: 'Expenses',
      value: summary?.expense || 0,
      icon: TrendingDown,
      color: '#f43f5e',
      trend: summary?.expensePct ?? null,
      prefix: '',
    },
    {
      label: 'Card Debt',
      value: summary?.creditCards?.totalDebt || 0,
      icon: CreditCard,
      color: '#f59e0b',
      trend: null,
      prefix: '',
    },
    {
      label: 'Goals Saved',
      value: summary?.milestones?.saved || 0,
      icon: Target,
      color: '#8b5cf6',
      trend: null,
      prefix: '',
    },
  ];

  if (loading && !summary) {
    return (
      <div>
        <div className="mb-6">
          <div className="skeleton h-8 w-64 mb-2" />
          <div className="skeleton h-4 w-40" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          {Array(5).fill(0).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Good to see you, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="muted mt-1 text-sm">Here's your financial snapshot.</p>
        </div>
        <div className="flex gap-1 tab-list" style={{ background: '#0d0f16', maxWidth: 360 }}>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              className={`tab ${period === p.value ? 'active' : ''}`}
              onClick={() => setPeriod(p.value)}
              style={{ fontSize: 12, padding: '7px 12px' }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {statCards.map(({ label, value, icon: Icon, color, trend: t, prefix }) => (
          <div className="stat-card" key={label}>
            <div className="flex items-center justify-between mb-3">
              <span className="muted text-xs font-medium uppercase tracking-wide">{label}</span>
              <div
                className="w-8 h-8 rounded-lg grid place-items-center"
                style={{ background: `${color}20` }}
              >
                <Icon size={15} style={{ color }} />
              </div>
            </div>
            <div
              className="text-xl font-bold mb-1"
              style={{ color: label === 'Balance' && savings < 0 ? '#f43f5e' : undefined }}
            >
              {prefix}{money(Math.abs(value))}
            </div>
            <TrendBadge pct={t} />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        {/* Monthly trend */}
        <div className="card p-5 lg:col-span-2">
          <div className="font-semibold mb-4">Income vs Expenses</div>
          {trend.length === 0 ? (
            <div className="h-56 grid place-items-center muted text-sm">
              No data available. Add transactions to see trends.
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} barGap={4}>
                  <CartesianGrid stroke="#1e2130" vertical={false} />
                  <XAxis dataKey="month" stroke="#636878" fontSize={11} tick={{ fill: '#636878' }} />
                  <YAxis stroke="#636878" fontSize={11} tick={{ fill: '#636878' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: '#0d0f16', border: '1px solid #252836', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: number) => [money(v), '']}
                  />
                  <Bar dataKey="income" name="Income" fill="#22c55e" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="expense" name="Expenses" fill="#f43f5e" radius={[5, 5, 0, 0]} />
                  <Legend formatter={(v) => <span style={{ color: '#8b92a5', fontSize: 12 }}>{v}</span>} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Category spending pie */}
        <div className="card p-5">
          <div className="font-semibold mb-4">Spending by Category</div>
          {catSpending.length === 0 ? (
            <div className="h-56 grid place-items-center muted text-sm text-center">
              No expenses yet.<br />Add transactions to see breakdown.
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={catSpending}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {catSpending.map((c, i) => (
                      <Cell key={i} fill={c.color || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0d0f16', border: '1px solid #252836', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: number) => [money(v), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {/* Category legend */}
          <div className="space-y-2 mt-2 max-h-36 overflow-y-auto">
            {catSpending.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: c.color || COLORS[i % COLORS.length] }}
                  />
                  <span className="text-xs truncate">{c.name}</span>
                </div>
                <span className="text-xs muted flex-shrink-0">{money(c.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Recent transactions */}
        <div className="card p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Recent Transactions</h2>
            <Link
              to="/transactions"
              className="text-xs flex items-center gap-1"
              style={{ color: '#8b5cf6' }}
            >
              View all <ChevronRight size={13} />
            </Link>
          </div>

          {!summary?.recentTransactions?.length ? (
            <div className="text-center py-8">
              <div className="muted text-sm mb-3">No transactions yet.</div>
              <Link to="/transactions" className="btn btn-primary text-sm" style={{ padding: '8px 16px' }}>
                <Plus size={14} /> Add your first
              </Link>
            </div>
          ) : (
            <div>
              {summary.recentTransactions.map((t: any) => {
                const cat = t.categoryId;
                return (
                  <div key={t._id} className="tx-row">
                    <CategoryIcon
                      icon={cat?.icon || 'Circle'}
                      color={cat?.color || '#6b7280'}
                      size={16}
                      bgSize={36}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{t.description}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs muted">{cat?.name || 'Uncategorized'}</span>
                        <span className="text-xs muted">·</span>
                        <span className="text-xs muted">{formatShortDate(t.date)}</span>
                        {t.creditCardId && (
                          <>
                            <span className="text-xs muted">·</span>
                            <span className="text-xs muted">
                              {t.creditCardId.cardName} ···{t.creditCardId.last4}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div
                      className="text-sm font-semibold flex-shrink-0"
                      style={{ color: t.type === 'income' ? '#22c55e' : '#f43f5e' }}
                    >
                      {t.type === 'income' ? '+' : '-'}{money(t.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Savings rate + budgets + milestones */}
        <div className="space-y-5">
          {/* Savings summary */}
          <div className="card p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">Savings Overview</h2>
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
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-lg font-bold" style={{ color: '#22c55e' }}>{money(summary?.income || 0)}</div>
                <div className="text-xs muted mt-1">Income</div>
              </div>
              <div>
                <div className="text-lg font-bold" style={{ color: '#f43f5e' }}>{money(summary?.expense || 0)}</div>
                <div className="text-xs muted mt-1">Spent</div>
              </div>
              <div>
                <div className="text-lg font-bold" style={{ color: savings >= 0 ? '#8b5cf6' : '#f43f5e' }}>
                  {money(Math.abs(savings))}
                </div>
                <div className="text-xs muted mt-1">{savings >= 0 ? 'Saved' : 'Deficit'}</div>
              </div>
            </div>
          </div>

          {/* Budget overview */}
          <div className="card p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">Budget Status</h2>
              <Link to="/budgets" className="text-xs" style={{ color: '#8b5cf6' }}>
                Manage →
              </Link>
            </div>
            {summary?.budgetCount === 0 ? (
              <div className="text-center py-4">
                <div className="muted text-sm mb-2">No budgets yet.</div>
                <Link to="/budgets" className="text-sm" style={{ color: '#8b5cf6' }}>Create your first budget →</Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 text-center mb-4">
                  <div>
                    <div className="text-lg font-bold">{money(summary?.totalBudget || 0)}</div>
                    <div className="text-xs muted mt-1">Budgeted</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold" style={{ color: '#f59e0b' }}>{money(summary?.totalBudgetSpent || 0)}</div>
                    <div className="text-xs muted mt-1">Spent</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold" style={{ color: '#22c55e' }}>{money(summary?.totalBudgetRemaining || 0)}</div>
                    <div className="text-xs muted mt-1">Remaining</div>
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
                  {pct(summary?.totalBudgetSpent || 0, summary?.totalBudget || 1)}% used across {summary?.budgetCount} budget{summary?.budgetCount !== 1 ? 's' : ''}
                </div>
              </>
            )}
          </div>

          {/* Milestones */}
          <div className="card p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">Savings Goals</h2>
              <Link to="/milestones" className="text-xs" style={{ color: '#8b5cf6' }}>
                Manage →
              </Link>
            </div>
            {!summary?.milestones?.target ? (
              <div className="text-center py-4">
                <div className="muted text-sm mb-2">No milestones yet.</div>
                <Link to="/milestones" className="text-sm" style={{ color: '#8b5cf6' }}>Set a savings goal →</Link>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-baseline mb-3">
                  <div className="text-2xl font-bold">{money(summary.milestones.saved)}</div>
                  <div className="muted text-sm">of {money(summary.milestones.target)}</div>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${pct(summary.milestones.saved, summary.milestones.target)}%`,
                      background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
                    }}
                  />
                </div>
                <div className="text-xs muted mt-2">
                  {pct(summary.milestones.saved, summary.milestones.target)}% of all savings goals reached
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
