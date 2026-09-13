import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { toast } from '../components/Toast';
import Modal from '../components/Modal';
import { CreditCard, Plus, Edit2, Trash2, X, Calendar } from 'lucide-react';

const CARD_GRADIENTS = [
  'linear-gradient(135deg, #1a1f35 0%, #2d1f5a 100%)',
  'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
  'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
  'linear-gradient(135deg, #373b44 0%, #4286f4 100%)',
  'linear-gradient(135deg, #4a0072 0%, #7b1fa2 100%)',
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
];

function CardFace({ card }: { card: any }) {
  const acc = card.accountId;
  const gradient = card.color || CARD_GRADIENTS[0];
  const isGradient = gradient.includes('gradient');

  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: isGradient ? gradient : `linear-gradient(135deg, ${gradient} 0%, ${gradient}99 100%)`,
        minHeight: 180,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Decorative circles */}
      <div
        className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-10"
        style={{ background: 'rgba(255,255,255,0.3)' }}
      />
      <div
        className="absolute -right-2 top-12 w-24 h-24 rounded-full opacity-10"
        style={{ background: 'rgba(255,255,255,0.2)' }}
      />

      {/* Bank name */}
      <div className="flex justify-between items-start mb-8">
        <div className="text-sm font-semibold text-white/80">{card.bank || card.cardName}</div>
        <CreditCard size={24} className="text-white/60" />
      </div>

      {/* Card number */}
      <div className="text-lg font-mono font-bold text-white tracking-widest mb-4">
        •••• •••• •••• {card.last4 || '****'}
      </div>

      {/* Bottom row */}
      <div className="flex justify-between items-end">
        <div>
          <div className="text-xs text-white/50 mb-0.5">Linked Account</div>
          <div className="text-sm text-white/90 font-medium">{acc?.accountName || '—'}</div>
        </div>
        {card.expiryMonth && card.expiryYear && (
          <div className="text-right">
            <div className="text-xs text-white/50 mb-0.5">EXPIRES</div>
            <div className="text-sm text-white/90 font-mono">
              {String(card.expiryMonth).padStart(2, '0')}/{String(card.expiryYear).slice(-2)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DebitCardFormModal({ open, onClose, onSave, initial, accounts }: any) {
  const [form, setForm] = useState({
    cardName: '',
    bank: '',
    last4: '',
    accountId: '',
    expiryMonth: '',
    expiryYear: '',
    color: CARD_GRADIENTS[0],
    isActive: true,
  });

  useEffect(() => {
    if (initial) {
      setForm({
        cardName: initial.cardName || '',
        bank: initial.bank || '',
        last4: initial.last4 || '',
        accountId: initial.accountId?._id || initial.accountId || '',
        expiryMonth: initial.expiryMonth ? String(initial.expiryMonth) : '',
        expiryYear: initial.expiryYear ? String(initial.expiryYear) : '',
        color: initial.color || CARD_GRADIENTS[0],
        isActive: initial.isActive !== undefined ? initial.isActive : true,
      });
    } else {
      setForm({
        cardName: '', bank: '', last4: '',
        accountId: accounts?.[0]?._id || '',
        expiryMonth: '', expiryYear: '', color: CARD_GRADIENTS[0], isActive: true,
      });
    }
  }, [initial, open, accounts]);

  const f = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">{initial ? 'Edit Card' : 'Add Debit Card'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Card Name *</label>
            <input
              className="input"
              placeholder="e.g. HDFC Debit Card"
              value={form.cardName}
              onChange={(e) => f('cardName', e.target.value)}
            />
          </div>

          <div>
            <label className="label">Bank</label>
            <input
              className="input"
              placeholder="e.g. HDFC Bank"
              value={form.bank}
              onChange={(e) => f('bank', e.target.value)}
            />
          </div>

          <div>
            <label className="label">Last 4 Digits</label>
            <input
              className="input"
              placeholder="4521"
              maxLength={4}
              value={form.last4}
              onChange={(e) => f('last4', e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </div>

          <div>
            <label className="label">Linked Account *</label>
            <select className="input" value={form.accountId} onChange={(e) => f('accountId', e.target.value)}>
              <option value="">Select account</option>
              {accounts?.map((a: any) => (
                <option key={a._id} value={a._id}>{a.accountName} ({a.bankName || a.accountType})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Expiry Month</label>
              <select className="input" value={form.expiryMonth} onChange={(e) => f('expiryMonth', e.target.value)}>
                <option value="">MM</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Expiry Year</label>
              <select className="input" value={form.expiryYear} onChange={(e) => f('expiryYear', e.target.value)}>
                <option value="">YYYY</option>
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Card Style</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {CARD_GRADIENTS.map((g, i) => (
                <button
                  key={i}
                  onClick={() => f('color', g)}
                  className="h-12 rounded-lg border-2 transition-all"
                  style={{
                    background: g,
                    borderColor: form.color === g ? '#fff' : 'transparent',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
          <button onClick={() => onSave(form)} className="btn btn-primary flex-1">
            {initial ? 'Update' : 'Add Card'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function DebitCards() {
  const [cards, setCards] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cardsRes, accRes] = await Promise.all([
        api.get('/debit-cards'),
        api.get('/accounts'),
      ]);
      setCards(cardsRes.data);
      setAccounts(accRes.data);
    } catch {
      toast('Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form: any) => {
    try {
      if (editTarget) {
        const r = await api.put(`/debit-cards/${editTarget._id}`, form);
        setCards((prev) => prev.map((c) => c._id === editTarget._id ? r.data : c));
        toast('Card updated', 'success');
      } else {
        const r = await api.post('/debit-cards', form);
        setCards((prev) => [r.data, ...prev]);
        toast('Card added', 'success');
      }
      setFormOpen(false);
      setEditTarget(null);
    } catch (e: any) {
      toast(e.response?.data?.message || 'Error', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/debit-cards/${deleteTarget._id}`);
      setCards((prev) => prev.filter((c) => c._id !== deleteTarget._id));
      toast('Card removed', 'success');
    } catch {
      toast('Failed to delete', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Debit Cards</h1>
          <p className="muted mt-1 text-sm">Cards linked to your bank accounts.</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setFormOpen(true); }}
          className="btn btn-primary"
        >
          <Plus size={16} /> Add Card
        </button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2].map((i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      ) : cards.length === 0 ? (
        <div className="card p-12 text-center">
          <CreditCard size={40} className="mx-auto mb-4 muted" />
          <div className="text-lg font-semibold mb-2">No debit cards yet</div>
          <p className="muted text-sm mb-4">Link a debit card to your bank account.</p>
          {accounts.length === 0 ? (
            <p className="text-sm" style={{ color: '#f59e0b' }}>⚠️ Please add a bank account first.</p>
          ) : (
            <button
              onClick={() => { setEditTarget(null); setFormOpen(true); }}
              className="btn btn-primary mx-auto"
            >
              <Plus size={16} /> Add Card
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card) => (
            <div key={card._id} className="space-y-3">
              <CardFace card={card} />
              {/* Card info */}
              <div className="card p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{card.cardName}</div>
                    {card.accountId && (
                      <div className="text-xs muted mt-1">
                        {card.accountId.bankName || card.accountId.accountType} · Balance: {' '}
                        <span style={{ color: '#22c55e' }}>
                          ₹{Number(card.accountId.balance || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditTarget(card); setFormOpen(true); }} className="btn btn-ghost btn-icon">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(card)} className="btn btn-ghost btn-icon">
                      <Trash2 size={14} style={{ color: '#f43f5e' }} />
                    </button>
                  </div>
                </div>
                {card.expiryMonth && card.expiryYear && (
                  <div className="flex items-center gap-1 mt-2 text-xs muted">
                    <Calendar size={11} />
                    Expires {String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <DebitCardFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        onSave={handleSave}
        initial={editTarget}
        accounts={accounts}
      />

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <div className="p-6 max-w-sm w-full">
          <h2 className="text-lg font-bold mb-2">Remove Card?</h2>
          <p className="muted text-sm mb-5">
            Remove <strong>{deleteTarget?.cardName}</strong> from your cards?
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
