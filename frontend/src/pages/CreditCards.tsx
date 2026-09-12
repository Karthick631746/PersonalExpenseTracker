import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { money, pct } from '../lib/utils';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import { Plus, Pencil, Trash2, CreditCard, Wifi, Zap } from 'lucide-react';

const CARD_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
];

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

function CardVisual({ card, index }: { card: any; index: number }) {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const available = Math.max(0, (card.creditLimit || 0) - (card.outstandingBalance || 0));
  const utilization = pct(card.outstandingBalance || 0, card.creditLimit || 1);

  return (
    <div
      className="cc-card"
      style={{ background: gradient }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: 'absolute', top: -30, right: -30,
          width: 160, height: 160, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        }}
      />
      <div
        style={{
          position: 'absolute', bottom: -40, left: -20,
          width: 120, height: 120, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }}
      />

      {/* Top row */}
      <div className="flex justify-between items-start mb-4 relative">
        <div>
          <div className="font-bold text-white/90 text-sm">{card.bank || 'Bank'}</div>
          <div className="font-black text-white text-lg">{card.cardName}</div>
        </div>
        <Wifi size={22} style={{ color: 'rgba(255,255,255,0.7)', transform: 'rotate(90deg)' }} />
      </div>

      {/* Chip */}
      <div className="cc-chip" />

      {/* Card number */}
      <div className="font-mono text-base font-semibold text-white/90 mb-3 tracking-widest">
        •••• •••• •••• {card.last4 || '????'}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-end relative">
        <div>
          <div className="text-white/60 text-xs">Outstanding</div>
          <div className="text-white font-bold text-lg">{money(card.outstandingBalance || 0)}</div>
        </div>
        <div className="text-right">
          <div className="text-white/60 text-xs">Limit</div>
          <div className="text-white font-semibold">{money(card.creditLimit || 0)}</div>
        </div>
      </div>
    </div>
  );
}

export default function CreditCards() {
  const [cards, setCards] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    <div className="fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Credit Cards</h1>
          <p className="muted text-sm mt-1">{cards.length} card{cards.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> Add Card
        </button>
      </div>

      {/* Summary */}
      {cards.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Debt', value: totalDebt, color: '#f43f5e' },
            { label: 'Total Limit', value: totalLimit, color: '#8b5cf6' },
            { label: 'Available Credit', value: totalAvailable, color: '#22c55e' },
            { label: 'Utilization', value: overallUtil, color: overallUtil > 80 ? '#f43f5e' : overallUtil > 30 ? '#f59e0b' : '#22c55e', suffix: '%' },
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array(2).fill(0).map((_, i) => <div key={i} className="skeleton h-72 rounded-2xl" />)}
        </div>
      ) : cards.length === 0 ? (
        <div className="card p-12 text-center">
          <CreditCard size={48} className="mx-auto mb-4 muted" />
          <div className="font-semibold mb-1">No credit cards added</div>
          <div className="muted text-sm mb-5">Add a card to track debt, payments and utilization.</div>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={14} /> Add Credit Card
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card, idx) => {
            const available = Math.max(0, (card.creditLimit || 0) - (card.outstandingBalance || 0));
            const util = pct(card.outstandingBalance || 0, card.creditLimit || 1);
            const overLimit = (card.outstandingBalance || 0) > (card.creditLimit || 0);

            return (
              <div key={card._id} className="space-y-3">
                {/* Visual card */}
                <CardVisual card={card} index={idx} />

                {/* Details panel */}
                <div className="card p-4">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <div className="text-xs muted">Available</div>
                      <div className="font-bold text-sm" style={{ color: '#22c55e' }}>{money(available)}</div>
                    </div>
                    <div>
                      <div className="text-xs muted">Utilization</div>
                      <div
                        className="font-bold text-sm"
                        style={{ color: util > 80 ? '#f43f5e' : util > 30 ? '#f59e0b' : '#22c55e' }}
                      >
                        {util}%
                      </div>
                    </div>
                    {card.billingDate && (
                      <div>
                        <div className="text-xs muted">Billing Date</div>
                        <div className="text-sm font-medium">{card.billingDate}{['st','nd','rd'][((card.billingDate+90)%100-10)%10-1]||'th'} of month</div>
                      </div>
                    )}
                    {card.dueDate && (
                      <div>
                        <div className="text-xs muted">Payment Due</div>
                        <div className="text-sm font-medium">{card.dueDate}{['st','nd','rd'][((card.dueDate+90)%100-10)%10-1]||'th'} of month</div>
                      </div>
                    )}
                    {card.interestRate && (
                      <div>
                        <div className="text-xs muted">Interest Rate</div>
                        <div className="text-sm font-medium">{card.interestRate}% p.a.</div>
                      </div>
                    )}
                  </div>

                  {/* Utilization bar */}
                  <div className="mb-3">
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(util, 100)}%`,
                          background: util > 80 ? '#f43f5e' : util > 30 ? '#f59e0b' : '#22c55e',
                        }}
                      />
                    </div>
                    {overLimit && (
                      <div className="text-xs text-center mt-1" style={{ color: '#f43f5e' }}>
                        ⚠ Over limit by {money((card.outstandingBalance || 0) - (card.creditLimit || 0))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button className="btn btn-secondary flex-1 text-sm" onClick={() => openEdit(card)}>
                      <Pencil size={13} /> Edit
                    </button>
                    <button className="btn btn-danger btn-icon" onClick={() => setDeleteId(card._id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={open}
        title={editing ? 'Edit Credit Card' : 'Add Credit Card'}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Last 4 Digits</label>
              <input
                className="input"
                placeholder="4821"
                maxLength={4}
                value={form.last4}
                onChange={(e) => setForm({ ...form, last4: e.target.value.replace(/\D/, '').slice(0, 4) })}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Credit Limit</label>
              <input
                className="input"
                type="number"
                placeholder="100000"
                min="0"
                value={form.creditLimit}
                onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Outstanding Balance</label>
              <input
                className="input"
                type="number"
                placeholder="18450"
                min="0"
                value={form.outstandingBalance}
                onChange={(e) => setForm({ ...form, outstandingBalance: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Billing Date (day of month)</label>
              <input
                className="input"
                type="number"
                placeholder="1–31"
                min="1"
                max="31"
                value={form.billingDate}
                onChange={(e) => setForm({ ...form, billingDate: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Payment Due Date</label>
              <input
                className="input"
                type="number"
                placeholder="1–31"
                min="1"
                max="31"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update Card' : 'Add Card'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteId} title="Delete Credit Card" onClose={() => setDeleteId(null)} size="sm">
        <p className="muted text-sm mb-6">
          Delete this card? Note: transactions linked to this card will remain in your history.
        </p>
        <div className="flex gap-3">
          <button className="btn btn-secondary flex-1" onClick={() => setDeleteId(null)}>Cancel</button>
          <button className="btn btn-danger flex-1" onClick={doDelete}>Delete</button>
        </div>
      </Modal>
    </div>
  );
}
