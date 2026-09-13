import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { money, formatShortDate } from '../lib/utils';
import { toast } from '../components/Toast';
import Modal from '../components/Modal';
import CategoryIcon from '../components/CategoryIcon';
import {
  Building2, Wallet, Plus, Edit2, Trash2,
  ArrowUpRight, ArrowDownRight, Eye, X, TrendingUp, TrendingDown,
  Landmark, Smartphone, Banknote, CircleDollarSign,
} from 'lucide-react';

/* ─────────────────────────── constants ─────────────────────────── */

const ACCOUNT_TYPES = [
  'Savings Account', 'Salary Account', 'Current Account',
  'Digital Wallet', 'Cash', 'Other',
];

const ACCOUNT_TYPE_ICONS: Record<string, any> = {
  'Savings Account': Landmark,
  'Salary Account': Wallet,
  'Current Account': Building2,
  'Digital Wallet': Smartphone,
  'Cash': Banknote,
  'Other': CircleDollarSign,
};

const ACCOUNT_COLORS = [
  '#8b5cf6', '#22c55e', '#3b82f6', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#14b8a6',
];

const FILTER_OPTIONS = [
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'This Year', value: 'this_year' },
  { label: 'All Time', value: 'all' },
];

/* ───────────────────────── AccountCard ─────────────────────────── */

function AccountCard({ acc, onEdit, onDelete, onView }: any) {
  const Icon = ACCOUNT_TYPE_ICONS[acc.accountType] || Building2;
  const isPositive = acc.balance >= 0;

  return (
    <div
      className="w-full rounded-2xl overflow-hidden mb-3 slide-up"
      style={{
        background: `linear-gradient(145deg, ${acc.color}dd, ${acc.color}99)`,
        boxShadow: `0 8px 32px ${acc.color}40`,
      }}
    >
      {/* ── Card Header ── */}
      <div className="p-5 pb-3">
        {/* Top row: icon + name + actions */}
        <div className="flex items-start justify-between gap-2">
          {/* Icon + name */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-xl grid place-items-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.20)' }}
            >
              <Icon size={20} color="#fff" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-base text-white leading-tight truncate">
                {acc.accountName}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {acc.bankName || acc.accountType}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-0.5 shrink-0">
            <button
              onClick={() => onView(acc)}
              className="w-9 h-9 rounded-xl grid place-items-center transition-all active:scale-90"
              style={{ background: 'rgba(255,255,255,0.15)' }}
              title="View transactions"
            >
              <Eye size={15} color="#fff" />
            </button>
            <button
              onClick={() => onEdit(acc)}
              className="w-9 h-9 rounded-xl grid place-items-center transition-all active:scale-90"
              style={{ background: 'rgba(255,255,255,0.15)' }}
              title="Edit"
            >
              <Edit2 size={15} color="#fff" />
            </button>
            <button
              onClick={() => onDelete(acc)}
              className="w-9 h-9 rounded-xl grid place-items-center transition-all active:scale-90"
              style={{ background: 'rgba(255,255,255,0.15)' }}
              title="Delete"
            >
              <Trash2 size={15} color="#fff" />
            </button>
          </div>
        </div>

        {/* Account number */}
        {acc.accountNumberLast4 && (
          <div className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
            •••• •••• •••• {acc.accountNumberLast4}
          </div>
        )}

        {/* Balance */}
        <div className="mt-4">
          <div className="text-xs mb-1 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Available Balance
          </div>
          <div className="text-3xl font-bold text-white">
            {!isPositive && <span style={{ color: '#fca5a5' }}>−</span>}
            {money(Math.abs(acc.balance))}
          </div>
        </div>
      </div>

      {/* ── Income / Expense Stats ── */}
      <div
        className="grid grid-cols-2 mt-3"
        style={{ background: 'rgba(0,0,0,0.22)' }}
      >
        <div className="p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp size={12} color="#86efac" />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Income</span>
          </div>
          <div className="text-sm font-bold" style={{ color: '#86efac' }}>
            +{money(acc.monthlyIncome || 0)}
          </div>
        </div>
        <div className="p-4 text-center" style={{ borderLeft: '1px solid rgba(255,255,255,0.12)' }}>
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingDown size={12} color="#fca5a5" />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Expenses</span>
          </div>
          <div className="text-sm font-bold" style={{ color: '#fca5a5' }}>
            −{money(acc.monthlyExpense || 0)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────── AccountFormModal ─────────────────────── */

function AccountFormModal({ open, onClose, onSave, initial }: any) {
  const [form, setForm] = useState({
    accountName: '',
    bankName: '',
    accountType: 'Savings Account',
    accountNumberLast4: '',
    openingBalance: '',
    color: '#8b5cf6',
    icon: 'Building2',
    isActive: true,
  });

  useEffect(() => {
    if (initial) {
      setForm({
        accountName: initial.accountName || '',
        bankName: initial.bankName || '',
        accountType: initial.accountType || 'Savings Account',
        accountNumberLast4: initial.accountNumberLast4 || '',
        openingBalance: initial._id ? String(initial.balance || 0) : '',
        color: initial.color || '#8b5cf6',
        icon: initial.icon || 'Building2',
        isActive: initial.isActive !== undefined ? initial.isActive : true,
      });
    } else {
      setForm({
        accountName: '', bankName: '', accountType: 'Savings Account',
        accountNumberLast4: '', openingBalance: '', color: '#8b5cf6',
        icon: 'Building2', isActive: true,
      });
    }
  }, [initial, open]);

  const f = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Account' : 'Add Account'}>
      <div className="px-5 pb-6 space-y-4">
        {/* Account Name */}
        <div>
          <label className="label">Account Name *</label>
          <input
            className="input"
            placeholder="e.g. HDFC Salary Account"
            value={form.accountName}
            onChange={(e) => f('accountName', e.target.value)}
          />
        </div>

        {/* Bank Name */}
        <div>
          <label className="label">Bank Name</label>
          <input
            className="input"
            placeholder="e.g. HDFC Bank"
            value={form.bankName}
            onChange={(e) => f('bankName', e.target.value)}
          />
        </div>

        {/* Account Type */}
        <div>
          <label className="label">Account Type</label>
          <select
            className="input"
            value={form.accountType}
            onChange={(e) => f('accountType', e.target.value)}
          >
            {ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        {/* Last 4 Digits */}
        <div>
          <label className="label">Last 4 Digits (optional)</label>
          <input
            className="input"
            placeholder="4521"
            maxLength={4}
            inputMode="numeric"
            value={form.accountNumberLast4}
            onChange={(e) => f('accountNumberLast4', e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
        </div>

        {/* Opening Balance — only for new accounts */}
        {!initial && (
          <div>
            <label className="label">Opening Balance (₹)</label>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={form.openingBalance}
              onChange={(e) => f('openingBalance', e.target.value)}
            />
            <p className="text-xs muted mt-1">
              Current money in this account before using the app.
            </p>
          </div>
        )}

        {/* Color picker */}
        <div>
          <label className="label">Card Color</label>
          <div className="flex gap-3 flex-wrap mt-2">
            {ACCOUNT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => f('color', c)}
                className="w-9 h-9 rounded-full transition-all active:scale-95"
                style={{
                  background: c,
                  outline: form.color === c ? `3px solid #fff` : '3px solid transparent',
                  outlineOffset: 2,
                  transform: form.color === c ? 'scale(1.18)' : 'scale(1)',
                  boxShadow: form.color === c ? `0 0 0 2px ${c}` : 'none',
                }}
              />
            ))}
          </div>
        </div>

        {/* Preview chip */}
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: `${form.color}22`, border: `1px solid ${form.color}44` }}
        >
          <div
            className="w-8 h-8 rounded-lg grid place-items-center shrink-0"
            style={{ background: `${form.color}33` }}
          >
            {(() => {
              const Icon = ACCOUNT_TYPE_ICONS[form.accountType] || Building2;
              return <Icon size={16} style={{ color: form.color }} />;
            })()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: form.color }}>
              {form.accountName || 'Account Name'}
            </div>
            <div className="text-xs muted truncate">{form.bankName || form.accountType}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <button onClick={onClose} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={() => onSave(form)} className="btn btn-primary flex-1">
            {initial ? 'Update' : 'Add Account'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────── AccountTransactionsModal ──────────────────── */

function AccountTransactionsModal({ open, onClose, account }: any) {
  const [txs, setTxs] = useState<any[]>([]);
  const [filter, setFilter] = useState('this_month');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !account) return;
    setLoading(true);
    api.get(`/accounts/${account._id}/transactions?period=${filter}`)
      .then((r) => setTxs(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, account, filter]);

  if (!account) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex flex-col" style={{ maxHeight: '72vh' }}>
        {/* Account summary */}
        <div className="px-5 pb-3">
          <div className="text-base font-bold">{account.accountName}</div>
          <div
            className="text-2xl font-bold mt-0.5"
            style={{ color: account.balance >= 0 ? '#22c55e' : '#f43f5e' }}
          >
            {money(account.balance)}
          </div>
        </div>

        {/* Period pill tabs */}
        <div className="pill-tabs px-4 mb-3 flex-shrink-0">
          {FILTER_OPTIONS.map((fo) => (
            <button
              key={fo.value}
              className={`pill-tab ${filter === fo.value ? 'active' : ''}`}
              onClick={() => setFilter(fo.value)}
            >
              {fo.label}
            </button>
          ))}
        </div>

        {/* Transaction list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
          {loading ? (
            <div className="space-y-2 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-14 rounded-xl" />
              ))}
            </div>
          ) : txs.length === 0 ? (
            <div className="text-center py-10">
              <div className="muted text-sm">No transactions for this period.</div>
            </div>
          ) : (
            txs.map((tx: any) => {
              const cat = tx.categoryId;
              const isIncome = tx.type === 'income';
              return (
                <div key={tx._id} className="tx-row">
                  <CategoryIcon
                    icon={cat?.icon || 'Circle'}
                    color={cat?.color || '#6b7280'}
                    size={15}
                    bgSize={34}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{tx.description}</div>
                    <div className="text-xs muted">
                      {cat?.name || 'Uncategorized'} · {formatShortDate(tx.date)}
                    </div>
                  </div>
                  <div
                    className="text-sm font-semibold shrink-0"
                    style={{ color: isIncome ? '#22c55e' : '#f43f5e' }}
                  >
                    {isIncome ? '+' : '−'}{money(tx.amount)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────────── Main Accounts Page ────────────────────── */

export default function Accounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [viewTarget, setViewTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/accounts');
      setAccounts(r.data);
    } catch {
      toast('Failed to load accounts', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const totalIncome  = accounts.reduce((s, a) => s + (a.monthlyIncome || 0), 0);
  const totalExpense = accounts.reduce((s, a) => s + (a.monthlyExpense || 0), 0);

  const handleSave = async (form: any) => {
    try {
      if (editTarget) {
        const r = await api.put(`/accounts/${editTarget._id}`, form);
        setAccounts((prev) =>
          prev.map((a) =>
            a._id === editTarget._id
              ? { ...r.data, monthlyIncome: a.monthlyIncome, monthlyExpense: a.monthlyExpense }
              : a,
          ),
        );
        toast('Account updated', 'success');
      } else {
        await api.post('/accounts', form);
        await load();
        toast('Account added', 'success');
      }
      setFormOpen(false);
      setEditTarget(null);
    } catch (e: any) {
      toast(e.response?.data?.message || 'Error saving account', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/accounts/${deleteTarget._id}`);
      setAccounts((prev) => prev.filter((a) => a._id !== deleteTarget._id));
      toast('Account removed', 'success');
    } catch {
      toast('Failed to delete account', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const openAddForm = () => { setEditTarget(null); setFormOpen(true); };

  return (
    <div className="fade-in page-content pb-24">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="muted text-sm mt-0.5">Your balances & transaction history</p>
        </div>
        {/* Desktop-only add button (mobile uses FAB) */}
        <button
          onClick={openAddForm}
          className="hidden sm:flex btn btn-primary gap-2"
        >
          <Plus size={16} /> Add Account
        </button>
      </div>

      {/* ── Total Balance Hero Card ── */}
      <div
        className="rounded-2xl p-5 mb-5"
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.22), rgba(139,92,246,0.07))',
          border: '1px solid rgba(139,92,246,0.25)',
        }}
      >
        <div className="text-xs muted uppercase tracking-widest mb-1">Total Balance</div>
        <div className="text-4xl font-bold mb-4" style={{ color: totalBalance >= 0 ? '#fff' : '#f43f5e' }}>
          {money(totalBalance)}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Income */}
          <div
            className="rounded-xl px-4 py-3"
            style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowUpRight size={13} color="#22c55e" />
              <span className="text-xs muted">Income</span>
            </div>
            <div className="font-bold text-sm" style={{ color: '#22c55e' }}>{money(totalIncome)}</div>
          </div>

          {/* Expenses */}
          <div
            className="rounded-xl px-4 py-3"
            style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.2)' }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowDownRight size={13} color="#f43f5e" />
              <span className="text-xs muted">Expenses</span>
            </div>
            <div className="font-bold text-sm" style={{ color: '#f43f5e' }}>{money(totalExpense)}</div>
          </div>
        </div>
      </div>

      {/* ── Section header ── */}
      {!loading && accounts.length > 0 && (
        <div className="section-header mb-3">
          <span className="section-title">My Accounts</span>
          <span className="muted text-xs">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* ── Account Cards ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-44 rounded-2xl" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="card p-10 text-center">
          <div
            className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-4"
            style={{ background: 'rgba(139,92,246,0.15)' }}
          >
            <Building2 size={28} style={{ color: '#8b5cf6' }} />
          </div>
          <div className="text-base font-semibold mb-1">No accounts yet</div>
          <p className="muted text-sm mb-5">
            Add your first bank account or wallet to start tracking balances.
          </p>
          <button onClick={openAddForm} className="btn btn-primary mx-auto">
            <Plus size={16} /> Add Account
          </button>
        </div>
      ) : (
        /* Single-column on mobile, 2-col on sm, 3-col on lg */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
          {accounts.map((acc) => (
            <AccountCard
              key={acc._id}
              acc={acc}
              onEdit={(a: any) => { setEditTarget(a); setFormOpen(true); }}
              onDelete={(a: any) => setDeleteTarget(a)}
              onView={(a: any) => setViewTarget(a)}
            />
          ))}
        </div>
      )}

      {/* ── FAB — mobile only ── */}
      <button
        onClick={openAddForm}
        className="fab sm:hidden"
        aria-label="Add Account"
      >
        <Plus size={24} />
      </button>

      {/* ── Account Form Modal (iOS bottom sheet on mobile) ── */}
      <AccountFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        onSave={handleSave}
        initial={editTarget}
      />

      {/* ── Transaction History Modal ── */}
      <AccountTransactionsModal
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        account={viewTarget}
      />

      {/* ── Delete Confirmation Modal ── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove Account?">
        <div className="px-5 pb-6">
          <p className="muted text-sm mb-6">
            This will hide{' '}
            <strong className="text-white">{deleteTarget?.accountName}</strong>.
            Existing transactions will not be deleted.
          </p>
          <div className="flex gap-3" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <button
              onClick={() => setDeleteTarget(null)}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="btn btn-danger flex-1"
            >
              Remove
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
