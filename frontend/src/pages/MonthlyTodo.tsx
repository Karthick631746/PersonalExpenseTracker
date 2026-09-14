import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { money, formatDate } from '../lib/utils';
import { toast } from '../components/Toast';
import Modal from '../components/Modal';
import {
  CheckCircle2, Circle, Plus, Edit2, Trash2, CreditCard,
  ChevronLeft, ChevronRight, Zap, AlertCircle, Check, Building2, RefreshCw,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const TODO_CATEGORIES = [
  { label: 'Credit Card', emoji: '💳' },
  { label: 'Electricity',  emoji: '💡' },
  { label: 'Recharge',     emoji: '📱' },
  { label: 'Internet',     emoji: '🌐' },
  { label: 'Rent',         emoji: '🏠' },
  { label: 'Insurance',    emoji: '🛡️' },
  { label: 'Loan',         emoji: '💰' },
  { label: 'Subscription', emoji: '📺' },
  { label: 'Investment',   emoji: '📈' },
  { label: 'Bills',        emoji: '🧾' },
  { label: 'Other',        emoji: '📋' },
];

const getCategoryEmoji = (cat: string) =>
  TODO_CATEGORIES.find((c) => c.label === cat)?.emoji ?? '📋';

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
function formatDueDay(day: number | undefined | null): string {
  if (!day) return '';
  const suffix = ['th','st','nd','rd'][(day % 100 > 10 && day % 100 < 14) ? 0 : Math.min(day % 10, 3)] ?? 'th';
  return `${day}${suffix}`;
}

function formatDueDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Compute a full Date from day-of-month + todo month + todo year
function computeFullDueDate(day: number | undefined | null, month: number, year: number): Date | null {
  if (!day) return null;
  return new Date(year, month - 1, day);
}

// ─────────────────────────────────────────────────────────
// TodoItem
// ─────────────────────────────────────────────────────────
function TodoItem({ todo, onEdit, onDelete, onComplete, onUncomplete }: any) {
  const card      = todo.linkedCreditCardId;
  const isCCTodo  = todo.category === 'Credit Card';
  // For CC todos: use live outstanding from the populated card, not the stale todo.amount
  const liveAmount = isCCTodo && card ? (card.outstandingBalance ?? todo.amount ?? 0) : (todo.amount ?? 0);
  const isOverdue = !todo.isCompleted && todo.dueDate && new Date().getDate() > todo.dueDate;
  const paidAcct  = todo.completedWithAccountId;

  return (
    <div
      className="card p-4 transition-all"
      style={{
        borderLeft: `3.5px solid ${
          todo.isCompleted ? '#22c55e'
          : isOverdue       ? '#ef4444'
          : isCCTodo        ? '#f59e0b'
                            : '#8b5cf6'
        }`,
        opacity: todo.isCompleted ? 0.75 : 1,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Complete toggle */}
        <button
          onClick={() => todo.isCompleted ? onUncomplete(todo) : onComplete(todo)}
          className="mt-0.5 flex-shrink-0 transition-colors"
          style={{ color: todo.isCompleted ? '#22c55e' : '#636878' }}
        >
          {todo.isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
        </button>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{getCategoryEmoji(todo.category)}</span>
            <span className={`font-semibold text-base ${todo.isCompleted ? 'line-through muted' : ''}`}>
              {todo.title}
            </span>
          </div>

          {/* Amount + due chips */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1">
            {liveAmount > 0 && (
              <span className="text-sm font-bold" style={{ color: isCCTodo ? '#f59e0b' : '#8b5cf6' }}>
                {money(liveAmount)}
                {isCCTodo && !todo.isCompleted && (
                  <span className="ml-1 text-[10px] muted font-normal">(live)</span>
                )}
              </span>
            )}

            {/* Due date */}
            {todo.dueDate && (() => {
              // For CC todos: compute the full due date using todo.month + todo.year
              const fullDate = isCCTodo
                ? computeFullDueDate(todo.dueDate, todo.month, todo.year)
                : null;
              const label = fullDate
                ? `Due ${fullDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : `Due ${formatDueDay(todo.dueDate)}`;
              return (
                <span className={`text-xs flex items-center gap-1 font-medium ${isOverdue && !todo.isCompleted ? 'text-red-400' : 'muted'}`}>
                  {isOverdue && !todo.isCompleted && <AlertCircle size={12} />}
                  {label}
                </span>
              );
            })()}

            {/* CC card chip */}
            {isCCTodo && card && (
              <span className="text-xs flex items-center gap-1 muted">
                <CreditCard size={11} />
                {card.cardName}{card.last4 ? ` ···${card.last4}` : ''}
              </span>
            )}

            {/* Category badge */}
            <span
              className="badge text-[10px]"
              style={{
                background: isCCTodo ? 'rgba(245,158,11,0.15)' : 'rgba(139,92,246,0.15)',
                color:      isCCTodo ? '#f59e0b'                : '#a78bfa',
              }}
            >
              {todo.category}
            </span>
          </div>

          {/* Paid-state summary */}
          {todo.isCompleted && (
            <div
              className="mt-3 rounded-xl p-3 text-xs space-y-1 font-medium"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
            >
              <div className="flex items-center gap-1.5 font-bold" style={{ color: '#22c55e' }}>
                <Check size={13} /> Paid {todo.completedAt ? `on ${formatDate(todo.completedAt)}` : ''}
              </div>
              {paidAcct && (
                <div className="muted flex items-center gap-1.5">
                  <Building2 size={11} />
                  Paid from: {paidAcct.accountName}
                  {paidAcct.accountNumberLast4 ? ` ···${paidAcct.accountNumberLast4}` : ''}
                </div>
              )}
              {isCCTodo && card && (
                <div className="muted flex items-center gap-1.5">
                  <CreditCard size={11} />
                  Card: {card.cardName}{card.last4 ? ` ···${card.last4}` : ''}
                </div>
              )}
            </div>
          )}

          {/* Action buttons — only for pending todos */}
          {!todo.isCompleted && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onComplete(todo)}
                className="btn text-xs px-4 py-2 flex items-center gap-1 font-semibold flex-1"
                style={{
                  background: isCCTodo ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)',
                  color:      isCCTodo ? '#f59e0b'                : '#22c55e',
                }}
              >
                <Check size={14} />{isCCTodo ? 'Pay Bill' : 'Mark Paid'}
              </button>
              <button onClick={() => onEdit(todo)} className="btn btn-secondary px-3 py-2">
                <Edit2 size={14} />
              </button>
              <button onClick={() => onDelete(todo)} className="btn btn-secondary px-3 py-2">
                <Trash2 size={14} style={{ color: '#f43f5e' }} />
              </button>
            </div>
          )}

          {/* Uncomplete for already-paid */}
          {todo.isCompleted && (
            <button
              onClick={() => onUncomplete(todo)}
              className="btn btn-secondary text-xs mt-3 py-2 px-3"
            >
              Mark unpaid
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TodoFormModal — Add / Edit
// ─────────────────────────────────────────────────────────
function TodoFormModal({ open, onClose, onSave, initial }: any) {
  const [form, setForm] = useState({
    title: '', description: '', category: 'Other',
    amount: '', dueDate: '', linkedCreditCardId: '',
  });
  const [creditCards, setCreditCards]   = useState<any[]>([]);
  const [cardInfo,    setCardInfo]      = useState<any>(null);
  const [loadingCard, setLoadingCard]   = useState(false);

  // Load credit cards when opening
  useEffect(() => {
    if (!open) return;
    api.get('/credit-cards').then((r) => setCreditCards(r.data || [])).catch(() => {});
  }, [open]);

  // When editing, populate form
  useEffect(() => {
    if (initial) {
      setForm({
        title: initial.title || '',
        description: initial.description || '',
        category: initial.category || 'Other',
        amount: initial.amount ? String(initial.amount) : '',
        dueDate: initial.dueDate ? String(initial.dueDate) : '',
        linkedCreditCardId: initial.linkedCreditCardId?._id || initial.linkedCreditCardId || '',
      });
      setCardInfo(null);
    } else {
      setForm({ title: '', description: '', category: 'Other', amount: '', dueDate: '', linkedCreditCardId: '' });
      setCardInfo(null);
    }
  }, [initial, open]);

  // Auto-fetch bill info when a CC is selected
  useEffect(() => {
    const id = form.linkedCreditCardId;
    if (!id || form.category !== 'Credit Card') {
      setCardInfo(null);
      return;
    }
    setLoadingCard(true);
    api.get(`/credit-cards/${id}/bill-info`)
      .then((r) => {
        setCardInfo(r.data);
        // Auto-fill amount and due date from card
        setForm((prev) => ({
          ...prev,
          title: prev.title || `${r.data.cardName} Bill`,
          amount: String(r.data.outstandingBalance ?? ''),
          dueDate: r.data.dueDay ? String(r.data.dueDay) : prev.dueDate,
        }));
      })
      .catch(() => setCardInfo(null))
      .finally(() => setLoadingCard(false));
  }, [form.linkedCreditCardId, form.category]);

  const f = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const isCCCategory = form.category === 'Credit Card';

  const handleRefreshCard = () => {
    const id = form.linkedCreditCardId;
    if (!id) return;
    setLoadingCard(true);
    api.get(`/credit-cards/${id}/bill-info`)
      .then((r) => {
        setCardInfo(r.data);
        setForm((prev) => ({ ...prev, amount: String(r.data.outstandingBalance ?? '') }));
      })
      .catch(() => {})
      .finally(() => setLoadingCard(false));
  };

  return (
    <Modal open={open} onClose={onClose} fullScreen>
      <div className="p-5 max-w-md mx-auto w-full pb-20">
        <h2 className="text-xl font-bold mb-5 text-center">{initial ? 'Edit Task' : 'Add Monthly Task'}</h2>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="label">Title *</label>
            <input
              className="input text-lg"
              placeholder="e.g. Electricity Bill"
              value={form.title}
              onChange={(e) => f('title', e.target.value)}
            />
          </div>

          {/* Category chips */}
          <div>
            <label className="label">Category</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-1">
              {TODO_CATEGORIES.map((c) => (
                <button
                  key={c.label}
                  onClick={() => f('category', c.label)}
                  className="cat-chip"
                  style={{
                    borderColor: form.category === c.label ? (c.label === 'Credit Card' ? '#f59e0b' : '#8b5cf6') : '#1e2130',
                    background:  form.category === c.label ? (c.label === 'Credit Card' ? 'rgba(245,158,11,0.15)' : 'rgba(139,92,246,0.15)') : 'transparent',
                    color:       form.category === c.label ? (c.label === 'Credit Card' ? '#f59e0b' : '#a78bfa') : '#8b92a5',
                    minHeight: 72,
                  }}
                >
                  <span className="text-2xl">{c.emoji}</span>
                  <span className="text-xs font-semibold">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* CC selector — shown only for Credit Card category */}
          {isCCCategory && (
            <div
              className="rounded-2xl p-4"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1.5px solid rgba(245,158,11,0.25)' }}
            >
              <label className="label mb-2" style={{ color: '#f59e0b' }}>
                <CreditCard size={14} style={{ display: 'inline', marginRight: 4 }} />
                Select Credit Card *
              </label>

              {creditCards.length === 0 ? (
                <p className="text-sm text-amber-400">No credit cards found. Add one first.</p>
              ) : (
                <select
                  className="input font-medium"
                  value={form.linkedCreditCardId}
                  onChange={(e) => f('linkedCreditCardId', e.target.value)}
                >
                  <option value="">— Select credit card —</option>
                  {creditCards.map((c: any) => (
                    <option key={c._id} value={c._id}>
                      {c.cardName}{c.last4 ? ` ···${c.last4}` : ''} — Outstanding: {money(c.outstandingBalance)}
                    </option>
                  ))}
                </select>
              )}

              {/* Live card info panel */}
              {loadingCard && (
                <p className="text-xs text-amber-400 mt-3 flex items-center gap-2">
                  <RefreshCw size={12} className="animate-spin" /> Fetching card details…
                </p>
              )}
              {!loadingCard && cardInfo && (
                <div className="mt-3 rounded-xl p-3 space-y-1" style={{ background: 'rgba(0,0,0,0.25)' }}>
                  <div className="font-bold text-sm" style={{ color: '#f59e0b' }}>
                    {cardInfo.cardName}{cardInfo.last4 ? ` ···${cardInfo.last4}` : ''}
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="muted">Outstanding</span>
                    <span style={{ color: '#f43f5e' }}>{money(cardInfo.outstandingBalance)}</span>
                  </div>
                  {cardInfo.nextDueDate && (
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="muted">Next Due Date</span>
                      <span style={{ color: '#f59e0b' }}>{formatDueDate(cardInfo.nextDueDate)}</span>
                    </div>
                  )}
                  <button
                    onClick={handleRefreshCard}
                    className="text-xs mt-2 flex items-center gap-1 muted"
                  >
                    <RefreshCw size={10} /> Refresh outstanding
                  </button>
                </div>
              )}
              {!loadingCard && cardInfo && (
                <p className="text-xs mt-2 font-medium" style={{ color: '#f59e0b' }}>
                  💡 Outstanding and due date have been auto-filled from the card.
                </p>
              )}
            </div>
          )}

          {/* Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount (₹)</label>
              <input
                className="input"
                type="number"
                placeholder="0"
                value={form.amount}
                onChange={(e) => f('amount', e.target.value)}
                readOnly={isCCCategory && !!cardInfo}
              />
              {isCCCategory && cardInfo && (
                <p className="text-[10px] muted mt-1">Auto-filled from card</p>
              )}
            </div>
            <div>
              <label className="label">Due Day of Month</label>
              <input
                className="input"
                type="number"
                min="1" max="31"
                placeholder="25"
                value={form.dueDate}
                onChange={(e) => f('dueDate', e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description (optional)</label>
            <input
              className="input"
              placeholder="Additional notes"
              value={form.description}
              onChange={(e) => f('description', e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn btn-secondary flex-1 py-3.5">Cancel</button>
          <button
            onClick={() => onSave({
              ...form,
              linkedCreditCardId: isCCCategory ? form.linkedCreditCardId || undefined : undefined,
            })}
            className="btn btn-primary flex-1 py-3.5"
          >
            {initial ? 'Update' : 'Add Task'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────
// PayBillModal — CC payment + normal expense payment
// ─────────────────────────────────────────────────────────
function PayBillModal({ open, onClose, onConfirm, todo, accounts }: any) {
  const [accountId, setAccountId] = useState('');
  const [amount,    setAmount]    = useState('');
  const [paying,    setPaying]    = useState(false);

  const isCCTodo   = todo?.category === 'Credit Card';
  const linkedCard = todo?.linkedCreditCardId;
  // Always use live outstanding from the populated card for CC todos
  const outstanding = isCCTodo && linkedCard ? (linkedCard.outstandingBalance ?? 0) : (todo?.amount ?? 0);

  useEffect(() => {
    if (todo) {
      setAmount(outstanding > 0 ? String(outstanding) : '');
      setAccountId('');
    }
  }, [todo, open]);

  if (!todo) return null;

  const amountNum = Number(amount);
  const isOverpayment = isCCTodo && linkedCard && amountNum > outstanding;
  const isPartial     = isCCTodo && linkedCard && amountNum < outstanding && amountNum > 0;

  const handleConfirm = async () => {
    if (paying) return;
    if (!accountId) { toast('Please select an account', 'error'); return; }
    if (!amountNum || amountNum <= 0) { toast('Enter a valid amount', 'error'); return; }
    if (isOverpayment) { toast('Amount exceeds outstanding balance', 'error'); return; }
    setPaying(true);
    try {
      await onConfirm({ accountId, amount: amountNum });
    } finally {
      setPaying(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} fullScreen>
      <div className="p-5 max-w-sm mx-auto w-full">
        <h2 className="text-xl font-bold text-center mb-5">
          {isCCTodo ? '💳 Pay Credit Card Bill' : '✅ Mark as Paid'}
        </h2>

        {/* Card / Todo summary */}
        <div
          className="card p-5 mb-5 text-center"
          style={{
            background:   isCCTodo ? 'rgba(245,158,11,0.08)'  : 'rgba(34,197,94,0.08)',
            borderColor:  isCCTodo ? 'rgba(245,158,11,0.2)'   : 'rgba(34,197,94,0.2)',
          }}
        >
          <div className="font-bold text-lg mb-1">{todo.title}</div>
          {isCCTodo && linkedCard && (
            <div className="flex flex-col items-center gap-1 mt-1">
              <span className="text-sm font-medium muted">
                {linkedCard.cardName}{linkedCard.last4 ? ` ···${linkedCard.last4}` : ''}
              </span>
              <span className="text-2xl font-bold mt-1" style={{ color: '#f43f5e' }}>
                {money(outstanding)}
              </span>
              <span className="text-xs muted">Current Outstanding</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Amount */}
          <div>
            <label className="label">{isCCTodo ? 'Payment Amount' : 'Amount Paid'} (₹)</label>
            <input
              className="input text-lg font-bold"
              type="number"
              value={amount}
              min="0.01" step="0.01"
              onChange={(e) => setAmount(e.target.value)}
            />
            {/* Quick-fill buttons for CC */}
            {isCCTodo && outstanding > 0 && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setAmount(String(outstanding))}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1.5px solid rgba(34,197,94,0.3)' }}
                >
                  Full: {money(outstanding)}
                </button>
                <button
                  onClick={() => setAmount(String(Math.ceil(outstanding / 2)))}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1.5px solid rgba(245,158,11,0.3)' }}
                >
                  Half: {money(Math.ceil(outstanding / 2))}
                </button>
              </div>
            )}
          </div>

          {/* Account selector */}
          <div>
            <label className="label">{isCCTodo ? 'Pay From Bank Account' : 'Paid From Account'}</label>
            <div className="space-y-2 max-h-56 overflow-y-auto mt-1">
              {accounts?.map((a: any) => {
                const sel = accountId === a._id;
                return (
                  <button
                    key={a._id}
                    onClick={() => setAccountId(a._id)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left"
                    style={{
                      borderColor: sel ? '#8b5cf6' : '#1e2130',
                      background:  sel ? 'rgba(139,92,246,0.12)' : '#0d0f16',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                        style={{ background: 'rgba(139,92,246,0.15)' }}>
                        <Building2 size={18} style={{ color: '#8b5cf6' }} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{a.accountName}</div>
                        {a.bankName && <div className="text-xs muted">{a.bankName}</div>}
                      </div>
                    </div>
                    <span className="text-sm font-bold" style={{ color: a.balance >= 0 ? '#22c55e' : '#f43f5e' }}>
                      {money(a.balance)}
                    </span>
                  </button>
                );
              })}
              {(!accounts || accounts.length === 0) && (
                <p className="text-sm text-amber-400 mt-1">No accounts found.</p>
              )}
            </div>
          </div>
        </div>

        {/* Warnings */}
        {isOverpayment && (
          <div className="rounded-xl p-3 mt-4 text-xs font-semibold"
            style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e' }}>
            ⚠️ Payment {money(amountNum)} exceeds outstanding {money(outstanding)}.
          </div>
        )}
        {isPartial && (
          <div className="rounded-xl p-3 mt-4 text-xs font-semibold"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
            📝 Partial payment — remaining {money(outstanding - amountNum)} stays outstanding.
          </div>
        )}

        <div className="rounded-xl p-3 mt-4 text-xs muted font-medium text-center"
          style={{ background: '#0d0f16', border: '1px solid #1e2130' }}>
          {isCCTodo
            ? '✓ Bank balance decreases  ✓ CC outstanding decreases  ✓ No double expense'
            : '✓ Account balance decreases  ✓ Expense recorded'}
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn btn-secondary flex-1 py-3.5" disabled={paying}>
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!accountId || !amountNum || amountNum <= 0 || isOverpayment || paying}
            className="btn btn-primary flex-1 py-3.5"
            style={{ opacity: (!accountId || !amountNum || amountNum <= 0 || isOverpayment || paying) ? 0.5 : 1 }}
          >
            {paying ? 'Processing…' : isCCTodo ? '💳 Pay Bill' : '✓ Confirm'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────
export default function MonthlyTodo() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [data,  setData]  = useState<any>({ todos: [], total: 0, pending: 0, completed: 0, count: 0 });
  const [accounts,  setAccounts]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [formOpen,  setFormOpen]  = useState(false);
  const [editTarget,   setEditTarget]   = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [payTarget,    setPayTarget]    = useState<any>(null);

  const load = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    Promise.all([
      api.get(`/monthly-todos?month=${month}&year=${year}`, { signal }),
      api.get('/accounts', { signal }),
    ])
      .then(([todosRes, accRes]) => {
        setData(todosRes.data);
        setAccounts(accRes.data);
      })
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'AbortError') return;
        toast('Failed to load', 'error');
      })
      .finally(() => setLoading(false));
  }, [month, year]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const handleSave = async (form: any) => {
    try {
      const payload = {
        ...form,
        month, year,
        amount:  form.amount  ? Number(form.amount)  : undefined,
        dueDate: form.dueDate ? Number(form.dueDate) : undefined,
        linkedCreditCardId: form.linkedCreditCardId || undefined,
      };
      if (editTarget) {
        const r = await api.put(`/monthly-todos/${editTarget._id}`, payload);
        setData((prev: any) => ({
          ...prev,
          todos: prev.todos.map((t: any) => t._id === editTarget._id ? r.data : t),
        }));
        toast('Task updated', 'success');
      } else {
        const r = await api.post('/monthly-todos', payload);
        setData((prev: any) => ({
          ...prev, todos: [...prev.todos, r.data], count: prev.count + 1,
        }));
        toast('Task added', 'success');
      }
      setFormOpen(false);
      setEditTarget(null);
    } catch (e: any) {
      toast(e.response?.data?.message || 'Error', 'error');
    }
  };

  const handlePay = async ({ accountId, amount }: { accountId: string; amount: number }) => {
    if (!payTarget) return;

    // Guard: already completed
    if (payTarget.isCompleted) {
      toast('Already marked as paid', 'error');
      setPayTarget(null);
      return;
    }

    try {
      const res = await api.post(`/monthly-todos/${payTarget._id}/complete`, {
        createTransaction: true,
        accountId,
        amount,
      });

      const { todo: updatedTodo } = res.data;

      // Update the specific todo in state immediately
      setData((prev: any) => ({
        ...prev,
        todos: prev.todos.map((t: any) => t._id === payTarget._id ? updatedTodo : t),
      }));

      const isCCTodo = payTarget.category === 'Credit Card';
      toast(isCCTodo ? `💳 CC bill paid — ${money(amount)}!` : `✅ Marked as paid — ${money(amount)}`, 'success');
      setPayTarget(null);

      // Reload to get fresh CC outstanding from the card (in case it changed)
      load();
    } catch (e: any) {
      toast(e.response?.data?.message || 'Payment failed', 'error');
    }
  };

  const handleUncomplete = async (todo: any) => {
    try {
      await api.post(`/monthly-todos/${todo._id}/uncomplete`);
      await load();
    } catch {
      toast('Error', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/monthly-todos/${deleteTarget._id}`);
      setData((prev: any) => ({
        ...prev,
        todos: prev.todos.filter((t: any) => t._id !== deleteTarget._id),
        count: prev.count - 1,
      }));
      toast('Task removed', 'success');
    } catch {
      toast('Failed to delete', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const todos          = (data.todos || []) as any[];
  const pendingTodos   = todos.filter((t) => !t.isCompleted);
  const completedTodos = todos.filter((t) => t.isCompleted);
  const completionPct  = todos.length > 0 ? Math.round((data.completed / todos.length) * 100) : 0;

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Monthly To-Do</h1>
          <p className="muted mt-1 text-sm">Recurring financial payments checklist.</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setFormOpen(true); }}
          className="hidden md:flex btn btn-primary"
        >
          <Plus size={16} /> Add Task
        </button>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between mb-5 bg-[#11131c] rounded-2xl p-2 border border-[#1e2130]">
        <button onClick={prevMonth} className="btn btn-ghost btn-icon" style={{ background: '#161821' }}>
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-bold">{MONTHS[month - 1]} {year}</h2>
        <button onClick={nextMonth} className="btn btn-ghost btn-icon" style={{ background: '#161821' }}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Progress summary */}
      {todos.length > 0 && (
        <div className="card p-5 mb-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold">
              Completed: <strong>{data.completed}</strong> / {todos.length}
            </span>
            <span className="text-sm font-bold" style={{ color: '#f43f5e' }}>
              Pending: {money(data.pending || 0)}
            </span>
          </div>
          <div className="progress-track" style={{ height: 8 }}>
            <div
              className="progress-fill"
              style={{
                width: `${completionPct}%`,
                background: completionPct === 100
                  ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                  : 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs font-medium muted">
            <span>{completionPct}% done</span>
            {completionPct === 100 && <span style={{ color: '#22c55e' }}>🎉 All paid!</span>}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      ) : todos.length === 0 ? (
        <div className="card p-12 text-center mt-5">
          <Zap size={48} className="mx-auto mb-4 muted" />
          <div className="text-lg font-bold mb-2">No tasks for {MONTHS[month - 1]}</div>
          <p className="muted text-sm mb-6">Add recurring monthly payments like rent, bills, and CC dues.</p>
          <button
            onClick={() => { setEditTarget(null); setFormOpen(true); }}
            className="btn btn-primary mx-auto py-3 px-6"
          >
            <Plus size={16} /> Add First Task
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingTodos.length > 0 && (
            <div>
              <h3 className="text-xs font-bold muted uppercase tracking-wider mb-3">
                Pending ({pendingTodos.length})
              </h3>
              <div className="space-y-3">
                {pendingTodos.map((todo: any) => (
                  <TodoItem
                    key={todo._id}
                    todo={todo}
                    onEdit={(t: any)       => { setEditTarget(t); setFormOpen(true); }}
                    onDelete={(t: any)     => setDeleteTarget(t)}
                    onComplete={(t: any)   => setPayTarget(t)}
                    onUncomplete={handleUncomplete}
                  />
                ))}
              </div>
            </div>
          )}
          {completedTodos.length > 0 && (
            <div>
              <h3 className="text-xs font-bold muted uppercase tracking-wider mb-3">
                Completed ({completedTodos.length})
              </h3>
              <div className="space-y-3">
                {completedTodos.map((todo: any) => (
                  <TodoItem
                    key={todo._id}
                    todo={todo}
                    onEdit={(t: any)       => { setEditTarget(t); setFormOpen(true); }}
                    onDelete={(t: any)     => setDeleteTarget(t)}
                    onComplete={(t: any)   => setPayTarget(t)}
                    onUncomplete={handleUncomplete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        className="fab md:hidden"
        onClick={() => { setEditTarget(null); setFormOpen(true); }}
        aria-label="Add Task"
      >
        <Plus size={24} />
      </button>

      <TodoFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        onSave={handleSave}
        initial={editTarget}
      />

      <PayBillModal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        onConfirm={handlePay}
        todo={payTarget}
        accounts={accounts}
      />

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <div className="p-6 max-w-sm w-full mx-auto text-center">
          <h2 className="text-xl font-bold mb-2">Remove Task?</h2>
          <p className="muted text-sm mb-6">
            Delete <strong>{deleteTarget?.title}</strong> from this month?
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary flex-1 py-3">Cancel</button>
            <button onClick={handleDelete} className="btn flex-1 py-3" style={{ background: '#ef4444', color: '#fff' }}>
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
