import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { money, formatDate, daysRemaining, pct } from '../lib/utils';
import { getIcon } from '../lib/icons';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import { Plus, Pencil, Trash2, Target, Calendar, TrendingUp } from 'lucide-react';

const defaultForm = {
  name: '',
  targetAmount: '',
  savedAmount: '0',
  targetDate: '',
  monthlyTarget: '',
  description: '',
  icon: 'Target',
  color: '#8b5cf6',
};

const defaultContrib = {
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  note: '',
};

const MILESTONE_ICONS = ['Target', 'Home', 'Car', 'Plane', 'GraduationCap', 'Heart', 'Gift', 'Wallet', 'TrendingUp', 'Shield'];
const MILESTONE_COLORS = ['#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#f97316', '#10b981'];

export default function Milestones() {
  const [milestones, setMilestones] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Contributions state
  const [viewingMilestone, setViewingMilestone] = useState<any>(null);
  const [contributions, setContributions] = useState<any[]>([]);
  const [contribForm, setContribForm] = useState(defaultContrib);
  const [contribSaving, setContribSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/milestones');
      setMilestones(res.data);
    } catch {
      toast('Failed to load milestones', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadContributions = async (milestoneId: string) => {
    const res = await api.get(`/milestones/${milestoneId}/contributions`);
    setContributions(res.data);
  };

  const openView = async (m: any) => {
    setViewingMilestone(m);
    setContribForm(defaultContrib);
    await loadContributions(m._id);
  };

  const openNew = () => {
    setEditing(null);
    setForm(defaultForm);
    setOpen(true);
  };

  const openEdit = (m: any) => {
    setEditing(m);
    setForm({
      name: m.name,
      targetAmount: String(m.targetAmount),
      savedAmount: String(m.savedAmount),
      targetDate: m.targetDate ? new Date(m.targetDate).toISOString().slice(0, 10) : '',
      monthlyTarget: String(m.monthlyTarget || ''),
      description: m.description || '',
      icon: m.icon || 'Target',
      color: m.color || '#8b5cf6',
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast('Name is required', 'error');
    if (!form.targetAmount || Number(form.targetAmount) <= 0) return toast('Target amount must be positive', 'error');

    setSaving(true);
    try {
      const body = {
        ...form,
        targetAmount: Number(form.targetAmount),
        savedAmount: Number(form.savedAmount) || 0,
        monthlyTarget: form.monthlyTarget ? Number(form.monthlyTarget) : undefined,
        targetDate: form.targetDate || undefined,
      };
      if (editing) {
        await api.put(`/milestones/${editing._id}`, body);
        toast('Milestone updated');
      } else {
        await api.post('/milestones', body);
        toast('Milestone created');
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
      await api.delete(`/milestones/${deleteId}`);
      toast('Milestone deleted');
      setDeleteId(null);
      load();
    } catch {
      toast('Delete failed', 'error');
    }
  };

  const addContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribForm.amount || Number(contribForm.amount) <= 0) return toast('Amount must be positive', 'error');

    setContribSaving(true);
    try {
      const res = await api.post(`/milestones/${viewingMilestone._id}/contributions`, {
        ...contribForm,
        amount: Number(contribForm.amount),
      });
      toast('Contribution added');
      setContribForm(defaultContrib);
      setViewingMilestone(res.data.milestone);
      await loadContributions(viewingMilestone._id);
      load();
    } catch {
      toast('Failed to add contribution', 'error');
    } finally {
      setContribSaving(false);
    }
  };

  const deleteContribution = async (cid: string) => {
    try {
      const res = await api.delete(`/milestones/${viewingMilestone._id}/contributions/${cid}`);
      toast('Contribution removed');
      if (res.data.milestone) setViewingMilestone(res.data.milestone);
      await loadContributions(viewingMilestone._id);
      load();
    } catch {
      toast('Delete failed', 'error');
    }
  };

  const totalTarget = milestones.reduce((s, m) => s + m.targetAmount, 0);
  const totalSaved = milestones.reduce((s, m) => s + m.savedAmount, 0);

  return (
    <div className="fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Savings Milestones</h1>
          <p className="muted text-sm mt-1">Track your savings goals.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> Add Milestone
        </button>
      </div>

      {/* Summary */}
      {milestones.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total Targets', value: totalTarget, color: '#8b5cf6' },
            { label: 'Total Saved', value: totalSaved, color: '#22c55e' },
            { label: 'Overall Progress', value: pct(totalSaved, totalTarget), color: '#f59e0b', suffix: '%' },
          ].map(({ label, value, color, suffix }) => (
            <div className="stat-card text-center" key={label}>
              <div className="text-xs muted uppercase tracking-wide mb-2">{label}</div>
              <div className="text-xl font-bold" style={{ color }}>
                {suffix ? `${value}${suffix}` : money(value)}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(2).fill(0).map((_, i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}
        </div>
      ) : milestones.length === 0 ? (
        <div className="card p-12 text-center">
          <Target size={48} className="mx-auto mb-4 muted" />
          <div className="font-semibold mb-1">No milestones yet</div>
          <div className="muted text-sm mb-5">Set a savings goal and track your progress.</div>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={14} /> Add Milestone
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {milestones.map((m) => {
            const progress = pct(m.savedAmount, m.targetAmount);
            const remaining = Math.max(0, m.targetAmount - m.savedAmount);
            const daysLeft = m.targetDate ? daysRemaining(m.targetDate) : null;
            const requiredMonthly = daysLeft !== null && daysLeft > 0
              ? (remaining / (daysLeft / 30.44)).toFixed(0)
              : null;
            const MIcon = getIcon(m.icon || 'Target');

            return (
              <div key={m._id} className="card card-hover p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl grid place-items-center flex-shrink-0"
                      style={{ background: `${m.color || '#8b5cf6'}20` }}
                    >
                      <MIcon size={20} style={{ color: m.color || '#8b5cf6' }} />
                    </div>
                    <div>
                      <div className="font-semibold">{m.name}</div>
                      <span
                        className="badge text-xs"
                        style={{
                          background: m.status === 'completed' ? 'rgba(34,197,94,0.15)' : 'rgba(139,92,246,0.15)',
                          color: m.status === 'completed' ? '#22c55e' : '#8b5cf6',
                        }}
                      >
                        {m.status === 'completed' ? '✓ Completed' : 'Active'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn btn-ghost btn-icon" onClick={() => openEdit(m)}><Pencil size={13} /></button>
                    <button className="btn btn-danger btn-icon" onClick={() => setDeleteId(m._id)}><Trash2 size={13} /></button>
                  </div>
                </div>

                {/* Amounts */}
                <div className="flex justify-between items-baseline mb-2">
                  <div className="text-2xl font-bold">{money(m.savedAmount)}</div>
                  <div className="muted text-sm">of {money(m.targetAmount)}</div>
                </div>

                {/* Progress bar */}
                <div className="progress-track mb-1">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, ${m.color || '#8b5cf6'}, ${m.color || '#8b5cf6'}cc)`,
                    }}
                  />
                </div>
                <div className="text-xs muted mb-4">{progress}% complete · {money(remaining)} remaining</div>

                {/* Dates */}
                <div className="rounded-xl p-3 space-y-1.5" style={{ background: '#0d0f16' }}>
                  {m.targetDate && (
                    <div className="flex justify-between text-xs">
                      <span className="muted flex items-center gap-1"><Calendar size={11} />Target date</span>
                      <span className="font-medium">{formatDate(m.targetDate)}</span>
                    </div>
                  )}
                  {daysLeft !== null && (
                    <div className="flex justify-between text-xs">
                      <span className="muted">Days remaining</span>
                      <span className="font-semibold" style={{ color: daysLeft <= 30 ? '#f43f5e' : '#eef0f6' }}>
                        {daysLeft === 0 ? 'Due today!' : `${daysLeft} days`}
                      </span>
                    </div>
                  )}
                  {requiredMonthly && m.status !== 'completed' && Number(remaining) > 0 && (
                    <div className="flex justify-between text-xs pt-1.5 border-t border-[#1e2130]">
                      <span className="muted flex items-center gap-1"><TrendingUp size={11} />Monthly needed</span>
                      <span className="font-semibold" style={{ color: '#22c55e' }}>
                        {money(Number(requiredMonthly))}/mo
                      </span>
                    </div>
                  )}
                </div>

                <button
                  className="btn btn-secondary w-full mt-3 text-sm"
                  onClick={() => openView(m)}
                >
                  <Plus size={13} /> Add Contribution
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Milestone Modal */}
      <Modal
        open={open}
        title={editing ? 'Edit Milestone' : 'New Milestone'}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input
              className="input"
              placeholder="e.g. Emergency Fund"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Target Amount *</label>
              <input
                className="input"
                type="number"
                placeholder="500000"
                min="1"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Already Saved</label>
              <input
                className="input"
                type="number"
                placeholder="0"
                min="0"
                value={form.savedAmount}
                onChange={(e) => setForm({ ...form, savedAmount: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Target Date</label>
              <input
                className="input"
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Monthly Target</label>
              <input
                className="input"
                type="number"
                placeholder="Optional"
                min="0"
                value={form.monthlyTarget}
                onChange={(e) => setForm({ ...form, monthlyTarget: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <input
              className="input"
              placeholder="What is this milestone for?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          {/* Color */}
          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 flex-wrap">
              {MILESTONE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c,
                    border: form.color === c ? '3px solid white' : '3px solid transparent',
                    cursor: 'pointer', outline: 'none',
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Create Milestone'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Contributions Modal */}
      <Modal
        open={!!viewingMilestone}
        title={viewingMilestone ? `${viewingMilestone.name} — Contributions` : ''}
        onClose={() => setViewingMilestone(null)}
        size="md"
      >
        {viewingMilestone && (
          <>
            {/* Progress summary */}
            <div className="card p-4 mb-5" style={{ background: '#0d0f16' }}>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold">{money(viewingMilestone.savedAmount)}</span>
                <span className="muted text-sm">of {money(viewingMilestone.targetAmount)}</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${pct(viewingMilestone.savedAmount, viewingMilestone.targetAmount)}%`,
                    background: viewingMilestone.color || '#8b5cf6',
                  }}
                />
              </div>
              <div className="text-xs muted mt-1">
                {pct(viewingMilestone.savedAmount, viewingMilestone.targetAmount)}% complete
              </div>
            </div>

            {/* Add contribution */}
            <form onSubmit={addContribution} className="flex gap-2 mb-5 flex-wrap">
              <input
                className="input"
                type="number"
                placeholder="Amount"
                min="1"
                style={{ flex: 1, minWidth: 100 }}
                value={contribForm.amount}
                onChange={(e) => setContribForm({ ...contribForm, amount: e.target.value })}
                required
              />
              <input
                className="input"
                type="date"
                style={{ flex: 1, minWidth: 140 }}
                value={contribForm.date}
                onChange={(e) => setContribForm({ ...contribForm, date: e.target.value })}
              />
              <button type="submit" className="btn btn-primary" disabled={contribSaving}>
                <Plus size={14} /> {contribSaving ? '…' : 'Add'}
              </button>
            </form>

            {/* Contributions list */}
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {contributions.length === 0 ? (
                <div className="text-center py-6 muted text-sm">No contributions yet.</div>
              ) : (
                contributions.map((c) => (
                  <div
                    key={c._id}
                    className="flex items-center justify-between py-2 px-3 rounded-xl"
                    style={{ background: '#0d0f16' }}
                  >
                    <div>
                      <div className="text-sm font-semibold" style={{ color: '#22c55e' }}>
                        +{money(c.amount)}
                      </div>
                      <div className="text-xs muted">{formatDate(c.date)}{c.note ? ` · ${c.note}` : ''}</div>
                    </div>
                    <button
                      className="btn btn-danger btn-icon"
                      style={{ padding: '5px' }}
                      onClick={() => deleteContribution(c._id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteId} title="Delete Milestone" onClose={() => setDeleteId(null)} size="sm">
        <p className="muted text-sm mb-6">Delete this milestone and all its contributions?</p>
        <div className="flex gap-3">
          <button className="btn btn-secondary flex-1" onClick={() => setDeleteId(null)}>Cancel</button>
          <button className="btn btn-danger flex-1" onClick={doDelete}>Delete</button>
        </div>
      </Modal>
    </div>
  );
}
