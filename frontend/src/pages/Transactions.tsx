import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { money, formatDate } from '../lib/utils';
import CategoryIcon from '../components/CategoryIcon';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import {
  Plus, Pencil, Trash2, Search, SlidersHorizontal,
  ArrowUpRight, ArrowDownRight, CreditCard, Calendar,
  Download,
} from 'lucide-react';

const PAYMENT_METHODS = ['Cash', 'UPI', 'Debit Card', 'Credit Card', 'Bank Transfer', 'Net Banking', 'Other'];

const defaultForm = {
  type: 'expense',
  amount: '',
  description: '',
  notes: '',
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: 'UPI',
  categoryId: '',
  creditCardId: '',
};

export default function Transactions() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [period, setPeriod] = useState('this_month');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const filteredCats = categories.filter(
    (c) => !form.type || c.type === form.type || form.type === 'credit_card_payment'
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType) params.set('type', filterType);
      if (filterCat) params.set('categoryId', filterCat);
      if (period) params.set('period', period);
      params.set('page', String(page));

      const [txRes, catRes, cardRes] = await Promise.all([
        api.get(`/transactions?${params}`),
        api.get('/categories'),
        api.get('/credit-cards'),
      ]);

      setItems(txRes.data.data || []);
      setTotal(txRes.data.total || 0);
      setPages(txRes.data.pages || 1);
      setCategories(catRes.data);
      setCards(cardRes.data);
    } catch {
      toast('Failed to load transactions', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, filterType, filterCat, period, page]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm(defaultForm);
    setOpen(true);
  };

  const openEdit = (t: any) => {
    setEditing(t);
    setForm({
      type: t.type,
      amount: String(t.amount),
      description: t.description,
      notes: t.notes || '',
      date: new Date(t.date).toISOString().slice(0, 10),
      paymentMethod: t.paymentMethod,
      categoryId: t.categoryId?._id || t.categoryId || '',
      creditCardId: t.creditCardId?._id || t.creditCardId || '',
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) return toast('Description is required', 'error');
    if (!form.amount || Number(form.amount) <= 0) return toast('Amount must be positive', 'error');

    setSaving(true);
    try {
      const body = {
        ...form,
        amount: Number(form.amount),
        date: new Date(form.date).toISOString(),
        categoryId: form.categoryId || undefined,
        creditCardId: form.paymentMethod === 'Credit Card' ? form.creditCardId || undefined : undefined,
      };

      if (editing) {
        await api.put(`/transactions/${editing._id}`, body);
        toast('Transaction updated');
      } else {
        await api.post('/transactions', body);
        toast('Transaction added');
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
      await api.delete(`/transactions/${deleteId}`);
      toast('Transaction deleted');
      setDeleteId(null);
      load();
    } catch {
      toast('Delete failed', 'error');
    }
  };

  const exportCSV = () => {
    window.open(`${api.defaults.baseURL}/export/transactions`, '_blank');
  };

  const PERIODS = [
    { label: 'Month', value: 'this_month' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'Year', value: 'this_year' },
    { label: 'All', value: 'all' },
  ];

  return (
    <div className="fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="muted text-sm mt-1">{total} transaction{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-secondary btn-icon" onClick={exportCSV} title="Export CSV">
            <Download size={16} />
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> Add Transaction
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="card p-4 mb-4">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-48 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 muted" />
            <input
              className="input"
              placeholder="Search transactions…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: 36 }}
            />
          </div>
          <div className="flex gap-1 tab-list" style={{ background: '#0d0f16' }}>
            {PERIODS.map((p) => (
              <button
                key={p.value}
                className={`tab ${period === p.value ? 'active' : ''}`}
                onClick={() => { setPeriod(p.value); setPage(1); }}
                style={{ fontSize: 12, padding: '6px 10px' }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            className={`btn btn-secondary btn-icon ${showFilters ? 'border-violet-500' : ''}`}
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>

        {showFilters && (
          <div className="flex gap-3 mt-3 flex-wrap">
            <select
              className="input"
              style={{ maxWidth: 160 }}
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            >
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="credit_card_payment">CC Payment</option>
            </select>
            <select
              className="input"
              style={{ maxWidth: 200 }}
              value={filterCat}
              onChange={(e) => { setFilterCat(e.target.value); setPage(1); }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            {(filterType || filterCat || search) && (
              <button
                className="btn btn-ghost text-sm"
                onClick={() => { setFilterType(''); setFilterCat(''); setSearch(''); setPage(1); }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Transaction list */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton w-9 h-9 rounded-full" />
                <div className="flex-1">
                  <div className="skeleton h-4 w-48 mb-2" />
                  <div className="skeleton h-3 w-32" />
                </div>
                <div className="skeleton h-5 w-20" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📊</div>
            <div className="font-semibold mb-1">No transactions found</div>
            <div className="muted text-sm mb-4">
              {search || filterType || filterCat
                ? 'Try adjusting your filters.'
                : 'Add your first transaction to get started.'}
            </div>
            {!search && !filterType && !filterCat && (
              <button className="btn btn-primary" onClick={openNew}>
                <Plus size={14} /> Add Transaction
              </button>
            )}
          </div>
        ) : (
          items.map((t) => {
            const cat = t.categoryId;
            const isIncome = t.type === 'income';
            return (
              <div key={t._id} className="tx-row">
                <CategoryIcon
                  icon={cat?.icon || 'Circle'}
                  color={cat?.color || '#6b7280'}
                  size={16}
                  bgSize={38}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.description}</div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                    {cat && <span className="text-xs muted">{cat.name}</span>}
                    <span className="text-xs muted">·</span>
                    <span className="text-xs muted flex items-center gap-1">
                      <Calendar size={10} />{formatDate(t.date)}
                    </span>
                    <span className="text-xs muted">·</span>
                    <span className="text-xs muted">{t.paymentMethod}</span>
                    {t.creditCardId && (
                      <>
                        <span className="text-xs muted">·</span>
                        <span className="text-xs muted flex items-center gap-1">
                          <CreditCard size={10} />
                          {t.creditCardId.cardName} ···{t.creditCardId.last4}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="text-sm font-bold flex items-center gap-0.5"
                    style={{ color: isIncome ? '#22c55e' : '#f43f5e' }}
                  >
                    {isIncome ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {money(t.amount)}
                  </div>
                  <div className="flex gap-1">
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => openEdit(t)}
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="btn btn-danger btn-icon"
                      onClick={() => setDeleteId(t._id)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            className="btn btn-secondary"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="flex items-center text-sm muted px-3">
            Page {page} of {pages}
          </span>
          <button
            className="btn btn-secondary"
            disabled={page === pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={open}
        title={editing ? 'Edit Transaction' : 'Add Transaction'}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={save} className="space-y-4">
          {/* Type */}
          <div>
            <label className="label">Type</label>
            <div className="flex gap-2">
              {(['expense', 'income', 'credit_card_payment'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`btn flex-1 text-sm ${form.type === t ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '8px 4px', fontSize: 12 }}
                  onClick={() => setForm({ ...form, type: t, categoryId: '' })}
                >
                  {t === 'expense' ? 'Expense' : t === 'income' ? 'Income' : 'CC Payment'}
                </button>
              ))}
            </div>
          </div>

          {/* Description + Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Description *</label>
              <input
                className="input"
                placeholder="e.g. Zomato order"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Amount *</label>
              <input
                className="input"
                type="number"
                placeholder="0"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Date *</label>
              <input
                className="input"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">— Select category —</option>
              {filteredCats.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="label">Payment Method</label>
            <select
              className="input"
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value, creditCardId: '' })}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Credit Card selector */}
          {form.paymentMethod === 'Credit Card' && (
            <div>
              <label className="label">Credit Card *</label>
              <select
                className="input"
                value={form.creditCardId}
                onChange={(e) => setForm({ ...form, creditCardId: e.target.value })}
                required
              >
                <option value="">— Select card —</option>
                {cards.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.cardName} {c.last4 ? `···${c.last4}` : ''} ({c.bank || 'Card'})
                  </option>
                ))}
              </select>
              {cards.length === 0 && (
                <p className="text-xs text-amber-400 mt-1">No credit cards found. Add one first.</p>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              className="input"
              rows={2}
              placeholder="Optional note…"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteId} title="Delete Transaction" onClose={() => setDeleteId(null)} size="sm">
        <p className="muted text-sm mb-6">
          Are you sure you want to delete this transaction? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button className="btn btn-secondary flex-1" onClick={() => setDeleteId(null)}>
            Cancel
          </button>
          <button className="btn btn-danger flex-1" onClick={doDelete}>
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
