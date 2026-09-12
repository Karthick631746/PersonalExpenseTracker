import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { money, pct } from '../lib/utils';
import CategoryIcon from '../components/CategoryIcon';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts';
import { TrendingUp, TrendingDown, PieChart as PieIcon, BarChart3 } from 'lucide-react';

const PERIODS = [
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'This Year', value: 'this_year' },
  { label: 'All Time', value: 'all' },
];
const COLORS = ['#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#a3e635', '#fb923c', '#0ea5e9', '#84cc16'];

export function Analytics() {
  const [period, setPeriod] = useState('this_month');
  const [summary, setSummary] = useState<any>(null);
  const [catData, setCatData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c, t] = await Promise.all([
        api.get(`/analytics/summary?period=${period}`),
        api.get(`/analytics/categories?period=${period}`),
        api.get('/analytics/monthly-trend?months=12'),
      ]);
      setSummary(s.data);
      setCatData(c.data);
      setTrendData(t.data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const savingsRate = summary?.income > 0
    ? Math.round(((summary.income - summary.expense) / summary.income) * 1000) / 10
    : 0;
  const creditUtil = summary?.creditCards?.limit > 0
    ? pct(summary.creditCards.totalDebt, summary.creditCards.limit)
    : 0;
  const goalProgress = summary?.milestones?.target > 0
    ? pct(summary.milestones.saved, summary.milestones.target)
    : 0;

  const statCards = [
    { label: 'Savings Rate', value: `${savingsRate}%`, color: savingsRate >= 20 ? '#22c55e' : '#f59e0b', icon: TrendingUp },
    { label: 'Credit Utilization', value: `${creditUtil}%`, color: creditUtil > 80 ? '#f43f5e' : creditUtil > 30 ? '#f59e0b' : '#22c55e', icon: TrendingDown },
    { label: 'Goal Progress', value: `${goalProgress}%`, color: '#8b5cf6', icon: PieIcon },
    { label: 'Income', value: money(summary?.income || 0), color: '#22c55e', icon: TrendingUp },
    { label: 'Expenses', value: money(summary?.expense || 0), color: '#f43f5e', icon: TrendingDown },
    { label: 'Balance', value: money(Math.abs(summary?.balance || 0)), color: (summary?.balance || 0) >= 0 ? '#8b5cf6' : '#f43f5e', icon: BarChart3 },
  ];

  return (
    <div className="fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="muted text-sm mt-1">Insights into your financial health.</p>
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

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        {statCards.map(({ label, value, color, icon: Icon }) => (
          <div className="stat-card" key={label}>
            <div className="flex items-center justify-between mb-3">
              <span className="muted text-xs uppercase tracking-wide">{label}</span>
              <Icon size={16} style={{ color }} />
            </div>
            <div className="text-2xl font-bold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        {/* Monthly trend */}
        <div className="card p-5">
          <h2 className="font-semibold mb-4">12-Month Income vs Expenses</h2>
          {trendData.length === 0 ? (
            <div className="h-64 grid place-items-center muted text-sm">No data available.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={trendData} barGap={4}>
                  <CartesianGrid stroke="#1e2130" vertical={false} />
                  <XAxis dataKey="month" stroke="#636878" fontSize={10} />
                  <YAxis stroke="#636878" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: '#0d0f16', border: '1px solid #252836', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: number) => [money(v), '']}
                  />
                  <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Legend formatter={(v) => <span style={{ color: '#8b92a5', fontSize: 11 }}>{v}</span>} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Spending by category pie */}
        <div className="card p-5">
          <h2 className="font-semibold mb-4">Spending Breakdown</h2>
          {catData.length === 0 ? (
            <div className="h-64 grid place-items-center muted text-sm text-center">
              No expenses for this period.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={catData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {catData.map((c, i) => (
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
        </div>
      </div>

      {/* Category breakdown table */}
      {catData.length > 0 && (
        <div className="card p-5 mb-5">
          <h2 className="font-semibold mb-4">Spending by Category</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={catData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid stroke="#1e2130" horizontal={false} />
                <XAxis type="number" stroke="#636878" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" stroke="#636878" fontSize={11} width={100} />
                <Tooltip
                  contentStyle={{ background: '#0d0f16', border: '1px solid #252836', borderRadius: 10, fontSize: 12 }}
                  formatter={(v: number) => [money(v), 'Spent']}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {catData.map((c, i) => (
                    <Cell key={i} fill={c.color || COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend with amounts */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {catData.map((c, i) => {
              const totalExpense = catData.reduce((s, x) => s + x.value, 0);
              const share = pct(c.value, totalExpense);
              return (
                <div key={i} className="flex items-center gap-3">
                  <CategoryIcon icon={c.icon || 'Circle'} color={c.color || COLORS[i % COLORS.length]} size={14} bgSize={30} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{c.name}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="progress-track flex-1" style={{ height: 3 }}>
                        <div
                          className="progress-fill"
                          style={{ width: `${share}%`, background: c.color || COLORS[i % COLORS.length] }}
                        />
                      </div>
                      <span className="text-xs muted flex-shrink-0">{share}%</span>
                    </div>
                  </div>
                  <div className="text-xs font-semibold flex-shrink-0">{money(c.value)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Savings trend */}
      {trendData.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold mb-4">Monthly Savings Trend</h2>
          <div className="h-48">
            <ResponsiveContainer>
              <LineChart data={trendData.map((d) => ({ ...d, savings: d.income - d.expense }))}>
                <CartesianGrid stroke="#1e2130" vertical={false} />
                <XAxis dataKey="month" stroke="#636878" fontSize={11} />
                <YAxis stroke="#636878" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#0d0f16', border: '1px solid #252836', borderRadius: 10, fontSize: 12 }}
                  formatter={(v: number) => [money(v), 'Savings']}
                />
                <Line
                  type="monotone"
                  dataKey="savings"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', strokeWidth: 0, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export function Upcoming() {
  const [recurring, setRecurring] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([api.get('/recurring'), api.get('/credit-cards')]).then(([r, c]) => {
      setRecurring(r.data);
      setCards(c.data);
    });
  }, []);

  const now = new Date();

  return (
    <div className="fade-in">
      <h1 className="text-2xl font-bold mb-2">Upcoming Payments</h1>
      <p className="muted mb-6 text-sm">Bills, subscriptions and card payments.</p>

      {/* Credit card due dates */}
      {cards.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide muted">Credit Card Payments</h2>
          <div className="card overflow-hidden">
            {cards.map((card, i) => {
              if (!card.dueDate) return null;
              const dueDay = card.dueDate;
              const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
              if (dueDate < now) dueDate.setMonth(dueDate.getMonth() + 1);
              const daysLeft = Math.round((dueDate.getTime() - now.getTime()) / 86_400_000);

              return (
                <div key={card._id} className="tx-row">
                  <div
                    className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0"
                    style={{ background: 'rgba(139,92,246,0.15)' }}
                  >
                    <span className="text-xs font-bold" style={{ color: '#8b5cf6' }}>CC</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{card.cardName} {card.last4 ? `···${card.last4}` : ''}</div>
                    <div className="text-xs muted">Due {dueDay}{['st','nd','rd'][((dueDay+90)%100-10)%10-1]||'th'} of every month</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: '#f43f5e' }}>
                      {money(card.outstandingBalance || 0)}
                    </div>
                    <div className="text-xs muted">{daysLeft} day{daysLeft !== 1 ? 's' : ''} away</div>
                  </div>
                </div>
              );
            }).filter(Boolean)}
          </div>
        </div>
      )}

      {/* Recurring transactions */}
      {recurring.length > 0 ? (
        <div>
          <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide muted">Recurring Transactions</h2>
          <div className="card overflow-hidden">
            {recurring.map((r) => {
              const cat = r.categoryId;
              return (
                <div key={r._id} className="tx-row">
                  <CategoryIcon icon={cat?.icon || 'RefreshCw'} color={cat?.color || '#8b5cf6'} size={15} bgSize={36} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{r.description}</div>
                    <div className="text-xs muted">
                      {r.frequency} · {cat?.name}
                      {r.nextDueDate && ` · Next: ${new Date(r.nextDueDate).toLocaleDateString('en-IN')}`}
                    </div>
                  </div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: r.type === 'income' ? '#22c55e' : '#f43f5e' }}
                  >
                    {r.type === 'income' ? '+' : '-'}{money(r.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card p-10 text-center muted">
          <div className="text-4xl mb-3">📅</div>
          <div className="font-semibold text-white mb-1">No upcoming payments</div>
          <div className="text-sm">Add recurring transactions or set card due dates to see upcoming payments.</div>
        </div>
      )}
    </div>
  );
}

export function Settings() {
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({ name: '', currency: 'INR' });
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPwd: '' });
  const [saving, setSaving] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/auth/me').then((x) => {
      setUser(x.data);
      setForm({ name: x.data.name, currency: x.data.currency || 'INR' });
    });
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(''); setErr('');
    try {
      await api.put('/auth/me', form);
      setMsg('Profile updated successfully.');
    } catch (e: any) {
      setErr(e.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPwd) return setErr('New passwords do not match');
    if (pwdForm.newPassword.length < 6) return setErr('New password must be at least 6 characters');
    setPwdSaving(true);
    setMsg(''); setErr('');
    try {
      await api.put('/auth/me/password', { currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword });
      setMsg('Password changed successfully.');
      setPwdForm({ currentPassword: '', newPassword: '', confirmPwd: '' });
    } catch (e: any) {
      setErr(e.response?.data?.message || 'Password change failed');
    } finally {
      setPwdSaving(false);
    }
  };

  const seedCategories = async () => {
    setSeeding(true);
    setMsg(''); setErr('');
    try {
      await api.post('/auth/seed-categories');
      setMsg('Default categories created. Check your Categories page.');
    } catch {
      setErr('Seeding failed');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="fade-in max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {msg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
          {msg}
        </div>
      )}
      {err && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' }}>
          {err}
        </div>
      )}

      {/* Profile */}
      <div className="card p-6 mb-4">
        <h2 className="font-semibold mb-4">Profile</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={user?.email || ''} readOnly style={{ opacity: 0.6 }} />
          </div>
          <div>
            <label className="label">Currency</label>
            <select
              className="input"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              <option value="INR">₹ INR — Indian Rupee</option>
              <option value="USD">$ USD — US Dollar</option>
              <option value="EUR">€ EUR — Euro</option>
              <option value="GBP">£ GBP — British Pound</option>
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="card p-6 mb-4">
        <h2 className="font-semibold mb-4">Change Password</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input
              className="input"
              type="password"
              value={pwdForm.currentPassword}
              onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              className="input"
              type="password"
              placeholder="At least 6 characters"
              value={pwdForm.newPassword}
              onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              className="input"
              type="password"
              value={pwdForm.confirmPwd}
              onChange={(e) => setPwdForm({ ...pwdForm, confirmPwd: e.target.value })}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={pwdSaving}>
            {pwdSaving ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Category seeding */}
      <div className="card p-6">
        <h2 className="font-semibold mb-2">Default Categories</h2>
        <p className="muted text-sm mb-4">
          If your default categories are missing, click below to restore them. This will not create duplicates.
        </p>
        <button className="btn btn-secondary" onClick={seedCategories} disabled={seeding}>
          {seeding ? 'Creating…' : 'Restore Default Categories'}
        </button>
      </div>
    </div>
  );
}
