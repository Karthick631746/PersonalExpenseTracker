import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { money } from '../lib/utils';
import CategoryIcon from '../components/CategoryIcon';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import { Plus, Pencil, Trash2, Palette } from 'lucide-react';
import { ICON_MAP } from '../lib/icons';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#ec4899', '#f43f5e', '#64748b', '#6b7280', '#92400e',
];

const ALL_ICONS = Object.keys(ICON_MAP);

const defaultForm = { name: '', type: 'expense', icon: 'Circle', color: '#8b5cf6' };

export default function Categories() {
  const [tab, setTab] = useState<'expense' | 'income'>('expense');
  const [categories, setCategories] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, { count: number; total: number }>>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...defaultForm, type: tab });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconSearch, setIconSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const [catRes, txRes] = await Promise.all([
        api.get('/categories'),
        api.get('/transactions?period=all&limit=500'),
      ]);

      setCategories(catRes.data);

      // Build stats from transactions
      const s: Record<string, { count: number; total: number }> = {};
      for (const tx of txRes.data.data || []) {
        const cid = tx.categoryId?._id || tx.categoryId;
        if (cid) {
          if (!s[cid]) s[cid] = { count: 0, total: 0 };
          s[cid].count++;
          s[cid].total += tx.amount;
        }
      }
      setStats(s);
    } catch {
      toast('Failed to load categories', 'error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const displayed = categories.filter((c) => c.type === tab);

  const openNew = () => {
    setEditing(null);
    setForm({ ...defaultForm, type: tab });
    setOpen(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({ name: c.name, type: c.type, icon: c.icon, color: c.color });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast('Name is required', 'error');

    setSaving(true);
    try {
      if (editing) {
        await api.put(`/categories/${editing._id}`, form);
        toast('Category updated');
      } else {
        await api.post('/categories', form);
        toast('Category created');
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
      await api.delete(`/categories/${deleteId}`);
      toast('Category deleted');
      setDeleteId(null);
      load();
    } catch {
      toast('Delete failed', 'error');
    }
  };

  const filteredIcons = iconSearch
    ? ALL_ICONS.filter((n) => n.toLowerCase().includes(iconSearch.toLowerCase()))
    : ALL_ICONS;

  return (
    <div className="fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="muted text-sm mt-1">Organise your transactions into categories.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> Add Category
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-list mb-5" style={{ maxWidth: 280 }}>
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'expense' ? '💸 Expenses' : '💰 Income'}
          </button>
        ))}
      </div>

      {/* Category grid */}
      {displayed.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-3">{tab === 'expense' ? '💸' : '💰'}</div>
          <div className="font-semibold mb-1">No {tab} categories yet</div>
          <div className="muted text-sm mb-4">Create categories to organise your transactions.</div>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={14} /> Add Category
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((c) => {
            const stat = stats[c._id];
            return (
              <div key={c._id} className="card card-hover p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <CategoryIcon icon={c.icon} color={c.color} size={20} bgSize={44} />
                    <div>
                      <div className="font-semibold text-sm">{c.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="badge"
                          style={{
                            background: c.type === 'expense' ? 'rgba(244,63,94,0.12)' : 'rgba(34,197,94,0.12)',
                            color: c.type === 'expense' ? '#f43f5e' : '#22c55e',
                          }}
                        >
                          {c.type}
                        </span>
                        {c.isDefault && (
                          <span className="badge" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn btn-ghost btn-icon" onClick={() => openEdit(c)} title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-danger btn-icon" onClick={() => setDeleteId(c._id)} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Color indicator */}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white/10"
                    style={{ background: c.color }}
                  />
                  <span className="text-xs muted">{c.color}</span>
                </div>

                {/* Stats */}
                {stat ? (
                  <div className="flex justify-between pt-3 border-t border-[#1e2130]">
                    <div>
                      <div className="text-xs muted">Transactions</div>
                      <div className="text-sm font-semibold mt-0.5">{stat.count}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs muted">Total</div>
                      <div
                        className="text-sm font-semibold mt-0.5"
                        style={{ color: c.type === 'expense' ? '#f43f5e' : '#22c55e' }}
                      >
                        {money(stat.total)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-[#1e2130]">
                    <div className="text-xs muted">No transactions yet</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={open}
        title={editing ? 'Edit Category' : 'Add Category'}
        onClose={() => { setOpen(false); setShowIconPicker(false); }}
        size="md"
      >
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input
              className="input"
              placeholder="e.g. Food & Dining"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Type</label>
            <div className="flex gap-2">
              {(['expense', 'income'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`btn flex-1 ${form.type === t ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setForm({ ...form, type: t })}
                >
                  {t === 'expense' ? 'Expense' : 'Income'}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: c,
                    border: form.color === c ? '3px solid white' : '3px solid transparent',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                style={{ width: 36, height: 36, borderRadius: 8, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
              />
              <input
                className="input"
                style={{ maxWidth: 120 }}
                placeholder="#8b5cf6"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
              <CategoryIcon icon={form.icon} color={form.color} size={18} bgSize={40} />
            </div>
          </div>

          {/* Icon picker */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="label" style={{ marginBottom: 0 }}>Icon</label>
              <button
                type="button"
                className="btn btn-ghost text-xs"
                onClick={() => setShowIconPicker((v) => !v)}
              >
                <Palette size={13} />
                {showIconPicker ? 'Hide' : 'Browse icons'}
              </button>
            </div>
            <div
              className="card p-3 flex items-center gap-3 cursor-pointer"
              style={{ background: '#0d0f16' }}
              onClick={() => setShowIconPicker((v) => !v)}
            >
              <CategoryIcon icon={form.icon} color={form.color} size={18} bgSize={36} />
              <span className="text-sm">{form.icon}</span>
            </div>
            {showIconPicker && (
              <div className="card mt-2" style={{ background: '#0d0f16', padding: 12 }}>
                <input
                  className="input mb-3"
                  placeholder="Search icons…"
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                  style={{ fontSize: 13, padding: '8px 12px' }}
                />
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', maxHeight: 200, overflowY: 'auto' }}
                >
                  {filteredIcons.slice(0, 80).map((iconName) => {
                    const Icon = ICON_MAP[iconName];
                    return (
                      <button
                        key={iconName}
                        type="button"
                        title={iconName}
                        onClick={() => { setForm({ ...form, icon: iconName }); setShowIconPicker(false); }}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: form.icon === iconName ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.04)',
                          border: form.icon === iconName ? '1px solid #8b5cf6' : '1px solid transparent',
                          cursor: 'pointer',
                          color: form.icon === iconName ? '#8b5cf6' : '#8b92a5',
                        }}
                      >
                        <Icon size={18} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Add Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteId} title="Delete Category" onClose={() => setDeleteId(null)} size="sm">
        <p className="muted text-sm mb-6">Delete this category? Existing transactions won't be deleted.</p>
        <div className="flex gap-3">
          <button className="btn btn-secondary flex-1" onClick={() => setDeleteId(null)}>Cancel</button>
          <button className="btn btn-danger flex-1" onClick={doDelete}>Delete</button>
        </div>
      </Modal>
    </div>
  );
}
