import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { money } from '../lib/utils';
import CategoryIcon from '../components/CategoryIcon';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import { Plus, Pencil, Trash2, Palette, Search } from 'lucide-react';
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
        toast('Category updated', 'success');
      } else {
        await api.post('/categories', form);
        toast('Category created', 'success');
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
      toast('Category deleted', 'success');
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
          <p className="muted text-sm mt-1">Organize your transactions.</p>
        </div>
        <button className="hidden md:flex btn btn-primary" onClick={openNew}>
          <Plus size={16} /> Add Category
        </button>
      </div>

      {/* Tabs */}
      <div className="pill-tabs mb-6">
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            className={`pill-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'expense' ? '💸 Expenses' : '💰 Income'}
          </button>
        ))}
      </div>

      {/* Category grid */}
      {displayed.length === 0 ? (
        <div className="card p-10 text-center mt-4">
          <div className="text-4xl mb-3">{tab === 'expense' ? '💸' : '💰'}</div>
          <div className="font-semibold mb-1 text-lg">No {tab} categories yet</div>
          <div className="muted text-sm mb-4">Create categories to track your spending.</div>
          <button className="btn btn-primary mx-auto" onClick={openNew}>
            <Plus size={14} /> Add Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {displayed.map((c) => {
            const stat = stats[c._id];
            return (
              <div key={c._id} className="card card-hover p-4 flex flex-col items-center text-center relative overflow-hidden group">
                <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button className="btn btn-ghost btn-icon p-1" onClick={() => openEdit(c)}><Pencil size={14} /></button>
                  <button className="btn btn-ghost btn-icon p-1" onClick={() => setDeleteId(c._id)}><Trash2 size={14} style={{ color: '#f43f5e' }} /></button>
                </div>

                <div className="mt-2 mb-3">
                  <CategoryIcon icon={c.icon} color={c.color} size={24} bgSize={56} />
                </div>
                
                <div className="font-bold text-sm mb-1 truncate w-full">{c.name}</div>
                
                <div className="flex items-center gap-1 mb-2">
                  <span
                    className="badge text-[10px]"
                    style={{
                      background: c.type === 'expense' ? 'rgba(244,63,94,0.12)' : 'rgba(34,197,94,0.12)',
                      color: c.type === 'expense' ? '#f43f5e' : '#22c55e',
                    }}
                  >
                    {c.type}
                  </span>
                  {c.isDefault && (
                    <span className="badge text-[10px]" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                      Default
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="w-full mt-auto pt-3 border-t border-[#1e2130]">
                  {stat ? (
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[10px] muted">{stat.count} txns</span>
                      <span className="text-xs font-bold" style={{ color: c.type === 'expense' ? '#f43f5e' : '#22c55e' }}>
                        {money(stat.total)}
                      </span>
                    </div>
                  ) : (
                    <div className="text-[10px] muted">No transactions</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FAB for mobile */}
      <button className="fab md:hidden" onClick={openNew} aria-label="Add Category">
        <Plus size={24} />
      </button>

      {/* Add/Edit Modal */}
      <Modal
        open={open}
        title={editing ? 'Edit Category' : 'Add Category'}
        onClose={() => { setOpen(false); setShowIconPicker(false); }}
        fullScreen
      >
        <div className="p-5 max-w-md mx-auto w-full pb-20">
          <form onSubmit={save} className="space-y-5">
            <div>
              <label className="label">Name *</label>
              <input
                className="input text-lg font-semibold"
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
                    className={`btn flex-1 py-3 font-semibold ${form.type === t ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setForm({ ...form, type: t })}
                  >
                    {t === 'expense' ? '💸 Expense' : '💰 Income'}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="label">Color</label>
              <div className="flex flex-wrap gap-3 mb-4">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: c,
                      border: form.color === c ? '3px solid white' : '3px solid transparent',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  />
                ))}
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
                  <Palette size={14} />
                  {showIconPicker ? 'Hide picker' : 'Browse icons'}
                </button>
              </div>
              
              <div
                className="card p-4 flex items-center justify-between cursor-pointer transition-all active:scale-95"
                style={{ background: '#0d0f16', border: '1px solid #1e2130' }}
                onClick={() => setShowIconPicker((v) => !v)}
              >
                <div className="flex items-center gap-3">
                  <CategoryIcon icon={form.icon} color={form.color} size={24} bgSize={48} />
                  <span className="font-semibold text-lg">{form.icon}</span>
                </div>
                <div className="text-xs muted flex items-center gap-1">Tap to change <Search size={12}/></div>
              </div>

              {showIconPicker && (
                <div className="card mt-3" style={{ background: '#0d0f16', padding: 16 }}>
                  <input
                    className="input mb-4"
                    placeholder="Search icons…"
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                  />
                  <div
                    className="grid gap-2"
                    style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))', maxHeight: 300, overflowY: 'auto' }}
                  >
                    {filteredIcons.slice(0, 100).map((iconName) => {
                      const Icon = ICON_MAP[iconName];
                      return (
                        <button
                          key={iconName}
                          type="button"
                          title={iconName}
                          onClick={() => { setForm({ ...form, icon: iconName }); setShowIconPicker(false); }}
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: form.icon === iconName ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.04)',
                            border: form.icon === iconName ? '2px solid #8b5cf6' : '2px solid transparent',
                            cursor: 'pointer',
                            color: form.icon === iconName ? '#8b5cf6' : '#8b92a5',
                          }}
                        >
                          <Icon size={22} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-6">
              <button type="button" className="btn btn-secondary flex-1 py-4 font-bold" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary flex-1 py-4 font-bold" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Update' : 'Add Category'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteId} title="Delete Category" onClose={() => setDeleteId(null)} size="sm">
        <div className="p-5 max-w-sm mx-auto text-center">
          <p className="muted text-sm mb-6">Delete this category? Existing transactions won't be deleted.</p>
          <div className="flex gap-3">
            <button className="btn btn-secondary flex-1 py-3" onClick={() => setDeleteId(null)}>Cancel</button>
            <button className="btn btn-danger flex-1 py-3" onClick={doDelete}>Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
