import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { money, formatShortDate } from '../lib/utils';
import { toast } from '../components/Toast';
import Modal from '../components/Modal';
import CategoryIcon from '../components/CategoryIcon';
import {
  Building2, Wallet, Plus, Edit2, Trash2, ChevronRight, ArrowUpRight,
  ArrowDownRight, Eye, X, TrendingUp, TrendingDown, CreditCard,
  Landmark, Smartphone, Banknote, CircleDollarSign,
} from 'lucide-react';

const ACCOUNT_TYPES = [
  'Savings Account', 'Salary Account', 'Current Account', 'Digital Wallet', 'Cash', 'Other',
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
  '#8b5cf6', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6',
];

const FILTER_OPTIONS = [
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'This Year', value: 'this_year' },
  { label: 'All Time', value: 'all' },
];

function AccountCard({ acc, onEdit, onDelete, onView }: any) {
  const Icon = ACCOUNT_TYPE_ICONS[acc.accountType] || Building2;
  const isPositive = acc.balance >= 0;

  return (
    <div
      className="card p-0 overflow-hidden hover:scale-[1.01] transition-transform duration-200"
      style={{ borderColor: `${acc.color}30` }}
    >
      {/* Gradient header */}
      <div
        className="p-5 pb-4"
        style={{
          background: `linear-gradient(135deg, ${acc.color}20, ${acc.color}08)`,
          borderBottom: `1px solid ${acc.color}20`,
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl grid place-items-center"
              style={{ background: `${acc.color}25` }}
            >
              <Icon size={20} style={{ color: acc.color }} />
            </div>
            <div>
              <div className="font-semibold text-base">{acc.accountName}</div>
              <div className="text-xs muted">{acc.bankName || acc.accountType}</div>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onView(acc)}
              className="btn btn-ghost btn-icon"
              title="View transactions"
            >
              <Eye size={15} />
            </button>
            <button onClick={() => onEdit(acc)} className="btn btn-ghost btn-icon" title="Edit">
              <Edit2 size={15} />
            </button>
            <button onClick={() => onDelete(acc)} className="btn btn-ghost btn-icon" title="Delete">
              <Trash2 size={15} style={{ color: '#f43f5e' }} />
            </button>
          </div>
        </div>

        {acc.accountNumberLast4 && (
          <div className="text-xs muted mb-3">•••• {acc.accountNumberLast4}</div>
        )}

        <div>
          <div className="text-xs muted mb-1">Available Balance</div>
          <div
            className="text-2xl font-bold"
            style={{ color: isPositive ? '#ffffff' : '#f43f5e' }}
          >
            {!isPositive && '-'}{money(Math.abs(acc.balance))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 divide-x divide-[#1e2130]">
        <div className="p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp size={12} style={{ color: '#22c55e' }} />
            <span className="text-xs muted">Income</span>
          </div>
          <div className="text-sm font-semibold" style={{ color: '#22c55e' }}>
            +{money(acc.monthlyIncome || 0)}
          </div>
        </div>
        <div className="p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingDown size={12} style={{ color: '#f43f5e' }} />
            <span className="text-xs muted">Expenses</span>
          </div>
          <div className="text-sm font-semibold" style={{ color: '#f43f5e' }}>
            -{money(acc.monthlyExpense || 0)}
          </div>
        </div>
      </div>
    </div>
  );
}

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
    <Modal open={open} onClose={onClose}>
      <div className="p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">{initial ? 'Edit Account' : 'Add Account'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Account Name *</label>
            <input
              className="input"
              placeholder="e.g. HDFC Salary Account"
              value={form.accountName}
              onChange={(e) => f('accountName', e.target.value)}
            />
          </div>

          <div>
            <label className="label">Bank Name</label>
            <input
              className="input"
              placeholder="e.g. HDFC Bank"
              value={form.bankName}
              onChange={(e) => f('bankName', e.target.value)}
            />
          </div>

          <div>
            <label className="label">Account Type</label>
            <select className="input" value={form.accountType} onChange={(e) => f('accountType', e.target.value)}>
              {ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Last 4 Digits (optional)</label>
            <input
              className="input"
              placeholder="4521"
              maxLength={4}
              value={form.accountNumberLast4}
              onChange={(e) => f('accountNumberLast4', e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </div>

          {!initial && (
            <div>
              <label className="label">Opening Balance (₹)</label>
              <input
                className="input"
                type="number"
                placeholder="0"
                value={form.openingBalance}
                onChange={(e) => f('openingBalance', e.target.value)}
              />
              <p className="text-xs muted mt-1">Current money in this account before using the app.</p>
            </div>
          )}

          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {ACCOUNT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => f('color', c)}
                  className="w-8 h-8 rounded-full border-2 transition-all"
                  style={{
                    background: c,
                    borderColor: form.color === c ? '#fff' : 'transparent',
                    transform: form.color === c ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
          <button onClick={() => onSave(form)} className="btn btn-primary flex-1">
            {initial ? 'Update' : 'Add Account'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

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
      <div className="p-6 max-w-lg w-full max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold">{account.accountName}</h2>
            <div className="text-xl font-bold mt-0.5" style={{ color: account.balance >= 0 ? '#22c55e' : '#f43f5e' }}>
              {money(account.balance)}
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={18} /></button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 tab-list mb-4" style={{ background: '#0d0f16' }}>
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value}
              className={`tab ${filter === f.value ? 'active' : ''}`}
              onClick={() => setFilter(f.value)}
              style={{ fontSize: 11, padding: '6px 10px' }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {loading ? (
            <div className="text-center py-8 muted text-sm">Loading...</div>
          ) : txs.length === 0 ? (
            <div className="text-center py-8 muted text-sm">No transactions for this period.</div>
          ) : txs.map((tx: any) => {
            const cat = tx.categoryId;
            const isIncome = tx.type === 'income';
            return (
              <div key={tx._id} className="tx-row">
                <CategoryIcon icon={cat?.icon || 'Circle'} color={cat?.color || '#6b7280'} size={15} bgSize={34} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{tx.description}</div>
                  <div className="text-xs muted">{cat?.name || 'Uncategorized'} · {formatShortDate(tx.date)}</div>
                </div>
                <div
                  className="text-sm font-semibold"
                  style={{ color: isIncome ? '#22c55e' : '#f43f5e' }}
                >
                  {isIncome ? '+' : '-'}{money(tx.amount)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

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
  const totalIncome = accounts.reduce((s, a) => s + (a.monthlyIncome || 0), 0);
  const totalExpense = accounts.reduce((s, a) => s + (a.monthlyExpense || 0), 0);

  const handleSave = async (form: any) => {
    try {
      if (editTarget) {
        const r = await api.put(`/accounts/${editTarget._id}`, form);
        setAccounts((prev) => prev.map((a) => a._id === editTarget._id ? { ...r.data, monthlyIncome: a.monthlyIncome, monthlyExpense: a.monthlyExpense } : a));
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

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Accounts</h1>
          <p className="muted mt-1 text-sm">Your bank accounts and wallet balances.</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setFormOpen(true); }}
          className="btn btn-primary"
        >
          <Plus size={16} /> Add Account
        </button>
      </div>

      {/* Total balance overview */}
      <div
        className="card p-6 mb-6"
        style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))' }}
      >
        <div className="text-xs muted uppercase tracking-wider mb-2">Total Account Balance</div>
        <div className="text-4xl font-bold mb-4">{money(totalBalance)}</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <ArrowUpRight size={16} style={{ color: '#22c55e' }} />
            <div>
              <div className="text-xs muted">Income This Month</div>
              <div className="font-semibold" style={{ color: '#22c55e' }}>{money(totalIncome)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ArrowDownRight size={16} style={{ color: '#f43f5e' }} />
            <div>
              <div className="text-xs muted">Expenses This Month</div>
              <div className="font-semibold" style={{ color: '#f43f5e' }}>{money(totalExpense)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Account cards */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-52 rounded-2xl" />)}
        </div>
      ) : accounts.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 size={40} className="mx-auto mb-4 muted" />
          <div className="text-lg font-semibold mb-2">No accounts yet</div>
          <p className="muted text-sm mb-4">Add your first bank account or wallet to start tracking balances.</p>
          <button
            onClick={() => { setEditTarget(null); setFormOpen(true); }}
            className="btn btn-primary mx-auto"
          >
            <Plus size={16} /> Add Account
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Account form modal */}
      <AccountFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        onSave={handleSave}
        initial={editTarget}
      />

      {/* Transaction history modal */}
      <AccountTransactionsModal
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        account={viewTarget}
      />

      {/* Delete confirmation */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <div className="p-6 max-w-sm w-full">
          <h2 className="text-lg font-bold mb-2">Remove Account?</h2>
          <p className="muted text-sm mb-5">
            This will hide <strong>{deleteTarget?.accountName}</strong>. Existing transactions will not be deleted.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary flex-1">Cancel</button>
            <button onClick={handleDelete} className="btn flex-1" style={{ background: '#ef4444', color: '#fff' }}>Remove</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
