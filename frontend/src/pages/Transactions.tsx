import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { money, formatDate } from '../lib/utils';
import CategoryIcon from '../components/CategoryIcon';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import QuickAdd from '../components/QuickAdd';
import {
  Plus, Pencil, Trash2, Search, SlidersHorizontal,
  ArrowUpRight, ArrowDownRight, CreditCard, Calendar,
  Download, Zap, Building2, MoreVertical, X, ChevronLeft, ChevronRight,
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
  accountId: '',
};

export default function Transactions() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
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

  // Mobile-specific state
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredCats = categories.filter(
    (c) => !form.type || c.type === form.type || form.type === 'credit_card_payment'
  );

  const load = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterType) params.set('type', filterType);
    if (filterCat) params.set('categoryId', filterCat);
    if (period) params.set('period', period);
    params.set('page', String(page));

    Promise.all([
      api.get(`/transactions?${params}`, { signal }),
      api.get('/categories', { signal }),
      api.get('/credit-cards', { signal }),
      api.get('/accounts', { signal }),
    ])
      .then(([txRes, catRes, cardRes, accRes]) => {
        setItems(txRes.data.data || []);
        setTotal(txRes.data.total || 0);
        setPages(txRes.data.pages || 1);
        setCategories(catRes.data);
        setCards(cardRes.data);
        setAccounts(accRes.data);
      })
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'AbortError') return;
        toast('Failed to load transactions', 'error');
      })
      .finally(() => setLoading(false));
  }, [search, filterType, filterCat, period, page]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // Close popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    if (activeMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [activeMenu]);

  const openNew = () => {
    setEditing(null);
    setForm(defaultForm);
    setOpen(true);
  };

  const openEdit = (t: any) => {
    setActiveMenu(null);
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
      accountId: t.accountId?._id || t.accountId || '',
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) return toast('Description is required', 'error');
    if (!form.amount || Number(form.amount) <= 0) return toast('Amount must be positive', 'error');

    // Validation
    if (form.type === 'income' && !form.accountId) return toast('Select an account to receive into', 'error');
    if (form.type === 'credit_card_payment') {
      if (!form.accountId) return toast('Select an account to pay from', 'error');
      if (!form.creditCardId) return toast('Select a credit card to pay', 'error');
    }
    if (form.type === 'expense' && form.paymentMethod === 'Credit Card' && !form.creditCardId) {
      return toast('Select a credit card for this expense', 'error');
    }

    setSaving(true);
    try {
      const body: any = {
        type: form.type,
        amount: Number(form.amount),
        description: form.description,
        notes: form.notes || undefined,
        date: new Date(form.date).toISOString(),
        categoryId: form.categoryId || undefined,
      };

      if (form.type === 'income') {
        body.accountId = form.accountId;
        body.paymentMethod = 'Bank Transfer';
      } else if (form.type === 'expense') {
        body.paymentMethod = form.paymentMethod;
        if (form.paymentMethod === 'Credit Card') {
          // CC expense — DO NOT set accountId
          body.creditCardId = form.creditCardId;
        } else {
          body.accountId = form.accountId || undefined;
        }
      } else if (form.type === 'credit_card_payment') {
        body.accountId = form.accountId;
        body.creditCardId = form.creditCardId;
        body.paymentMethod = 'Bank Transfer';
      }

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

  const hasActiveFilters = !!(filterType || filterCat || search);

  return (
    <div className="fade-in page-content">

      {/* ── HEADER ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Transactions</h1>
          <p className="muted text-xs mt-0.5">{total} transaction{total !== 1 ? 's' : ''}</p>
        </div>
        {/* Desktop action buttons */}
        <div className="hidden md:flex gap-2">
          <button className="btn btn-secondary btn-icon" onClick={exportCSV} title="Export CSV">
            <Download size={16} />
          </button>
          <button className="btn btn-secondary" onClick={() => setQuickAddOpen(true)}>
            <Zap size={16} /> Quick Add
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> Advanced
          </button>
        </div>
        {/* Mobile: export + filter toggle */}
        <div className="flex md:hidden gap-2">
          <button className="btn btn-secondary btn-icon" onClick={exportCSV} title="Export CSV">
            <Download size={15} />
          </button>
          <button
            className={`btn btn-secondary btn-icon ${showFilters ? 'border-violet-500' : ''}`}
            style={{ borderColor: showFilters ? 'var(--violet)' : undefined }}
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal size={15} />
          </button>
        </div>
      </div>

      {/* ── SEARCH BAR ─────────────────────────────────── */}
      <div className="mb-3">
        <div className={`flex gap-2 items-center transition-all`}>
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 muted pointer-events-none" />
            <input
              className="input"
              placeholder="Search transactions…"
              value={search}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: 38 }}
            />
            {search && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost btn-icon p-1"
                style={{ minHeight: 'unset' }}
                onMouseDown={() => { setSearch(''); setPage(1); }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          {searchFocused && (
            <button
              className="btn btn-ghost text-sm px-2"
              onMouseDown={() => { setSearch(''); setSearchFocused(false); (document.activeElement as HTMLElement)?.blur(); }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* ── PERIOD PILL TABS ────────────────────────────── */}
      <div className="pill-tabs mb-3">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            className={`pill-tab ${period === p.value ? 'active' : ''}`}
            onClick={() => { setPeriod(p.value); setPage(1); }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── ADVANCED FILTERS (toggle) ──────────────────── */}
      {showFilters && (
        <div className="card p-4 mb-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="label mb-0">Filters</span>
            {hasActiveFilters && (
              <button
                className="text-xs"
                style={{ color: 'var(--violet)' }}
                onClick={() => { setFilterType(''); setFilterCat(''); setSearch(''); setPage(1); }}
              >
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Type</label>
              <select
                className="input"
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              >
                <option value="">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="credit_card_payment">CC Payment</option>
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={filterCat}
                onChange={(e) => { setFilterCat(e.target.value); setPage(1); }}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-1">
              {filterType && (
                <span className="badge" style={{ background: 'var(--violet-dim)', color: '#c4b5fd' }}>
                  {filterType === 'credit_card_payment' ? 'CC Payment' : filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                  <button className="ml-1 opacity-70" onClick={() => { setFilterType(''); setPage(1); }}>×</button>
                </span>
              )}
              {filterCat && (
                <span className="badge" style={{ background: 'var(--violet-dim)', color: '#c4b5fd' }}>
                  {categories.find(c => c._id === filterCat)?.name || 'Category'}
                  <button className="ml-1 opacity-70" onClick={() => { setFilterCat(''); setPage(1); }}>×</button>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Desktop filter bar */}
      <div className="hidden md:flex gap-3 items-center mb-4">
        <div className="tab-list" style={{ background: '#0d0f16' }}>
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
          style={{ borderColor: showFilters ? 'var(--violet)' : undefined }}
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal size={16} />
        </button>
        {showFilters && (
          <>
            <select
              className="input"
              style={{ maxWidth: 150 }}
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
              style={{ maxWidth: 190 }}
              value={filterCat}
              onChange={(e) => { setFilterCat(e.target.value); setPage(1); }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            {hasActiveFilters && (
              <button
                className="btn btn-ghost text-sm"
                onClick={() => { setFilterType(''); setFilterCat(''); setSearch(''); setPage(1); }}
              >
                Clear filters
              </button>
            )}
          </>
        )}
      </div>

      {/* ── TRANSACTION LIST ───────────────────────────── */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <div className="skeleton h-4 w-40 mb-2 rounded" />
                  <div className="skeleton h-3 w-28 rounded" />
                </div>
                <div className="skeleton h-5 w-16 rounded" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'var(--ink-4)' }}>
              <Search size={24} className="muted" />
            </div>
            <div className="font-semibold mb-1">No transactions found</div>
            <div className="muted text-sm mb-5">
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
            const isCCPayment = t.type === 'credit_card_payment';
            const amtColor = isIncome ? '#22c55e' : isCCPayment ? '#f59e0b' : '#f43f5e';
            const isMenuOpen = activeMenu === t._id;

            return (
              <div key={t._id}>
                {/* ── MOBILE card ─────────────────────── */}
                <div className="tx-card md:hidden">
                  {/* Left: icon */}
                  <div className="flex-shrink-0">
                    {isCCPayment ? (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(245,158,11,0.15)' }}>
                        <CreditCard size={18} style={{ color: '#f59e0b' }} />
                      </div>
                    ) : (
                      <CategoryIcon
                        icon={cat?.icon || 'Circle'}
                        color={cat?.color || '#6b7280'}
                        size={16}
                        bgSize={38}
                      />
                    )}
                  </div>

                  {/* Middle: description + meta */}
                  <div className="flex-1 min-w-0">
                    {isCCPayment ? (
                      <>
                        <div className="text-sm font-semibold" style={{ color: '#f59e0b' }}>💳 CC Bill Payment</div>
                        <div className="flex flex-col mt-0.5" style={{ lineHeight: 1.5 }}>
                          {t.creditCardId && (
                            <span className="text-xs muted flex items-center gap-1">
                              <CreditCard size={9} style={{ color: '#f59e0b' }} />
                              {t.creditCardId.cardName}{t.creditCardId.last4 ? ` ···${t.creditCardId.last4}` : ''}
                            </span>
                          )}
                          <span className="text-xs muted-2" style={{ paddingLeft: 14 }}>↓</span>
                          {t.accountId && (
                            <span className="text-xs muted flex items-center gap-1">
                              <Building2 size={9} />
                              {t.accountId.accountName}
                            </span>
                          )}
                          <span className="text-xs muted mt-0.5">{formatDate(t.date)}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm font-medium truncate">{t.description}</div>
                        <div className="flex flex-wrap items-center gap-x-1.5 mt-0.5">
                          {cat && <span className="text-xs muted">{cat.name}</span>}
                          {cat && <span className="text-xs muted-2">·</span>}
                          <span className="text-xs muted">{formatDate(t.date)}</span>
                          <span className="text-xs muted-2">·</span>
                          <span className="text-xs muted">{t.paymentMethod}</span>
                          {t.accountId && (
                            <>
                              <span className="text-xs muted-2">·</span>
                              <span className="text-xs muted flex items-center gap-0.5">
                                <Building2 size={9} />{t.accountId.accountName}
                              </span>
                            </>
                          )}
                          {t.creditCardId && (
                            <>
                              <span className="text-xs muted-2">·</span>
                              <span className="text-xs muted flex items-center gap-0.5">
                                <CreditCard size={9} />{t.creditCardId.cardName}
                              </span>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right: amount + ⋮ menu */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span
                      className="text-sm font-bold flex items-center gap-0.5"
                      style={{ color: amtColor }}
                    >
                      {isIncome ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      {money(t.amount)}
                    </span>

                    {/* ⋮ Popover Menu */}
                    <div className="relative" ref={isMenuOpen ? menuRef : null}>
                      <button
                        className="btn btn-ghost btn-icon"
                        style={{ minHeight: 36, minWidth: 36, padding: 6 }}
                        onClick={() => setActiveMenu(isMenuOpen ? null : t._id)}
                        aria-label="More options"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {isMenuOpen && (
                        <div
                          className="absolute right-0 z-50 card"
                          style={{
                            top: '110%',
                            minWidth: 130,
                            padding: 6,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                          }}
                        >
                          <button
                            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5 text-left"
                            onClick={() => openEdit(t)}
                          >
                            <Pencil size={14} style={{ color: 'var(--violet)' }} />
                            Edit
                          </button>
                          <button
                            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5 text-left"
                            style={{ color: 'var(--rose)' }}
                            onClick={() => { setActiveMenu(null); setDeleteId(t._id); }}
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── DESKTOP row ─────────────────────── */}
                <div className="tx-row hidden md:flex">
                  {isCCPayment ? (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(245,158,11,0.15)' }}>
                      <CreditCard size={18} style={{ color: '#f59e0b' }} />
                    </div>
                  ) : (
                    <CategoryIcon
                      icon={cat?.icon || 'Circle'}
                      color={cat?.color || '#6b7280'}
                      size={16}
                      bgSize={38}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    {isCCPayment ? (
                      <>
                        <div className="text-sm font-semibold" style={{ color: '#f59e0b' }}>💳 Credit Card Payment</div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {t.creditCardId && (
                            <span className="text-xs muted flex items-center gap-1">
                              <CreditCard size={9} style={{ color: '#f59e0b' }} />
                              {t.creditCardId.cardName}{t.creditCardId.last4 ? ` ···${t.creditCardId.last4}` : ''}
                            </span>
                          )}
                          <span className="text-xs" style={{ color: 'var(--muted-2)' }}>→</span>
                          {t.accountId && (
                            <span className="text-xs muted flex items-center gap-1">
                              <Building2 size={9} />
                              {t.accountId.accountName}
                            </span>
                          )}
                          <span className="text-xs muted">·</span>
                          <span className="text-xs muted flex items-center gap-1">
                            <Calendar size={10} />{formatDate(t.date)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm font-medium truncate">{t.description}</div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          {cat && <span className="text-xs muted">{cat.name}</span>}
                          <span className="text-xs muted">·</span>
                          <span className="text-xs muted flex items-center gap-1">
                            <Calendar size={10} />{formatDate(t.date)}
                          </span>
                          <span className="text-xs muted">·</span>
                          <span className="text-xs muted">{t.paymentMethod}</span>
                          {t.accountId && (
                            <>
                              <span className="text-xs muted">·</span>
                              <span className="text-xs muted flex items-center gap-1">
                                <Building2 size={10} />
                                {t.accountId.accountName}
                              </span>
                            </>
                          )}
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
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="text-sm font-bold flex items-center gap-0.5"
                      style={{ color: amtColor }}
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
              </div>
            );
          })
        )}
      </div>

      {/* ── PAGINATION ─────────────────────────────────── */}
      {pages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4">
          <button
            className="btn btn-secondary"
            style={{ minHeight: 48, minWidth: 48 }}
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft size={18} />
            <span className="hidden sm:inline">Prev</span>
          </button>
          <span className="text-sm muted px-2">
            {page} / {pages}
          </span>
          <button
            className="btn btn-secondary"
            style={{ minHeight: 48, minWidth: 48 }}
            disabled={page === pages}
            onClick={() => setPage((p) => p + 1)}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* ── FAB (mobile) ───────────────────────────────── */}
      <button
        className="fab md:hidden"
        onClick={() => setQuickAddOpen(true)}
        aria-label="Quick Add"
      >
        <Zap size={22} />
      </button>

      {/* ── ADD / EDIT MODAL ───────────────────────────── */}
      <Modal
        open={open}
        title={editing ? 'Edit Transaction' : 'Add Transaction'}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={save} className="space-y-4">

          {/* ── TYPE SELECTOR ── */}
          <div>
            <label className="label mb-2">What happened?</label>
            <div className="flex gap-2">
              {[
                { t: 'income', emoji: '💰', label: 'Income', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: '#22c55e' },
                { t: 'expense', emoji: '💸', label: 'Expense', color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', border: '#f43f5e' },
                { t: 'credit_card_payment', emoji: '💳', label: 'CC Pay', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: '#f59e0b' },
              ].map(({ t, emoji, label, color, bg, border }) => {
                const active = form.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, type: t, categoryId: '', paymentMethod: t === 'credit_card_payment' ? 'Bank Transfer' : form.paymentMethod, creditCardId: '', accountId: '' })}
                    className="flex-1 flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl border-2 transition-all"
                    style={{
                      borderColor: active ? border : '#1e2130',
                      background: active ? bg : 'transparent',
                    }}
                  >
                    <span className="text-xl">{emoji}</span>
                    <span className="text-xs font-semibold" style={{ color: active ? color : '#8b92a5' }}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── DESCRIPTION ── */}
          <div>
            <label className="label">Description *</label>
            <input
              className="input"
              placeholder={
                form.type === 'credit_card_payment'
                  ? 'e.g. HDFC CC Bill Payment'
                  : form.type === 'income'
                  ? 'e.g. Monthly Salary'
                  : 'e.g. Zomato order'
              }
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>

          {/* ── AMOUNT + DATE ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount (₹) *</label>
              <input
                className="input"
                type="number"
                placeholder="0"
                min="0.01"
                step="0.01"
                inputMode="decimal"
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

          {/* ── CATEGORY (not shown for CC Payment) ── */}
          {form.type !== 'credit_card_payment' && (
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
          )}

          {/* ── PAYMENT METHOD (Expense only) ── */}
          {form.type === 'expense' && (
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
          )}

          {/* ── CREDIT CARD selector ── */}
          {((form.paymentMethod === 'Credit Card' && form.type === 'expense') || form.type === 'credit_card_payment') && (
            <div>
              <label className="label">
                {form.type === 'credit_card_payment' ? 'Credit Card to Pay *' : 'Credit Card Used *'}
              </label>
              <select
                className="input"
                value={form.creditCardId}
                onChange={(e) => setForm({ ...form, creditCardId: e.target.value })}
                required
              >
                <option value="">— Select card —</option>
                {cards.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.cardName} {c.last4 ? `···${c.last4}` : ''} — Outstanding: ₹{Number(c.outstandingBalance || 0).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
              {cards.length === 0 && (
                <p className="text-xs text-amber-400 mt-1">No credit cards found. Add one first.</p>
              )}
              {form.type === 'expense' && form.paymentMethod === 'Credit Card' && (
                <p className="text-xs muted mt-1">💡 Bank account will NOT be deducted — CC outstanding increases instead.</p>
              )}
            </div>
          )}

          {/* ── ACCOUNT selector ── */}
          {(form.type === 'income' ||
            form.type === 'credit_card_payment' ||
            (form.type === 'expense' && form.paymentMethod !== 'Credit Card')) && (
            <div>
              <label className="label">
                {form.type === 'income' ? 'Received Into *' :
                  form.type === 'credit_card_payment' ? 'Pay From Account *' :
                  'Paid From Account'}
              </label>
              <select
                className="input"
                value={form.accountId}
                onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                required={form.type === 'income' || form.type === 'credit_card_payment'}
              >
                <option value="">— Select account —</option>
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.accountName} — ₹{Number(a.balance).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
              {accounts.length === 0 && (
                <p className="text-xs text-amber-400 mt-1">No accounts found. Add one in the Accounts section.</p>
              )}
            </div>
          )}

          {/* ── NOTES ── */}
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

          <div className="flex gap-3 pt-1">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── DELETE CONFIRM MODAL ─────────────────────── */}
      <Modal open={!!deleteId} title="Delete Transaction" onClose={() => setDeleteId(null)} size="sm">
        <div className="text-center py-2 mb-4">
          <div
            className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(244,63,94,0.12)' }}
          >
            <Trash2 size={24} style={{ color: 'var(--rose)' }} />
          </div>
          <p className="muted text-sm">
            Are you sure you want to delete this transaction? This cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary flex-1" onClick={() => setDeleteId(null)}>
            Cancel
          </button>
          <button className="btn btn-danger flex-1" onClick={doDelete}>
            Delete
          </button>
        </div>
      </Modal>

      {/* ── QUICK ADD MODAL ──────────────────────────── */}
      <QuickAdd
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onDone={load}
      />
    </div>
  );
}
