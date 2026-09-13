import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { money } from '../lib/utils';
import { toast } from './Toast';
import {
  X, TrendingUp, TrendingDown, CreditCard, ChevronLeft,
  Check, Plus, Building2, Delete, ChevronRight,
} from 'lucide-react';

// ── Default quick categories ──────────────────────────────
const DEFAULT_EXPENSE_CATS = [
  { name: 'Food',          icon: '🍔' },
  { name: 'Groceries',     icon: '🛒' },
  { name: 'Shopping',      icon: '🛍️' },
  { name: 'Transport',     icon: '🚗' },
  { name: 'Fuel',          icon: '⛽' },
  { name: 'Rent',          icon: '🏠' },
  { name: 'Bills',         icon: '💡' },
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Recharge',      icon: '📱' },
  { name: 'Medical',       icon: '💊' },
];

const DEFAULT_INCOME_CATS = [
  { name: 'Salary',     icon: '💼' },
  { name: 'Freelance',  icon: '💻' },
  { name: 'Bonus',      icon: '🎁' },
  { name: 'Investment', icon: '📈' },
  { name: 'Business',   icon: '🏢' },
  { name: 'Interest',   icon: '🏦' },
  { name: 'Gift',       icon: '🎀' },
  { name: 'Rental',     icon: '🏘️' },
];

const ACCOUNT_PAYMENT_METHODS = [
  { label: 'UPI',           icon: '📲' },
  { label: 'Debit Card',    icon: '💳' },
  { label: 'Cash',          icon: '💵' },
  { label: 'Bank Transfer', icon: '🏦' },
  { label: 'Net Banking',   icon: '🖥️' },
];

type TxType   = 'income' | 'expense' | 'credit_card_payment';
type PaySource = 'account' | 'credit_card';
type Step = 'type' | 'amount' | 'category' | 'pay_source' | 'account' | 'confirm';

interface QuickAddProps {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  defaultType?: TxType;
}

export default function QuickAdd({ open, onClose, onDone, defaultType }: QuickAddProps) {
  const [step, setStep]               = useState<Step>('type');
  const [txType, setTxType]           = useState<TxType>('expense');
  const [paySource, setPaySource]     = useState<PaySource>('account');
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  const [amount, setAmount]           = useState('');
  const [amountDisplay, setAmountDisplay] = useState('');
  const [accounts, setAccounts]       = useState<any[]>([]);
  const [categories, setCategories]   = useState<any[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [date, setDate]               = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [showAllCats, setShowAllCats] = useState(false);
  const [saving, setSaving]           = useState(false);

  const load = useCallback(async () => {
    try {
      const [accRes, catRes, cardRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/categories'),
        api.get('/credit-cards'),
      ]);
      setAccounts(accRes.data || []);
      setCategories(catRes.data || []);
      setCreditCards(cardRes.data || []);
    } catch { /* silent */ }
  }, []);

  const reset = useCallback(() => {
    setAmount('');
    setAmountDisplay('');
    setDescription('');
    setShowAllCats(false);
    setDate(new Date().toISOString().split('T')[0]);
    setSelectedCategory(null);
    setSelectedCard(null);
  }, []);

  useEffect(() => {
    if (open) {
      load();
      reset();
      if (defaultType) { setTxType(defaultType); setStep('amount'); }
      else { setStep('type'); }
    }
  }, [open, defaultType]);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      const lastId = localStorage.getItem('qa_last_account');
      setSelectedAccount(accounts.find((a) => a._id === lastId) || accounts[0]);
    }
  }, [accounts]);

  useEffect(() => {
    if (creditCards.length > 0 && !selectedCard) {
      const lastId = localStorage.getItem('qa_last_card');
      setSelectedCard(creditCards.find((c) => c._id === lastId) || creditCards[0]);
    }
  }, [creditCards]);

  useEffect(() => {
    if (categories.length > 0) {
      const type = txType === 'credit_card_payment' ? 'expense' : txType;
      const typeCats = categories.filter((c: any) => c.type === type);
      const key = type === 'expense' ? 'qa_last_expense_cat' : 'qa_last_income_cat';
      const lastId = localStorage.getItem(key);
      setSelectedCategory(typeCats.find((c) => c._id === lastId) || typeCats[0] || null);
    }
  }, [categories, txType]);

  // ── Numpad ──────────────────────────────────────────────
  const handleNumPad = (val: string) => {
    if (val === 'C')  { setAmount(''); setAmountDisplay(''); return; }
    if (val === '⌫') {
      const next = amount.slice(0, -1);
      setAmount(next);
      setAmountDisplay(next ? Number(next).toLocaleString('en-IN') : '');
      return;
    }
    if (val === '.' && amount.includes('.')) return;
    if (amount.length >= 10) return;
    const next = amount + val;
    setAmount(next);
    setAmountDisplay(Number(next).toLocaleString('en-IN'));
  };
  const numPadKeys = ['1','2','3','4','5','6','7','8','9','.','0','⌫'];

  // ── Categories ───────────────────────────────────────────
  const catType    = txType === 'credit_card_payment' ? 'expense' : txType;
  const userCats   = categories.filter((c: any) => c.type === catType);
  const defaultCats= txType === 'income' ? DEFAULT_INCOME_CATS : DEFAULT_EXPENSE_CATS;
  const visibleCats= showAllCats ? userCats : defaultCats;

  // ── Type config ──────────────────────────────────────────
  const typeConfig = {
    income:              { label: 'Income',     color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   sign: '+' },
    expense:             { label: 'Expense',    color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',   sign: '−' },
    credit_card_payment: { label: 'CC Payment', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', sign: '−' },
  };
  const cfg = typeConfig[txType];

  // ── Save ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) { toast('Enter a valid amount', 'error'); return; }

    if (txType === 'credit_card_payment') {
      if (!selectedCard)    { toast('Select a credit card to pay', 'error'); return; }
      if (!selectedAccount) { toast('Select an account to pay from', 'error'); return; }
      if (Number(amount) > selectedCard.outstandingBalance) {
        toast(`Payment ₹${amountDisplay} exceeds outstanding ₹${selectedCard.outstandingBalance.toLocaleString('en-IN')}`, 'error');
        return;
      }
    } else {
      if (!selectedAccount && paySource === 'account') { toast('Select an account', 'error'); return; }
      if (!selectedCard && paySource === 'credit_card' && txType === 'expense') { toast('Select a credit card', 'error'); return; }
    }

    setSaving(true);
    try {
      const desc = description.trim() || selectedCategory?.name
        || (txType === 'income' ? 'Income' : txType === 'credit_card_payment' ? 'Credit Card Payment' : 'Expense');

      const payload: any = { type: txType, amount: Number(amount), description: desc, date };

      if (txType === 'income') {
        payload.accountId    = selectedAccount._id;
        payload.paymentMethod= 'Bank Transfer';
        const match = userCats.find((c) => c.name === selectedCategory?.name || c._id === selectedCategory?._id);
        if (match) payload.categoryId = match._id;
      } else if (txType === 'expense') {
        if (paySource === 'account') {
          payload.accountId    = selectedAccount._id;
          payload.paymentMethod= paymentMethod;
        } else {
          payload.creditCardId = selectedCard._id;
          payload.paymentMethod= 'Credit Card';
        }
        const match = userCats.find((c) => c.name === selectedCategory?.name || c._id === selectedCategory?._id);
        if (match) payload.categoryId = match._id;
      } else if (txType === 'credit_card_payment') {
        payload.accountId    = selectedAccount._id;
        payload.creditCardId = selectedCard._id;
        payload.paymentMethod= 'Bank Transfer';
      }

      await api.post('/transactions', payload);

      if (selectedAccount) localStorage.setItem('qa_last_account', selectedAccount._id);
      if (selectedCard)    localStorage.setItem('qa_last_card',    selectedCard._id);
      const key = catType === 'expense' ? 'qa_last_expense_cat' : 'qa_last_income_cat';
      if (selectedCategory) localStorage.setItem(key, selectedCategory._id || selectedCategory.name);

      toast(`${cfg.sign}${money(Number(amount))} recorded!`, 'success');
      onDone();
      onClose();
    } catch (e: any) {
      toast(e.response?.data?.message || 'Error saving', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Navigation ────────────────────────────────────────────
  const goBack = () => {
    if (step === 'amount')    { setStep('type'); return; }
    if (step === 'category')  { setStep('amount'); return; }
    if (step === 'pay_source') {
      if (txType === 'credit_card_payment') setStep('amount');
      else setStep('category');
      return;
    }
    if (step === 'account')  { setStep('pay_source'); return; }
    if (step === 'confirm')  {
      if (txType === 'credit_card_payment' || txType === 'income') setStep('account');
      else setStep('pay_source');
      return;
    }
  };
  const nextFromAmount    = () => { if (!amount || Number(amount) <= 0) return; txType === 'credit_card_payment' ? setStep('pay_source') : setStep('category'); };
  const nextFromCategory  = () => txType === 'income' ? setStep('account') : setStep('pay_source');
  const nextFromPaySource = () => setStep('account');
  const nextFromAccount   = () => setStep('confirm');

  if (!open) return null;

  // ── Amount display ────────────────────────────────────────
  const AmountHero = () => (
    <div className="text-center py-4">
      <div className="text-5xl font-bold tracking-tight" style={{ color: cfg.color, letterSpacing: '-1px' }}>
        ₹{amountDisplay || '0'}
      </div>
    </div>
  );

  // ── Shared step header ─────────────────────────────────────
  const StepHeader = ({ title }: { title?: string }) => (
    <div className="flex items-center gap-2 px-5 pt-2 pb-3">
      {step !== 'type' && (
        <button onClick={goBack} className="btn btn-ghost btn-icon">
          <ChevronLeft size={20} />
        </button>
      )}
      <div className="flex-1 text-center">
        {title ? (
          <span className="font-bold text-base">{title}</span>
        ) : (
          <span
            className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {cfg.sign} {cfg.label}
          </span>
        )}
      </div>
      <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={18} /></button>
    </div>
  );

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-51 bg-[#11131c] rounded-t-3xl slide-up"
        style={{
          zIndex: 51,
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          maxHeight: '96dvh',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        <div className="sheet-handle mx-auto mt-3 mb-1" />

        {/* ── STEP: TYPE ──────────────────────────────── */}
        {step === 'type' && (
          <div className="px-5 pb-4">
            <div className="flex justify-between items-center py-4">
              <h2 className="text-xl font-bold">What do you want to add?</h2>
              <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={18} /></button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Income */}
              <button
                onClick={() => { setTxType('income'); setStep('amount'); }}
                className="flex items-center gap-4 p-5 rounded-2xl border-2 active:scale-[0.98] transition-transform"
                style={{ borderColor: '#22c55e', background: 'rgba(34,197,94,0.06)' }}
              >
                <div className="w-14 h-14 rounded-2xl grid place-items-center flex-shrink-0"
                  style={{ background: 'rgba(34,197,94,0.15)' }}>
                  <TrendingUp size={26} style={{ color: '#22c55e' }} />
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-base" style={{ color: '#22c55e' }}>💰 Income</div>
                  <div className="text-sm muted mt-0.5">Salary, freelance, investments…</div>
                </div>
                <ChevronRight size={18} style={{ color: '#22c55e' }} />
              </button>

              {/* Expense */}
              <button
                onClick={() => { setTxType('expense'); setStep('amount'); }}
                className="flex items-center gap-4 p-5 rounded-2xl border-2 active:scale-[0.98] transition-transform"
                style={{ borderColor: '#f43f5e', background: 'rgba(244,63,94,0.06)' }}
              >
                <div className="w-14 h-14 rounded-2xl grid place-items-center flex-shrink-0"
                  style={{ background: 'rgba(244,63,94,0.15)' }}>
                  <TrendingDown size={26} style={{ color: '#f43f5e' }} />
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-base" style={{ color: '#f43f5e' }}>💸 Expense</div>
                  <div className="text-sm muted mt-0.5">Food, shopping, bills, travel…</div>
                </div>
                <ChevronRight size={18} style={{ color: '#f43f5e' }} />
              </button>

              {/* CC Payment */}
              <button
                onClick={() => { setTxType('credit_card_payment'); setStep('amount'); }}
                className="flex items-center gap-4 p-5 rounded-2xl border-2 active:scale-[0.98] transition-transform"
                style={{ borderColor: '#f59e0b', background: 'rgba(245,158,11,0.06)' }}
              >
                <div className="w-14 h-14 rounded-2xl grid place-items-center flex-shrink-0"
                  style={{ background: 'rgba(245,158,11,0.15)' }}>
                  <CreditCard size={26} style={{ color: '#f59e0b' }} />
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-base" style={{ color: '#f59e0b' }}>💳 CC Payment</div>
                  <div className="text-sm muted mt-0.5">Pay your credit card bill</div>
                </div>
                <ChevronRight size={18} style={{ color: '#f59e0b' }} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: AMOUNT ─────────────────────────────── */}
        {step === 'amount' && (
          <div>
            <StepHeader />
            <AmountHero />
            <p className="text-center text-xs muted mb-4">
              {txType === 'income'              ? 'How much did you receive?' :
               txType === 'credit_card_payment' ? 'How much are you paying?'  :
               'How much did you spend?'}
            </p>

            {/* Quick amounts */}
            <div className="flex gap-2 px-5 mb-3">
              {[500, 1000, 5000, 10000].map((v) => (
                <button
                  key={v}
                  onClick={() => { setAmount(String(v)); setAmountDisplay(v.toLocaleString('en-IN')); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
                  style={{ background: '#0d0f16', border: '1.5px solid #1e2130' }}
                >
                  ₹{v >= 1000 ? `${v / 1000}k` : v}
                </button>
              ))}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2 px-5 mb-4">
              {numPadKeys.map((k) => (
                <button
                  key={k}
                  onClick={() => handleNumPad(k)}
                  className={`numpad-key ${k === '⌫' ? 'delete' : ''}`}
                >
                  {k === '⌫' ? <Delete size={22} /> : k}
                </button>
              ))}
            </div>

            <div className="px-5">
              <button
                onClick={nextFromAmount}
                disabled={!amount || Number(amount) <= 0}
                className="btn btn-primary w-full text-base py-4"
                style={{
                  background: cfg.color,
                  opacity: (!amount || Number(amount) <= 0) ? 0.4 : 1,
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: CATEGORY ───────────────────────────── */}
        {step === 'category' && (
          <div>
            <StepHeader />
            <AmountHero />

            <div className="px-5 mb-3">
              <label className="label">{txType === 'income' ? 'Income Source' : 'What was it for?'}</label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {visibleCats.map((cat: any) => {
                  const isSelected = selectedCategory?.name === cat.name || selectedCategory?._id === cat._id;
                  return (
                    <button
                      key={cat._id || cat.name}
                      onClick={() => setSelectedCategory(cat)}
                      className="cat-chip"
                      style={{
                        borderColor: isSelected ? cfg.color : '#1e2130',
                        background: isSelected ? `${cfg.color}18` : 'transparent',
                      }}
                    >
                      <span className="text-2xl">{cat.icon}</span>
                      <span className="text-xs font-medium truncate w-full text-center"
                        style={{ color: isSelected ? cfg.color : '#8b92a5' }}>
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
                {!showAllCats && userCats.length > 0 && (
                  <button
                    onClick={() => setShowAllCats(true)}
                    className="cat-chip"
                  >
                    <Plus size={20} className="muted" />
                    <span className="text-xs muted">More</span>
                  </button>
                )}
              </div>

              <input
                className="input mb-1"
                placeholder={selectedCategory?.name || 'Description (optional)…'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="px-5">
              <button onClick={nextFromCategory} className="btn btn-primary w-full py-4 text-base"
                style={{ background: cfg.color }}>
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: PAY SOURCE (expense) ────────────────── */}
        {step === 'pay_source' && txType === 'expense' && (
          <div>
            <StepHeader />
            <AmountHero />

            <div className="px-5 mb-4">
              <label className="label mb-3">How did you pay?</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setPaySource('account'); nextFromPaySource(); }}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all active:scale-[0.97]"
                  style={{
                    borderColor: '#8b5cf6',
                    background: 'rgba(139,92,246,0.08)',
                  }}
                >
                  <div className="w-12 h-12 rounded-2xl grid place-items-center"
                    style={{ background: 'rgba(139,92,246,0.2)' }}>
                    <Building2 size={22} style={{ color: '#8b5cf6' }} />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Bank / UPI</div>
                    <div className="text-xs muted text-center mt-0.5">UPI, Debit, Cash,<br />Bank Transfer</div>
                  </div>
                </button>

                <button
                  onClick={() => { setPaySource('credit_card'); nextFromPaySource(); }}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all active:scale-[0.97]"
                  style={{
                    borderColor: '#f59e0b',
                    background: 'rgba(245,158,11,0.08)',
                  }}
                >
                  <div className="w-12 h-12 rounded-2xl grid place-items-center"
                    style={{ background: 'rgba(245,158,11,0.2)' }}>
                    <CreditCard size={22} style={{ color: '#f59e0b' }} />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Credit Card</div>
                    <div className="text-xs muted text-center mt-0.5">Adds to CC<br />outstanding balance</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: PAY SOURCE (CC payment — pick which card) ─── */}
        {step === 'pay_source' && txType === 'credit_card_payment' && (
          <div>
            <StepHeader />
            <AmountHero />

            <div className="px-5 mb-4">
              <label className="label mb-3">Pay Which Credit Card?</label>
              {creditCards.length === 0 ? (
                <p className="text-sm text-amber-400 text-center py-4">No credit cards found. Add one first.</p>
              ) : (
                <div className="space-y-2">
                  {creditCards.map((card: any) => {
                    const isSelected = selectedCard?._id === card._id;
                    return (
                      <button
                        key={card._id}
                        onClick={() => setSelectedCard(card)}
                        className="acc-row w-full"
                        style={{
                          borderColor: isSelected ? '#f59e0b' : '#1e2130',
                          background: isSelected ? 'rgba(245,158,11,0.1)' : '#0d0f16',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                            style={{ background: 'rgba(245,158,11,0.15)' }}>
                            <CreditCard size={18} style={{ color: '#f59e0b' }} />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-semibold">
                              {card.cardName}{card.last4 ? ` ···${card.last4}` : ''}
                            </div>
                            <div className="text-xs muted">{card.bank || 'Credit Card'}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold" style={{ color: '#f43f5e' }}>
                            {money(card.outstandingBalance || 0)}
                          </div>
                          <div className="text-xs muted">outstanding</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedCard && Number(amount) > selectedCard.outstandingBalance && (
                <div className="rounded-xl p-3 mt-3 text-xs"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
                  ⚠️ Payment ₹{amountDisplay} exceeds outstanding {money(selectedCard.outstandingBalance)}.
                </div>
              )}
            </div>

            <div className="px-5">
              <button
                onClick={nextFromPaySource}
                disabled={!selectedCard}
                className="btn btn-primary w-full py-4 text-base"
                style={{ background: '#f59e0b', opacity: !selectedCard ? 0.4 : 1 }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: ACCOUNT ─────────────────────────────── */}
        {step === 'account' && (
          <div>
            <StepHeader />
            <AmountHero />

            {/* Payment method (account expense only) */}
            {txType === 'expense' && paySource === 'account' && (
              <div className="px-5 mb-4">
                <label className="label mb-2">Payment Method</label>
                <div className="flex flex-wrap gap-2">
                  {ACCOUNT_PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.label}
                      onClick={() => setPaymentMethod(m.label)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: paymentMethod === m.label ? 'rgba(244,63,94,0.15)' : '#0d0f16',
                        border: `1.5px solid ${paymentMethod === m.label ? '#f43f5e' : '#1e2130'}`,
                        color: paymentMethod === m.label ? '#f43f5e' : '#8b92a5',
                      }}
                    >
                      <span>{m.icon}</span> {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CC selector (CC expense) */}
            {txType === 'expense' && paySource === 'credit_card' && (
              <div className="px-5 mb-4">
                <label className="label mb-2">Which Credit Card?</label>
                <div className="space-y-2">
                  {creditCards.map((card: any) => {
                    const isSelected = selectedCard?._id === card._id;
                    return (
                      <button
                        key={card._id}
                        onClick={() => setSelectedCard(card)}
                        className="acc-row w-full"
                        style={{
                          borderColor: isSelected ? '#f59e0b' : '#1e2130',
                          background: isSelected ? 'rgba(245,158,11,0.1)' : '#0d0f16',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard size={18} style={{ color: '#f59e0b' }} />
                          <span className="text-sm font-medium">
                            {card.cardName}{card.last4 ? ` ···${card.last4}` : ''}
                          </span>
                        </div>
                        <span className="text-xs muted">{card.bank}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Account selector */}
            {(txType === 'income' || txType === 'credit_card_payment' || (txType === 'expense' && paySource === 'account')) && (
              <div className="px-5 mb-4">
                <label className="label mb-2">
                  {txType === 'income' ? 'Received Into' :
                   txType === 'credit_card_payment' ? 'Pay From Account' :
                   'Paid From Account'}
                </label>
                {accounts.length === 0 ? (
                  <p className="text-sm text-amber-400">⚠️ No accounts found. Add an account first.</p>
                ) : (
                  <div className="space-y-2">
                    {accounts.map((acc: any) => {
                      const isSelected = selectedAccount?._id === acc._id;
                      return (
                        <button
                          key={acc._id}
                          onClick={() => setSelectedAccount(acc)}
                          className="acc-row w-full"
                          style={{
                            borderColor: isSelected ? '#8b5cf6' : '#1e2130',
                            background: isSelected ? 'rgba(139,92,246,0.12)' : '#0d0f16',
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                              style={{ background: `${acc.color || '#8b5cf6'}25` }}>
                              <Building2 size={16} style={{ color: acc.color || '#8b5cf6' }} />
                            </div>
                            <div className="text-left">
                              <div className="text-sm font-semibold">{acc.accountName}</div>
                              <div className="text-xs muted">{acc.bankName || acc.accountType}</div>
                            </div>
                          </div>
                          <span className="text-sm font-bold" style={{ color: acc.balance >= 0 ? '#22c55e' : '#f43f5e' }}>
                            {money(acc.balance)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Date */}
            <div className="px-5 mb-4">
              <label className="label mb-2">Date</label>
              <div className="flex gap-2 mb-2">
                {[
                  { label: 'Today',     val: new Date().toISOString().split('T')[0] },
                  { label: 'Yesterday', val: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
                ].map((d) => (
                  <button
                    key={d.val}
                    onClick={() => setDate(d.val)}
                    className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: date === d.val ? 'rgba(139,92,246,0.2)' : '#0d0f16',
                      border: `1.5px solid ${date === d.val ? '#8b5cf6' : '#1e2130'}`,
                      color: date === d.val ? '#a78bfa' : '#8b92a5',
                    }}
                  >
                    {d.label}
                  </button>
                ))}
                <input
                  type="date"
                  className="input flex-1 text-sm"
                  style={{ padding: '8px 12px', minHeight: 40 }}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="px-5">
              <button onClick={nextFromAccount} className="btn btn-primary w-full py-4 text-base"
                style={{ background: cfg.color }}>
                Review →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: CONFIRM ──────────────────────────────── */}
        {step === 'confirm' && (
          <div className="px-5 pb-2">
            <StepHeader title="Confirm" />

            <div
              className="rounded-2xl p-5 mb-4 text-center"
              style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}
            >
              <div className="text-4xl font-bold mb-1" style={{ color: cfg.color }}>
                {cfg.sign}₹{amountDisplay}
              </div>
              <div className="font-semibold text-base">
                {description || selectedCategory?.name || cfg.label}
              </div>
              {selectedCategory && (
                <div className="text-sm muted mt-1">
                  {selectedCategory.icon} {selectedCategory.name}
                </div>
              )}
            </div>

            <div className="card p-4 space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="muted">Type</span>
                <span className="font-medium">{cfg.label}</span>
              </div>
              {txType === 'expense' && paySource === 'account' && (
                <div className="flex justify-between text-sm">
                  <span className="muted">Payment Method</span>
                  <span className="font-medium">{paymentMethod}</span>
                </div>
              )}
              {((txType === 'expense' && paySource === 'credit_card') || txType === 'credit_card_payment') && selectedCard && (
                <div className="flex justify-between text-sm">
                  <span className="muted">Credit Card</span>
                  <span className="font-medium">{selectedCard.cardName}{selectedCard.last4 ? ` ···${selectedCard.last4}` : ''}</span>
                </div>
              )}
              {selectedAccount && (txType !== 'expense' || paySource === 'account') && (
                <div className="flex justify-between text-sm">
                  <span className="muted">{txType === 'income' ? 'Received Into' : 'Paid From'}</span>
                  <span className="font-medium">{selectedAccount.accountName}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="muted">Date</span>
                <span className="font-medium">
                  {new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>

              {/* Balance preview */}
              {selectedAccount && (txType === 'income' || (txType === 'expense' && paySource === 'account') || txType === 'credit_card_payment') && (
                <div className="flex justify-between text-sm pt-2 border-t" style={{ borderColor: '#1e2130' }}>
                  <span className="muted">New Balance ({selectedAccount.accountName})</span>
                  <span className="font-semibold" style={{ color: '#8b5cf6' }}>
                    {money(selectedAccount.balance + (txType === 'income' ? Number(amount) : -Number(amount)))}
                  </span>
                </div>
              )}
              {selectedCard && txType === 'expense' && paySource === 'credit_card' && (
                <div className="flex justify-between text-sm pt-2 border-t" style={{ borderColor: '#1e2130' }}>
                  <span className="muted">New CC Outstanding</span>
                  <span className="font-semibold" style={{ color: '#f59e0b' }}>
                    {money((selectedCard.outstandingBalance || 0) + Number(amount))}
                  </span>
                </div>
              )}
              {selectedCard && txType === 'credit_card_payment' && (
                <div className="flex justify-between text-sm pt-2 border-t" style={{ borderColor: '#1e2130' }}>
                  <span className="muted">New CC Outstanding</span>
                  <span className="font-semibold" style={{ color: '#22c55e' }}>
                    {money(Math.max(0, (selectedCard.outstandingBalance || 0) - Number(amount)))}
                  </span>
                </div>
              )}
            </div>

            {/* Low balance warning */}
            {(txType === 'expense' || txType === 'credit_card_payment') && selectedAccount && (selectedAccount.balance - Number(amount)) < 0 && (
              <div className="rounded-xl p-3 mb-3 text-xs"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                ⚠️ This will bring {selectedAccount.accountName} below zero.
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="btn w-full text-base py-4 font-bold"
              style={{ background: cfg.color, color: '#fff' }}
            >
              {saving ? 'Saving…' : (
                <><Check size={20} /> {
                  txType === 'income'              ? 'Add Income'       :
                  txType === 'credit_card_payment' ? 'Pay Credit Card'  :
                  'Add Expense'
                }</>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
