import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { toast } from '../components/Toast';
import Modal from '../components/Modal';
import { money } from '../lib/utils';
import { CreditCard, Plus, Edit2, Trash2, X, Calendar, Building2 } from 'lucide-react';

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
      className="rounded-3xl p-6 relative overflow-hidden text-white"
      style={{
        background: isGradient ? gradient : `linear-gradient(135deg, ${gradient} 0%, ${gradient}99 100%)`,
        minHeight: 200,
        boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
      }}
    >
      {/* Decorative circles */}
      <div
        className="absolute -right-8 -top-8 w-48 h-48 rounded-full opacity-10"
        style={{ background: 'rgba(255,255,255,0.4)' }}
      />
      <div
        className="absolute -right-2 top-16 w-24 h-24 rounded-full opacity-10"
        style={{ background: 'rgba(255,255,255,0.3)' }}
      />
      
      {/* Decorative chip */}
      <div className="absolute top-6 right-6 w-12 h-8 rounded bg-gradient-to-br from-yellow-200/50 to-yellow-500/50 opacity-80 backdrop-blur-md" />

      {/* Bank name */}
      <div className="flex justify-between items-start mb-8">
        <div className="text-base font-semibold opacity-90 drop-shadow-sm">{card.bank || card.cardName}</div>
      </div>

      {/* Card number */}
      <div className="text-2xl font-mono font-bold tracking-widest mb-6 drop-shadow-md">
        •••• •••• •••• {card.last4 || '****'}
      </div>

      {/* Bottom row */}
      <div className="flex justify-between items-end">
        <div>
          <div className="text-[10px] opacity-70 mb-0.5 uppercase tracking-widest font-semibold">Linked Account</div>
          <div className="text-sm font-semibold opacity-90">{acc?.accountName || '—'}</div>
        </div>
        {card.expiryMonth && card.expiryYear && (
          <div className="text-right">
            <div className="text-[10px] opacity-70 mb-0.5 uppercase tracking-widest font-semibold">Valid Thru</div>
            <div className="text-sm font-mono font-bold opacity-90">
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
    <Modal open={open} onClose={onClose} fullScreen>
      <div className="p-5 max-w-md mx-auto w-full pb-20">
        <h2 className="text-xl font-bold mb-6 text-center">{initial ? 'Edit Card' : 'Add Debit Card'}</h2>

        {/* Live Preview */}
        <div className="mb-6 scale-95 transform origin-center">
          <CardFace card={{ ...form, accountId: accounts.find((a:any) => a._id === form.accountId) }} />
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Card Name *</label>
            <input
              className="input text-lg font-semibold"
              placeholder="e.g. Salary Card"
              value={form.cardName}
              onChange={(e) => f('cardName', e.target.value)}
            />
          </div>

          <div>
            <label className="label">Bank Name</label>
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
              className="input text-xl font-mono tracking-widest"
              placeholder="4521"
              maxLength={4}
              value={form.last4}
              onChange={(e) => f('last4', e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </div>

          <div>
            <label className="label">Linked Account *</label>
            <div className="space-y-2 max-h-48 overflow-y-auto mt-1">
              {accounts?.map((a: any) => {
                const isSelected = form.accountId === a._id;
                return (
                  <button
                    key={a._id}
                    type="button"
                    onClick={() => f('accountId', a._id)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left"
                    style={{
                      borderColor: isSelected ? '#8b5cf6' : '#1e2130',
                      background: isSelected ? 'rgba(139,92,246,0.12)' : '#0d0f16',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.15)' }}>
                        <Building2 size={16} style={{ color: '#8b5cf6' }} />
                      </div>
                      <div>
                        <div className="text-sm font-bold">{a.accountName}</div>
                        <div className="text-xs muted">{a.bankName || a.accountType}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {(!accounts || accounts.length === 0) && (
              <p className="text-xs text-amber-400 mt-2">No accounts found. Add an account first.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Expiry Month</label>
              <select className="input font-mono" value={form.expiryMonth} onChange={(e) => f('expiryMonth', e.target.value)}>
                <option value="">MM</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Expiry Year</label>
              <select className="input font-mono" value={form.expiryYear} onChange={(e) => f('expiryYear', e.target.value)}>
                <option value="">YYYY</option>
                {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Card Design</label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {CARD_GRADIENTS.map((g, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => f('color', g)}
                  className="h-16 rounded-xl border-2 transition-transform active:scale-95"
                  style={{
                    background: g,
                    borderColor: form.color === g ? '#fff' : 'transparent',
                    boxShadow: form.color === g ? '0 0 0 2px rgba(139,92,246,0.5)' : 'none'
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="btn btn-secondary flex-1 py-4 font-bold">Cancel</button>
          <button onClick={() => onSave(form)} className="btn btn-primary flex-1 py-4 font-bold">
            {initial ? 'Update Card' : 'Save Card'}
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
    <div className="fade-in pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Debit Cards</h1>
          <p className="muted mt-1 text-sm">Cards linked to your bank accounts.</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setFormOpen(true); }}
          className="hidden md:flex btn btn-primary"
        >
          <Plus size={16} /> Add Card
        </button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2].map((i) => <div key={i} className="skeleton h-60 rounded-3xl" />)}
        </div>
      ) : cards.length === 0 ? (
        <div className="card p-12 text-center mt-6">
          <CreditCard size={48} className="mx-auto mb-4 muted" />
          <div className="text-xl font-bold mb-2">No debit cards yet</div>
          <p className="muted text-sm mb-6">Link a debit card to your bank account.</p>
          {accounts.length === 0 ? (
            <p className="text-sm font-semibold" style={{ color: '#f59e0b' }}>⚠️ Please add a bank account first.</p>
          ) : (
            <button
              onClick={() => { setEditTarget(null); setFormOpen(true); }}
              className="btn btn-primary mx-auto py-3 px-6"
            >
              <Plus size={16} /> Add Card
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <div key={card._id} className="relative group">
              <CardFace card={card} />
              
              {/* Overlay actions on mobile, hover on desktop */}
              <div className="mt-4 flex justify-between items-center px-2">
                <div className="text-sm muted flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span> Active Card
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditTarget(card); setFormOpen(true); }} className="btn btn-secondary px-4 py-2">
                    <Edit2 size={16} /> Edit
                  </button>
                  <button onClick={() => setDeleteTarget(card)} className="btn btn-secondary px-4 py-2">
                    <Trash2 size={16} style={{ color: '#f43f5e' }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB for mobile */}
      <button className="fab md:hidden" onClick={() => { setEditTarget(null); setFormOpen(true); }} aria-label="Add Debit Card">
        <Plus size={24} />
      </button>

      <DebitCardFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        onSave={handleSave}
        initial={editTarget}
        accounts={accounts}
      />

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <div className="p-6 max-w-sm mx-auto text-center w-full">
          <h2 className="text-xl font-bold mb-2">Remove Card?</h2>
          <p className="muted text-sm mb-6">
            Remove <strong>{deleteTarget?.cardName}</strong> from your cards?
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary flex-1 py-3 font-bold">Cancel</button>
            <button onClick={handleDelete} className="btn flex-1 py-3 font-bold" style={{ background: '#ef4444', color: '#fff' }}>Remove</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
