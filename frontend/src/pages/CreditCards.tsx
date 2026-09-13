import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { money, pct } from '../lib/utils';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import {
  Plus, Pencil, Trash2, CreditCard, Wifi,
  ChevronRight, AlertTriangle, X, MoreVertical,
} from 'lucide-react';

/* ── Gradient palette ─────────────────────────────── */
const CARD_GRADIENTS = [
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  'linear-gradient(135deg, #2d1b69 0%, #11074e 50%, #0d0221 100%)',
  'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
  'linear-gradient(135deg, #360033 0%, #0b8793 100%)',
  'linear-gradient(135deg, #1a0533 0%, #5c0067 50%, #1a0533 100%)',
  'linear-gradient(135deg, #0a0a0a 0%, #2d0000 50%, #1a0000 100%)',
  'linear-gradient(135deg, #003973 0%, #e5e5be 100%)',
  'linear-gradient(135deg, #141e30 0%, #243b55 100%)',
];

/* ── Ordinal suffix helper ────────────────────────── */
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* ── Default form state ───────────────────────────── */
const defaultForm = {
  bank: '',
  cardName: '',
  last4: '',
  creditLimit: '',
  outstandingBalance: '',
  billingDate: '',
  dueDate: '',
  interestRate: '',
};

/* ── Bank card visual component ───────────────────── */
function CardVisual({ card, index }: { card: any; index: number }) {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const available = Math.max(0, (card.creditLimit || 0) - (card.outstandingBalance || 0));
  const util = pct(card.outstandingBalance || 0, card.creditLimit || 1);
  const overLimit = (card.outstandingBalance || 0) > (card.creditLimit || 0);
  const utilColor = overLimit || util > 80 ? '#f43f5e' : util > 30 ? '#f59e0b' : '#22c55e';

  return (
    <div
      className="cc-card select-none"
      style={{
        background: gradient,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)',
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Decorative blobs */}
      <div style={{
        position: 'absolute', top: -40, right: -40,
        width: 200, height: 200, borderRadius: '50%',
        background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -50, left: -30,
        width: 160, height: 160, borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '40%', right: '10%',
        width: 100, height: 100, borderRadius: '50%',
        background: 'rgba(255,255,255,0.03)', pointerEvents: 'none',
      }} />

      {/* Top row: bank name + NFC icon */}
      <div className="flex justify-between items-start relative" style={{ zIndex: 1 }}>
        <div>
          {card.bank && (
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', marginBottom: 2,
            }}>
              {card.bank}
            </div>
          )}
          <div style={{
            fontSize: 18, fontWeight: 800, color: '#fff',
            letterSpacing: '0.01em', lineHeight: 1.2,
          }}>
            {card.cardName}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Wifi size={20} style={{ color: 'rgba(255,255,255,0.6)', transform: 'rotate(90deg)' }} />
        </div>
      </div>

      {/* EMV Chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, zIndex: 1, position: 'relative' }}>
        <div className="cc-chip" style={{ margin: 0 }} />
        {/* Card number */}
        <div style={{
          fontFamily: 'monospace', fontSize: 15, fontWeight: 600,
          color: 'rgba(255,255,255,0.85)', letterSpacing: '0.18em',
        }}>
          •••• •••• •••• {card.last4 || '????'}
        </div>
      </div>

      {/* Bottom: outstanding + available + utilization bar */}
      <div style={{ zIndex: 1, position: 'relative' }}>
        {/* Util bar */}
        <div style={{
          height: 3, background: 'rgba(255,255,255,0.15)',
          borderRadius: 99, marginBottom: 14, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 99,
            width: `${Math.min(util, 100)}%`,
            background: utilColor,
            transition: 'width 0.6s ease',
          }} />
        </div>

        <div className="flex justify-between items-end">
          {/* Outstanding */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>
              Outstanding
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
              {money(card.outstandingBalance || 0)}
            </div>
            {overLimit && (
              <div style={{ fontSize: 10, color: '#f43f5e', marginTop: 3, fontWeight: 600 }}>
                ⚠ Over limit
              </div>
            )}
          </div>

          {/* Available + Limit */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>
              Available
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
              {money(available)}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              of {money(card.creditLimit || 0)}
            </div>
          </div>
        </div>

        {/* Due date badge */}
        {card.dueDate && (
          <div style={{
            marginTop: 10,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(255,255,255,0.12)', borderRadius: 99,
            padding: '4px 10px',
            fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)',
          }}>
            <span>Due {ordinal(card.dueDate)} of each month</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Card action sheet ────────────────────────────── */
function CardActionSheet({
  card,
  index,
  onClose,
  onEdit,
  onDelete,
}: {
  card: any;
  index: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const util = pct(card.outstandingBalance || 0, card.creditLimit || 1);
  const available = Math.max(0, (card.creditLimit || 0) - (card.outstandingBalance || 0));
  const overLimit = (card.outstandingBalance || 0) > (card.creditLimit || 0);

  return (
    <>
      {/* Overlay */}
      <div
        className="sheet-overlay"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.2s ease' }}
      />

      {/* Bottom sheet */}
      <div className="sheet slide-up" style={{ paddingBottom: 'max(28px, var(--sab))' }}>
        <div className="sheet-handle" />

        {/* Mini card preview in sheet */}
        <div style={{ padding: '12px 16px 0' }}>
          <CardVisual card={card} index={index} />
        </div>

        {/* Detail rows */}
        <div style={{ padding: '20px 16px 8px' }}>
          <div style={{
            background: 'var(--ink-2)', borderRadius: 16,
            border: '1px solid var(--border)', overflow: 'hidden',
          }}>

            {[
              { label: 'Available Credit', value: money(available), color: '#22c55e' },
              {
                label: 'Utilization',
                value: `${util}%`,
                color: overLimit || util > 80 ? '#f43f5e' : util > 30 ? '#f59e0b' : '#22c55e',
              },
              card.interestRate ? { label: 'Interest Rate', value: `${card.interestRate}% p.a.`, color: undefined } : null,
              card.billingDate ? { label: 'Billing Date', value: `${ordinal(card.billingDate)} of month`, color: undefined } : null,
              card.dueDate ? { label: 'Payment Due', value: `${ordinal(card.dueDate)} of month`, color: undefined } : null,
            ].filter(Boolean).map((row: any, i, arr) => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px',
                borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: row.color || '#eef0f6' }}>
                  {row.value}
                </span>
              </div>
            ))}

            {/* Util progress bar in sheet */}
            <div style={{ padding: '0 16px 14px' }}>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(util, 100)}%`,
                    background: overLimit || util > 80 ? '#f43f5e' : util > 30 ? '#f59e0b' : '#22c55e',
                  }}
                />
              </div>
              {overLimit && (
                <div className="flex items-center gap-1 mt-2" style={{ color: '#f43f5e', fontSize: 12 }}>
                  <AlertTriangle size={12} />
                  <span>Over limit by {money((card.outstandingBalance || 0) - (card.creditLimit || 0))}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '0 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            className="btn btn-secondary"
            style={{ width: '100%', minHeight: 52, fontSize: 15 }}
            onClick={onEdit}
          >
            <Pencil size={16} /> Edit Card
          </button>
          <button
            className="btn btn-danger"
            style={{ width: '100%', minHeight: 52, fontSize: 15 }}
            onClick={onDelete}
          >
            <Trash2 size={15} /> Delete Card
          </button>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', minHeight: 52, fontSize: 15 }}
            onClick={onClose}
          >
            <X size={16} /> Cancel
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Main page ────────────────────────────────────── */
export default function CreditCards() {
  const [cards, setCards] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<{ card: any; index: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/credit-cards');
      setCards(res.data);
    } catch {
      toast('Failed to load cards', 'error');
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

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      bank: c.bank || '',
      cardName: c.cardName || '',
      last4: c.last4 || '',
      creditLimit: String(c.creditLimit || ''),
      outstandingBalance: String(c.outstandingBalance || ''),
      billingDate: String(c.billingDate || ''),
      dueDate: String(c.dueDate || ''),
      interestRate: String(c.interestRate || ''),
    });
    setSelectedCard(null);
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cardName.trim()) return toast('Card name is required', 'error');
    if (form.last4 && form.last4.length !== 4) return toast('Last 4 digits must be exactly 4', 'error');

    setSaving(true);
    try {
      const body = {
        ...form,
        creditLimit: form.creditLimit ? Number(form.creditLimit) : 0,
        outstandingBalance: form.outstandingBalance ? Number(form.outstandingBalance) : 0,
        billingDate: form.billingDate ? Number(form.billingDate) : undefined,
        dueDate: form.dueDate ? Number(form.dueDate) : undefined,
        interestRate: form.interestRate ? Number(form.interestRate) : undefined,
      };

      if (editing) {
        await api.put(`/credit-cards/${editing._id}`, body);
        toast('Card updated');
      } else {
        await api.post('/credit-cards', body);
        toast('Card added');
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
      await api.delete(`/credit-cards/${deleteId}`);
      toast('Card deleted');
      setDeleteId(null);
      setSelectedCard(null);
      load();
    } catch {
      toast('Delete failed', 'error');
    }
  };

  const totalDebt = cards.reduce((s, c) => s + (c.outstandingBalance || 0), 0);
  const totalLimit = cards.reduce((s, c) => s + (c.creditLimit || 0), 0);
  const totalAvailable = Math.max(0, totalLimit - totalDebt);
  const overallUtil = pct(totalDebt, totalLimit || 1);

  return (
    <div className="fade-in page-content">

      {/* ── Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>Credit Cards</h1>
          <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>
            {cards.length} card{cards.length !== 1 ? 's' : ''}
          </p>
        </div>
        {/* Desktop add button — hidden on mobile (FAB used instead) */}
        <button className="btn btn-primary hidden md:flex" onClick={openNew}>
          <Plus size={16} /> Add Card
        </button>
      </div>

      {/* ── Summary stats ─────────────────────────────── */}
      {cards.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
          marginBottom: 24,
        }}>
          {[
            { label: 'Total Debt', value: money(totalDebt), color: '#f43f5e' },
            { label: 'Total Limit', value: money(totalLimit), color: '#8b5cf6' },
            { label: 'Available', value: money(totalAvailable), color: '#22c55e' },
            {
              label: 'Utilization',
              value: `${overallUtil}%`,
              color: overallUtil > 80 ? '#f43f5e' : overallUtil > 30 ? '#f59e0b' : '#22c55e',
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat-card" style={{ textAlign: 'center', padding: '16px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
                {label}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Card list ────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Array(2).fill(0).map((_, i) => (
            <div key={i} className="skeleton" style={{ borderRadius: 22, height: 200 }} />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="card" style={{ padding: '56px 24px', textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'var(--violet-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <CreditCard size={32} style={{ color: 'var(--violet)' }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>No credit cards yet</div>
          <div className="muted" style={{ fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>
            Add a card to track your debt,<br />payments and utilization.
          </div>
          <button className="btn btn-primary" onClick={openNew} style={{ minWidth: 160 }}>
            <Plus size={16} /> Add Credit Card
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {cards.map((card, idx) => (
            <button
              key={card._id}
              onClick={() => setSelectedCard({ card, index: idx })}
              style={{
                all: 'unset',
                display: 'block',
                width: '100%',
                cursor: 'pointer',
                borderRadius: 22,
                position: 'relative',
              }}
            >
              <CardVisual card={card} index={idx} />
              {/* Tap hint on desktop */}
              <div style={{
                position: 'absolute', top: 14, right: 14,
                background: 'rgba(0,0,0,0.35)',
                borderRadius: 99, padding: '4px 8px',
                display: 'flex', alignItems: 'center', gap: 3,
                pointerEvents: 'none',
              }}>
                <MoreVertical size={13} style={{ color: 'rgba(255,255,255,0.7)' }} />
              </div>
            </button>
          ))}
          {/* Bottom spacing for FAB */}
          <div style={{ height: 16 }} />
        </div>
      )}

      {/* ── FAB (mobile add) ─────────────────────────── */}
      <button className="fab" onClick={openNew} aria-label="Add credit card">
        <Plus size={24} />
      </button>

      {/* ── Card action bottom sheet ──────────────────── */}
      {selectedCard && (
        <CardActionSheet
          card={selectedCard.card}
          index={selectedCard.index}
          onClose={() => setSelectedCard(null)}
          onEdit={() => openEdit(selectedCard.card)}
          onDelete={() => {
            setDeleteId(selectedCard.card._id);
            setSelectedCard(null);
          }}
        />
      )}

      {/* ── Add / Edit Modal ──────────────────────────── */}
      <Modal
        open={open}
        title={editing ? 'Edit Credit Card' : 'Add Credit Card'}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={save} className="space-y-4">

          {/* Bank + Card name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">Bank Name</label>
              <input
                className="input"
                placeholder="e.g. HDFC"
                value={form.bank}
                onChange={(e) => setForm({ ...form, bank: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Card Name *</label>
              <input
                className="input"
                placeholder="e.g. Millennia"
                value={form.cardName}
                onChange={(e) => setForm({ ...form, cardName: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Last 4 + Interest rate */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">Last 4 Digits</label>
              <input
                className="input"
                placeholder="4821"
                maxLength={4}
                inputMode="numeric"
                value={form.last4}
                onChange={(e) => setForm({ ...form, last4: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              />
            </div>
            <div>
              <label className="label">Interest Rate (%)</label>
              <input
                className="input"
                type="number"
                placeholder="3.5"
                min="0"
                max="100"
                step="0.01"
                value={form.interestRate}
                onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
              />
            </div>
          </div>

          {/* Credit limit + Outstanding */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">Credit Limit</label>
              <input
                className="input"
                type="number"
                placeholder="100000"
                min="0"
                inputMode="decimal"
                value={form.creditLimit}
                onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Outstanding</label>
              <input
                className="input"
                type="number"
                placeholder="18450"
                min="0"
                inputMode="decimal"
                value={form.outstandingBalance}
                onChange={(e) => setForm({ ...form, outstandingBalance: e.target.value })}
              />
            </div>
          </div>

          {/* Billing date + Due date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">Billing Date (1–31)</label>
              <input
                className="input"
                type="number"
                placeholder="5"
                min="1"
                max="31"
                inputMode="numeric"
                value={form.billingDate}
                onChange={(e) => setForm({ ...form, billingDate: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Payment Due (1–31)</label>
              <input
                className="input"
                type="number"
                placeholder="20"
                min="1"
                max="31"
                inputMode="numeric"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          </div>

          {/* Live preview of card (if enough info) */}
          {(form.cardName || form.bank) && (
            <div style={{ borderRadius: 16, overflow: 'hidden' }}>
              <div className="label" style={{ marginBottom: 8 }}>Preview</div>
              <CardVisual
                card={{
                  bank: form.bank,
                  cardName: form.cardName || 'Card Name',
                  last4: form.last4,
                  creditLimit: Number(form.creditLimit) || 0,
                  outstandingBalance: Number(form.outstandingBalance) || 0,
                  dueDate: form.dueDate ? Number(form.dueDate) : undefined,
                }}
                index={editing ? cards.findIndex((c) => c._id === editing._id) : cards.length}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              className="btn btn-secondary flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={saving}
            >
              {saving ? 'Saving…' : editing ? 'Update Card' : 'Add Card'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete confirm ────────────────────────────── */}
      <Modal
        open={!!deleteId}
        title="Delete Credit Card"
        onClose={() => setDeleteId(null)}
        size="sm"
      >
        <div style={{ textAlign: 'center', paddingBottom: 8 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(244,63,94,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Trash2 size={24} style={{ color: '#f43f5e' }} />
          </div>
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            Delete this card? Transactions linked to this card will remain in your history.
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
    </div>
  );
}
