import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { money } from '../lib/utils';
import { toast } from './Toast';
import Modal from './Modal';
import { X, ArrowRight, Check } from 'lucide-react';

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

export default function TransferModal({ open, onClose, onDone }: TransferModalProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get('/accounts');
      setAccounts(r.data || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (open) {
      load();
      setAmount('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [open, load]);

  useEffect(() => {
    if (accounts.length >= 2) {
      setFromId(accounts[0]._id);
      setToId(accounts[1]._id);
    }
  }, [accounts]);

  const fromAccount = accounts.find((a) => a._id === fromId);
  const toAccount = accounts.find((a) => a._id === toId);
  const amt = Number(amount);

  const handleTransfer = async () => {
    if (!fromId || !toId) return toast('Select both accounts', 'error');
    if (fromId === toId) return toast('Cannot transfer to the same account', 'error');
    if (!amt || amt <= 0) return toast('Enter a valid amount', 'error');

    setSaving(true);
    try {
      await api.post('/transfers', {
        fromAccountId: fromId,
        toAccountId: toId,
        amount: amt,
        date,
        description: description || 'Account Transfer',
      });
      toast(`Transferred ${money(amt)} successfully!`, 'success');
      onDone();
      onClose();
    } catch (e: any) {
      toast(e.response?.data?.message || 'Transfer failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold">Transfer Money</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={18} /></button>
        </div>

        {accounts.length < 2 ? (
          <div className="text-center py-8 muted text-sm">
            You need at least 2 accounts to make a transfer.
          </div>
        ) : (
          <div className="space-y-4">
            {/* From */}
            <div>
              <label className="label">From Account</label>
              <select className="input" value={fromId} onChange={(e) => setFromId(e.target.value)}>
                {accounts.filter((a) => a._id !== toId).map((a) => (
                  <option key={a._id} value={a._id}>{a.accountName} — {money(a.balance)}</option>
                ))}
              </select>
              {fromAccount && (
                <p className="text-xs muted mt-1">Balance: {money(fromAccount.balance)}</p>
              )}
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center">
              <div
                className="w-10 h-10 rounded-full grid place-items-center"
                style={{ background: 'rgba(139,92,246,0.2)' }}
              >
                <ArrowRight size={16} style={{ color: '#8b5cf6' }} />
              </div>
            </div>

            {/* To */}
            <div>
              <label className="label">To Account</label>
              <select className="input" value={toId} onChange={(e) => setToId(e.target.value)}>
                {accounts.filter((a) => a._id !== fromId).map((a) => (
                  <option key={a._id} value={a._id}>{a.accountName} — {money(a.balance)}</option>
                ))}
              </select>
              {toAccount && (
                <p className="text-xs muted mt-1">Balance: {money(toAccount.balance)}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="label">Amount (₹)</label>
              <input
                className="input text-lg font-bold"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2">
              {[1000, 5000, 10000, 25000].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(String(v))}
                  className="flex-1 py-2 rounded-lg text-xs font-medium"
                  style={{ background: '#0d0f16', border: '1px solid #1e2130' }}
                >
                  ₹{v >= 1000 ? `${v / 1000}k` : v}
                </button>
              ))}
            </div>

            <div>
              <label className="label">Date</label>
              <input
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Description (optional)</label>
              <input
                className="input"
                placeholder="Transfer description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Preview */}
            {amt > 0 && fromAccount && toAccount && (
              <div className="card p-4 space-y-2">
                <div className="text-xs muted font-semibold uppercase tracking-wider mb-2">After Transfer</div>
                <div className="flex justify-between text-sm">
                  <span>{fromAccount.accountName}</span>
                  <span style={{ color: '#f43f5e' }}>{money(fromAccount.balance - amt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{toAccount.accountName}</span>
                  <span style={{ color: '#22c55e' }}>{money(toAccount.balance + amt)}</span>
                </div>
              </div>
            )}

            {/* Low balance warning */}
            {amt > 0 && fromAccount && fromAccount.balance - amt < 0 && (
              <div
                className="rounded-xl p-3 flex items-center gap-2 text-sm"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}
              >
                ⚠️ This will bring {fromAccount.accountName} below zero.
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleTransfer}
                disabled={saving || !amt || amt <= 0}
                className="btn btn-primary flex-1"
              >
                {saving ? 'Transferring…' : <><Check size={16} /> Transfer</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
