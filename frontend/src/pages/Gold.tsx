import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';
import { Coins, Plus, Target, Trash2, TrendingUp, Gem } from 'lucide-react';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Place the generated hero image in public/ or refer to it via absolute path if we can.
// Since the generated image is in C:\Users\karth\.gemini\antigravity\brain\72dcab39-0e13-4ea7-9cee-bef1a2772473\,
// We will use a placeholder or inline styling if we can't easily import it via Vite.
// Let's use a nice CSS gradient background for the hero, and if they provide a URL, we can use it.
// Actually, since I generated the image, the user can manually move it to the public folder if they want,
// or I can just use a stunning gradient for now with the Gem icon.

export default function Gold() {
  const [summary, setSummary] = useState<any>({ target: null, accumulatedGrams: 0, graphData: [] });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [openTx, setOpenTx] = useState(false);
  const [openTarget, setOpenTarget] = useState(false);
  
  // Forms
  const [txForm, setTxForm] = useState({ type: 'buy', grams: '', price: '', date: new Date().toISOString().slice(0, 10), notes: '' });
  const [targetForm, setTargetForm] = useState({ targetGrams: '', startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [sumRes, txRes] = await Promise.all([
        api.get('/gold/summary'),
        api.get('/gold/transactions'),
      ]);
      setSummary(sumRes.data);
      setTransactions(txRes.data);
      
      if (sumRes.data.target) {
        setTargetForm({
          targetGrams: String(sumRes.data.target.targetGrams),
          startDate: sumRes.data.target.startDate ? new Date(sumRes.data.target.startDate).toISOString().slice(0, 10) : '',
          endDate: sumRes.data.target.endDate ? new Date(sumRes.data.target.endDate).toISOString().slice(0, 10) : '',
        });
      }
    } catch {
      toast('Failed to load gold data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.grams || Number(txForm.grams) <= 0) return toast('Grams must be positive', 'error');
    setSaving(true);
    try {
      await api.post('/gold/transactions', txForm);
      toast('Gold transaction added');
      setOpenTx(false);
      setTxForm({ ...txForm, grams: '', price: '', notes: '' });
      load();
    } catch (err: any) {
      toast(err.response?.data?.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetForm.targetGrams || Number(targetForm.targetGrams) <= 0) return toast('Target grams required', 'error');
    setSaving(true);
    try {
      await api.post('/gold/target', {
        targetGrams: Number(targetForm.targetGrams),
        startDate: targetForm.startDate || null,
        endDate: targetForm.endDate || null,
      });
      toast('Target updated');
      setOpenTarget(false);
      load();
    } catch (err: any) {
      toast(err.response?.data?.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteTx = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await api.delete(`/gold/transactions/${id}`);
      toast('Transaction deleted');
      load();
    } catch {
      toast('Delete failed', 'error');
    }
  };

  const progress = summary.target?.targetGrams 
    ? Math.min(100, Math.round((summary.accumulatedGrams / summary.target.targetGrams) * 100))
    : 0;

  return (
    <div className="fade-in">
      {/* Hero Section */}
      <div 
        className="card p-8 mb-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #111 0%, #2a2008 100%)',
          border: '1px solid #4a3a10'
        }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #eab308 0%, #a16207 100%)', boxShadow: '0 8px 32px rgba(234, 179, 8, 0.3)' }}>
            <Coins size={32} color="#fff" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-yellow-500 mb-1" style={{ textShadow: '0 2px 10px rgba(234, 179, 8, 0.2)' }}>Gold Vault</h1>
            <p className="text-yellow-500/70 text-sm">Track your physical and digital gold accumulation</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* KPI 1: Accumulated */}
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2 muted text-sm font-medium">
            <Gem size={16} className="text-yellow-500" /> Accumulated
          </div>
          <div className="text-3xl font-bold text-yellow-500">
            {summary.accumulatedGrams.toFixed(2)} <span className="text-base text-yellow-500/50 font-normal">g</span>
          </div>
        </div>

        {/* KPI 2: Target */}
        <div className="stat-card cursor-pointer hover:border-yellow-500/50 transition-colors" onClick={() => setOpenTarget(true)}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3 muted text-sm font-medium">
              <Target size={16} className="text-indigo-400" /> Gram Target
            </div>
          </div>
          <div className="text-3xl font-bold">
            {summary.target?.targetGrams ? summary.target.targetGrams.toFixed(2) : '0.00'} <span className="text-base muted font-normal">g</span>
          </div>
          <div className="text-xs text-indigo-400 mt-2">Click to edit target</div>
        </div>

        {/* KPI 3: Progress */}
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2 muted text-sm font-medium">
            <TrendingUp size={16} className="text-emerald-400" /> Progress
          </div>
          <div className="text-3xl font-bold mb-3">{progress}%</div>
          <div className="progress-track" style={{ height: 8, background: 'rgba(255,255,255,0.05)' }}>
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #eab308, #a16207)' }}
            />
          </div>
        </div>
      </div>

      {/* Graph Area */}
      <div className="card p-5 mb-6">
        <h3 className="font-semibold mb-6 flex items-center gap-2">
          <TrendingUp size={16} className="text-yellow-500" /> Accumulation Over Time
        </h3>
        <div style={{ height: 300 }}>
          {summary.graphData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary.graphData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2e3d" vertical={false} />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} dx={-10} tickFormatter={(val) => `${val}g`} />
                <Tooltip 
                  contentStyle={{ background: '#1e2130', border: '1px solid #2a2e3d', borderRadius: 12 }}
                  itemStyle={{ color: '#eab308', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="grams" 
                  name="Accumulated (g)"
                  stroke="#eab308" 
                  strokeWidth={3}
                  dot={{ fill: '#1e2130', stroke: '#eab308', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#eab308' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center muted text-sm">
              Not enough data to display graph. Add some transactions!
            </div>
          )}
        </div>
      </div>

      {/* Transactions */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold flex items-center gap-2">
            <Coins size={16} className="text-yellow-500" /> Transactions
          </h3>
          <button className="btn btn-primary" onClick={() => setOpenTx(true)}>
            <Plus size={16} /> Add Gold
          </button>
        </div>
        
        {loading ? (
          <div className="text-center p-10 muted">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center p-10 muted text-sm">
            No gold transactions yet. Start accumulating!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1e2130] text-sm muted">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium text-right">Grams</th>
                  <th className="pb-3 font-medium text-right">Price Paid</th>
                  <th className="pb-3 font-medium">Notes</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id} className="border-b border-[#1e2130]/50 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 text-sm">{formatDate(tx.date)}</td>
                    <td className="py-3 text-sm">
                      <span className="badge" style={{
                        background: tx.type === 'buy' ? 'rgba(34,197,94,0.12)' : 'rgba(244,63,94,0.12)',
                        color: tx.type === 'buy' ? '#22c55e' : '#f43f5e'
                      }}>
                        {tx.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-right font-medium text-yellow-500">
                      {tx.type === 'buy' ? '+' : '-'}{tx.grams}g
                    </td>
                    <td className="py-3 text-sm text-right muted">
                      {tx.price ? `₹${tx.price.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-3 text-sm muted truncate max-w-[200px]">{tx.notes || '—'}</td>
                    <td className="py-3 text-right">
                      <button className="btn btn-ghost btn-icon text-rose-500 hover:text-rose-400" onClick={() => deleteTx(tx._id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Target Modal */}
      <Modal open={openTarget} title="Set Gold Target" onClose={() => setOpenTarget(false)} size="sm">
        <form onSubmit={saveTarget} className="space-y-4">
          <div>
            <label className="label">Target (Grams) *</label>
            <input 
              className="input" 
              type="number" 
              step="0.01" 
              min="0.01" 
              value={targetForm.targetGrams} 
              onChange={e => setTargetForm({...targetForm, targetGrams: e.target.value})} 
              required 
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input className="input" type="date" value={targetForm.startDate} onChange={e => setTargetForm({...targetForm, startDate: e.target.value})} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input className="input" type="date" value={targetForm.endDate} onChange={e => setTargetForm({...targetForm, endDate: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setOpenTarget(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={saving}>Save Target</button>
          </div>
        </form>
      </Modal>

      {/* Add Transaction Modal */}
      <Modal open={openTx} title="Add Gold Transaction" onClose={() => setOpenTx(false)} size="sm">
        <form onSubmit={saveTx} className="space-y-4">
          <div>
            <label className="label">Type</label>
            <div className="flex gap-2">
              <button 
                type="button" 
                className={`btn flex-1 ${txForm.type === 'buy' ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/50' : 'btn-secondary'}`}
                onClick={() => setTxForm({...txForm, type: 'buy'})}
              >
                Buy
              </button>
              <button 
                type="button" 
                className={`btn flex-1 ${txForm.type === 'sell' ? 'bg-rose-500/20 text-rose-500 border border-rose-500/50' : 'btn-secondary'}`}
                onClick={() => setTxForm({...txForm, type: 'sell'})}
              >
                Sell
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Grams *</label>
              <input className="input" type="number" step="0.01" min="0.01" value={txForm.grams} onChange={e => setTxForm({...txForm, grams: e.target.value})} required />
            </div>
            <div>
              <label className="label">Date *</label>
              <input className="input" type="date" value={txForm.date} onChange={e => setTxForm({...txForm, date: e.target.value})} required />
            </div>
          </div>
          <div>
            <label className="label">Total Price Paid (Optional)</label>
            <input className="input" type="number" step="0.01" min="0" placeholder="0.00" value={txForm.price} onChange={e => setTxForm({...txForm, price: e.target.value})} />
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" placeholder="e.g. 24K Coin from Tanishq" value={txForm.notes} onChange={e => setTxForm({...txForm, notes: e.target.value})} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setOpenTx(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-1 bg-yellow-600 hover:bg-yellow-500 shadow-[0_2px_12px_rgba(202,138,4,0.3)]" disabled={saving}>Save</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
