import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import {
  money, formatDate, daysBetween, daysRemaining, daysElapsed,
  getBudgetStatus, budgetStatusLabel, budgetStatusColor, budgetStatusBg, pct,
} from '../lib/utils';
import CategoryIcon from '../components/CategoryIcon';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import {
  Plus, Pencil, Trash2, Calendar, TrendingUp,
  Wallet, AlertTriangle, CheckCircle2, Target,
} from 'lucide-react';

const defaultForm = {
  name: '',
  categoryId: '',
  amount: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
};

/** Map status → Lucide icon component */
const statusIcons = {
  healthy: CheckCircle2,
  watch: TrendingUp,
  critical: AlertTriangle,
  exceeded: AlertTriangle,
};

export default function Budgets() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, cRes] = await Promise.all([
        api.get('/budgets'),
        api.get('/categories?type=expense'),
      ]);
      setBudgets(bRes.data);
      setCategories(cRes.data);
    } catch {
      toast('Failed to load budgets', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm(defaultForm);
    setOpen(true);
  };

  const openEdit = (b: any) => {
    setEditing(b);
    setForm({
      name: b.name,
      categoryId: b.categoryId?._id || b.categoryId || '',
      amount: String(b.amount),
      startDate: new Date(b.startDate).toISOString().slice(0, 10),
      endDate: new Date(b.endDate).toISOString().slice(0, 10),
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast('Budget name is required', 'error');
    if (!form.categoryId) return toast('Category is required', 'error');
    if (!form.amount || Number(form.amount) <= 0) return toast('Amount must be positive', 'error');
    if (new Date(form.endDate) < new Date(form.startDate))
      return toast('End date must be after start date', 'error');

    setSaving(true);
    try {
      const body = { ...form, amount: Number(form.amount) };
      if (editing) {
        await api.put(`/budgets/${editing._id}`, body);
        toast('Budget updated');
      } else {
        await api.post('/budgets', body);
        toast('Budget created');
      }
      setOpen(false);
      load();
    } catch (e: any) {
      toast(e.response?.data?.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/budgets/${deleteId}`);
      toast('Budget deleted');
      setDeleteId(null);
      load();
    } catch {
      toast('Delete failed', 'error');
    }
  };

  // Summary stats
  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spentAmount || 0), 0);
  const totalRemaining = Math.max(0, totalBudget - totalSpent);
  const overallPct = pct(totalSpent, totalBudget);

  return (
    <div className="fade-in page-content pb-28">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-5 pt-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
          <p className="muted text-sm mt-0.5">
            {budgets.length} budget{budgets.length !== 1 ? 's' : ''} active
          </p>
        </div>
        {/* Desktop-only add button — on mobile we use FAB */}
        <button
          className="btn btn-primary hidden sm:flex"
          onClick={openNew}
        >
          <Plus size={16} /> Add Budget
        </button>
      </div>

      {/* ── Summary hero strip ── */}
      {budgets.length > 0 && !loading && (
        <div
          className="rounded-2xl p-4 mb-5"
          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(14,165,233,0.10) 100%)', border: '1px solid rgba(139,92,246,0.25)' }}
        >
          {/* Top row: total budgeted & spent */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Budgeted', value: totalBudget, color: '#8b5cf6', icon: Target },
              { label: 'Spent', value: totalSpent, color: '#f43f5e', icon: Wallet },
              { label: 'Remaining', value: totalRemaining, color: '#22c55e', icon: CheckCircle2 },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center text-center">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center mb-1.5"
                  style={{ background: `${color}22` }}
                >
                  <Icon size={14} style={{ color }} />
                </div>
                <div className="text-[11px] muted uppercase tracking-wider mb-0.5">{label}</div>
                <div className="text-base font-bold leading-tight" style={{ color }}>
                  {money(value)}
                </div>
              </div>
            ))}
          </div>

          {/* Overall progress bar */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="muted">Overall usage</span>
              <span className="font-semibold" style={{ color: overallPct >= 100 ? '#f43f5e' : overallPct >= 75 ? '#f59e0b' : '#22c55e' }}>
                {overallPct}%
              </span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(overallPct, 100)}%`,
                  background: overallPct >= 100
                    ? '#f43f5e'
                    : overallPct >= 75
                    ? 'linear-gradient(90deg,#f59e0b,#ef4444)'
                    : 'linear-gradient(90deg,#8b5cf6,#22c55e)',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Loading skeletons ── */}
      {loading ? (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="skeleton rounded-2xl" style={{ height: 180 }} />
          ))}
        </div>

      ) : budgets.length === 0 ? (
        /* ── Empty state ── */
        <div className="card flex flex-col items-center text-center p-10 mt-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(139,92,246,0.15)' }}
          >
            <Target size={32} style={{ color: '#8b5cf6' }} />
          </div>
          <div className="font-semibold text-lg mb-1">No budgets yet</div>
          <div className="muted text-sm mb-6 max-w-xs">
            Create budgets to track and control your spending by category.
          </div>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> Create first budget
          </button>
        </div>

      ) : (
        /* ── Budget cards list ── */
        <div className="space-y-3">
          {budgets.map((b) => {
            const cat = b.categoryId;
            const spent = b.spentAmount || 0;
            const remaining = Math.max(0, b.amount - spent);
            const progress = pct(spent, b.amount);
            const status = getBudgetStatus(spent, b.amount);
            const statusColor = budgetStatusColor[status];
            const statusBg = budgetStatusBg[status];
            const totalDays = daysBetween(b.startDate, b.endDate);
            const daysLeft = daysRemaining(b.endDate);
            const elapsed = daysElapsed(b.startDate);
            const dailyAvailable = daysLeft > 0 ? remaining / daysLeft : 0;
            const overBudget = spent > b.amount;
            const StatusIcon = statusIcons[status];

            // Days-left urgency color
            const daysLeftColor = daysLeft <= 3 ? '#f43f5e' : daysLeft <= 7 ? '#f59e0b' : '#a0a3b1';

            return (
              <div
                key={b._id}
                className="card slide-up"
                style={{ padding: 0, overflow: 'hidden' }}
              >
                {/* Colored top accent strip */}
                <div
                  className="h-1 w-full"
                  style={{ background: statusColor }}
                />

                <div className="p-4">
                  {/* ── Row 1: icon + name + badge + actions ── */}
                  <div className="flex items-start gap-3 mb-4">
                    <CategoryIcon
                      icon={cat?.icon || 'Circle'}
                      color={cat?.color || '#6b7280'}
                      size={20}
                      bgSize={44}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base leading-tight truncate">{b.name}</div>
                      <div className="text-xs muted mt-0.5">{cat?.name || 'Uncategorized'}</div>
                    </div>

                    {/* Status badge */}
                    <span
                      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                      style={{ background: statusBg, color: statusColor }}
                    >
                      <StatusIcon size={11} />
                      {budgetStatusLabel[status]}
                    </span>
                  </div>

                  {/* ── Row 2: Spent / Total amounts ── */}
                  <div className="flex items-baseline justify-between mb-3">
                    <div>
                      <span className="text-2xl font-bold">{money(spent)}</span>
                      <span className="text-sm muted ml-1.5">of {money(b.amount)}</span>
                    </div>
                    <div className="text-right">
                      <div
                        className="text-sm font-semibold"
                        style={{ color: overBudget ? '#f43f5e' : '#22c55e' }}
                      >
                        {overBudget
                          ? `+${money(spent - b.amount)} over`
                          : `${money(remaining)} left`}
                      </div>
                    </div>
                  </div>

                  {/* ── Row 3: Bold progress bar ── */}
                  <div className="mb-1">
                    <div
                      className="w-full rounded-full overflow-hidden"
                      style={{ height: 10, background: 'rgba(255,255,255,0.07)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(progress, 100)}%`,
                          background: overBudget
                            ? '#f43f5e'
                            : status === 'critical'
                            ? 'linear-gradient(90deg,#f59e0b,#ef4444)'
                            : status === 'watch'
                            ? '#f59e0b'
                            : `linear-gradient(90deg,${cat?.color || '#8b5cf6'},${statusColor})`,
                          boxShadow: `0 0 8px ${statusColor}55`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs muted mt-1.5">
                      <span>{progress}% used</span>
                      <span>{elapsed}/{totalDays} days</span>
                    </div>
                  </div>

                  {/* ── Row 4: Date range + days left info strip ── */}
                  <div
                    className="rounded-xl px-3 py-2.5 mt-3 space-y-2"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    {/* Date range */}
                    <div className="flex items-center gap-2 text-xs muted">
                      <Calendar size={12} />
                      <span>{formatDate(b.startDate)} → {formatDate(b.endDate)}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="muted">Days remaining</span>
                      <span className="font-semibold" style={{ color: daysLeftColor }}>
                        {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {!overBudget && daysLeft > 0 && (
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-[#1e2130]">
                        <span className="muted flex items-center gap-1">
                          <TrendingUp size={11} /> Daily allowance
                        </span>
                        <span className="font-semibold" style={{ color: '#22c55e' }}>
                          {money(dailyAvailable)}/day
                        </span>
                      </div>
                    )}

                    {overBudget && (
                      <div
                        className="flex items-center justify-center gap-1.5 text-xs pt-2 border-t border-[#1e2130] font-semibold"
                        style={{ color: '#f43f5e' }}
                      >
                        <AlertTriangle size={12} />
                        Exceeded by {money(spent - b.amount)}
                      </div>
                    )}
                  </div>

                  {/* ── Row 5: Edit / Delete action buttons ── */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-[#1e2130]">
                    <button
                      className="btn btn-secondary flex-1 gap-2 text-sm"
                      style={{ minHeight: 44 }}
                      onClick={() => openEdit(b)}
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      className="btn btn-danger flex-1 gap-2 text-sm"
                      style={{ minHeight: 44 }}
                      onClick={() => setDeleteId(b._id)}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FAB – mobile add button ── */}
      <button
        className="fab sm:hidden"
        onClick={openNew}
        aria-label="Add budget"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}
      >
        <Plus size={24} />
      </button>

      {/* ── Add / Edit Modal ── */}
      <Modal
        open={open}
        title={editing ? 'Edit Budget' : 'Add Budget'}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Budget Name *</label>
            <input
              className="input"
              placeholder="e.g. Monthly Food Budget"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Category *</label>
            <select
              className="input"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              required
            >
              <option value="">— Select expense category —</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Budget Amount *</label>
            <input
              className="input"
              type="number"
              placeholder="0"
              min="1"
              step="1"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date *</label>
              <input
                className="input"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">End Date *</label>
              <input
                className="input"
                type="date"
                value={form.endDate}
                min={form.startDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          {form.startDate && form.endDate && new Date(form.endDate) >= new Date(form.startDate) && (
            <div
              className="flex items-center gap-2 text-xs rounded-xl px-3 py-2.5"
              style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa' }}
            >
              <Calendar size={13} />
              {daysBetween(form.startDate, form.endDate)} day budget period
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="btn btn-secondary flex-1"
              style={{ minHeight: 48 }}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              style={{ minHeight: 48 }}
              disabled={saving}
            >
              {saving ? 'Saving…' : editing ? 'Update Budget' : 'Create Budget'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal open={!!deleteId} title="Delete Budget" onClose={() => setDeleteId(null)} size="sm">
        <div
          className="flex items-center justify-center w-14 h-14 rounded-2xl mx-auto mb-4"
          style={{ background: 'rgba(244,63,94,0.15)' }}
        >
          <Trash2 size={24} style={{ color: '#f43f5e' }} />
        </div>
        <p className="muted text-sm text-center mb-6">
          Delete this budget? All tracking data will be lost and this cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            className="btn btn-secondary flex-1"
            style={{ minHeight: 48 }}
            onClick={() => setDeleteId(null)}
          >
            Cancel
          </button>
          <button
            className="btn btn-danger flex-1"
            style={{ minHeight: 48 }}
            onClick={doDelete}
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
