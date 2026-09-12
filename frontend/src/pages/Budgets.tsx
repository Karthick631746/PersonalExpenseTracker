import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import {
  money, formatDate, daysBetween, daysRemaining, daysElapsed,
  getBudgetStatus, budgetStatusLabel, budgetStatusColor, budgetStatusBg, pct,
} from '../lib/utils';
import CategoryIcon from '../components/CategoryIcon';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import { Plus, Pencil, Trash2, Calendar, TrendingUp } from 'lucide-react';

const defaultForm = {
  name: '',
  categoryId: '',
  amount: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
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

  return (
    <div className="fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Budgets</h1>
          <p className="muted text-sm mt-1">{budgets.length} budget{budgets.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> Add Budget
        </button>
      </div>

      {/* Summary row */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total Budgeted', value: totalBudget, color: '#8b5cf6' },
            { label: 'Total Spent', value: totalSpent, color: '#f43f5e' },
            { label: 'Total Remaining', value: totalRemaining, color: '#22c55e' },
          ].map(({ label, value, color }) => (
            <div className="stat-card text-center" key={label}>
              <div className="text-xs muted uppercase tracking-wide mb-2">{label}</div>
              <div className="text-xl font-bold" style={{ color }}>{money(value)}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-56 rounded-2xl" />)}
        </div>
      ) : budgets.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">📋</div>
          <div className="font-semibold mb-1">No budgets yet</div>
          <div className="muted text-sm mb-5">Create budgets to control your spending.</div>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={14} /> Create first budget
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

            return (
              <div key={b._id} className="card card-hover p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <CategoryIcon
                      icon={cat?.icon || 'Circle'}
                      color={cat?.color || '#6b7280'}
                      size={18}
                      bgSize={40}
                    />
                    <div>
                      <div className="font-semibold text-sm">{b.name}</div>
                      <div className="text-xs muted">{cat?.name || 'Category'}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn btn-ghost btn-icon" onClick={() => openEdit(b)}>
                      <Pencil size={13} />
                    </button>
                    <button className="btn btn-danger btn-icon" onClick={() => setDeleteId(b._id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Amounts */}
                <div className="flex justify-between items-baseline mb-3">
                  <div>
                    <div className="text-2xl font-bold">{money(spent)}</div>
                    <div className="text-xs muted mt-0.5">spent of {money(b.amount)}</div>
                  </div>
                  <span
                    className="badge"
                    style={{ background: statusBg, color: statusColor }}
                  >
                    {budgetStatusLabel[status]}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="progress-track mb-2">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(progress, 100)}%`,
                      background: statusColor,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs muted mb-4">
                  <span>{progress}% used</span>
                  <span>{overBudget ? `${money(spent - b.amount)} over` : `${money(remaining)} left`}</span>
                </div>

                {/* Dates & days */}
                <div
                  className="rounded-xl p-3 space-y-2"
                  style={{ background: '#0d0f16' }}
                >
                  <div className="flex items-center gap-2 text-xs muted">
                    <Calendar size={12} />
                    <span>
                      {formatDate(b.startDate)} → {formatDate(b.endDate)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="muted">Days elapsed / Total</span>
                    <span className="font-medium">{elapsed} / {totalDays}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="muted">Days remaining</span>
                    <span
                      className="font-semibold"
                      style={{ color: daysLeft <= 3 ? '#f43f5e' : daysLeft <= 7 ? '#f59e0b' : '#eef0f6' }}
                    >
                      {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {!overBudget && daysLeft > 0 && (
                    <div className="flex justify-between text-xs pt-2 border-t border-[#1e2130]">
                      <span className="muted flex items-center gap-1"><TrendingUp size={11} /> Daily budget</span>
                      <span className="font-semibold" style={{ color: '#22c55e' }}>
                        {money(dailyAvailable)}/day
                      </span>
                    </div>
                  )}
                  {overBudget && (
                    <div className="text-xs text-center pt-2 border-t border-[#1e2130]" style={{ color: '#f43f5e' }}>
                      ⚠ Budget exceeded by {money(spent - b.amount)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
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
              className="text-xs rounded-lg px-3 py-2"
              style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}
            >
              📅 {daysBetween(form.startDate, form.endDate)} day budget period
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update Budget' : 'Create Budget'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteId} title="Delete Budget" onClose={() => setDeleteId(null)} size="sm">
        <p className="muted text-sm mb-6">Delete this budget? This cannot be undone.</p>
        <div className="flex gap-3">
          <button className="btn btn-secondary flex-1" onClick={() => setDeleteId(null)}>Cancel</button>
          <button className="btn btn-danger flex-1" onClick={doDelete}>Delete</button>
        </div>
      </Modal>
    </div>
  );
}
