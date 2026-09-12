import { FormEvent, useState } from 'react';
import { useAuth } from '../context/Auth';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, TrendingUp, Shield, BarChart3 } from 'lucide-react';

const features = [
  { icon: TrendingUp, label: 'Track Income & Expenses', desc: 'Know exactly where your money goes' },
  { icon: BarChart3, label: 'Budget & Milestones', desc: 'Set goals and stay on track' },
  { icon: Shield, label: 'Credit Card Tracking', desc: 'Monitor debt and utilization' },
];

export default function Auth({ register = false }: { register?: boolean }) {
  const { login, register: signup } = useAuth();
  const nav = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');

    if (register) {
      if (name.trim().length < 2) return setErr('Name must be at least 2 characters');
      if (password.length < 6) return setErr('Password must be at least 6 characters');
      if (password !== confirmPwd) return setErr('Passwords do not match');
    }

    setLoading(true);
    try {
      if (register) {
        await signup({ name: name.trim(), email, password });
      } else {
        await login({ email, password });
      }
      nav('/dashboard');
    } catch (e: any) {
      setErr(e.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink grid lg:grid-cols-2">
      {/* Left panel */}
      <div
        className="hidden lg:flex p-16 items-center"
        style={{ background: 'linear-gradient(135deg, #0d0f16 0%, #13111e 100%)' }}
      >
        <div>
          <div className="text-5xl font-black mb-2">
            Fin<span style={{ color: '#8b5cf6' }}>Track</span>
          </div>
          <div className="text-3xl font-bold text-white/90 mt-4 mb-2">
            Your money,<br />
            <span style={{ color: '#8b5cf6' }}>made visible.</span>
          </div>
          <p className="muted mt-4 mb-10 max-w-md leading-relaxed">
            Track spending, plan budgets, manage credit cards and reach savings
            milestones — all from one private, secure dashboard.
          </p>
          <div className="space-y-5">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                  style={{ background: 'rgba(139,92,246,0.15)' }}
                >
                  <Icon size={18} style={{ color: '#8b5cf6' }} />
                </div>
                <div>
                  <div className="font-semibold text-sm">{label}</div>
                  <div className="muted text-sm mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="card w-full max-w-md" style={{ padding: '36px' }}>
          <div className="mb-6">
            <div className="lg:hidden text-2xl font-black mb-4">
              Fin<span style={{ color: '#8b5cf6' }}>Track</span>
            </div>
            <h1 className="text-2xl font-bold">
              {register ? 'Create account' : 'Welcome back'}
            </h1>
            <p className="muted mt-1 text-sm">
              {register
                ? 'Start tracking your finances today.'
                : 'Sign in to your dashboard.'}
            </p>
          </div>

          <div className="space-y-4">
            {register && (
              <div>
                <label className="label">Full Name</label>
                <input
                  className="input"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label className="label">Email Address</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPwd ? 'text' : 'password'}
                  placeholder={register ? 'At least 6 characters' : 'Your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 0,
                    cursor: 'pointer',
                    color: '#8b92a5',
                    padding: 0,
                  }}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {register && (
              <div>
                <label className="label">Confirm Password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Repeat your password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            )}
          </div>

          {err && (
            <div
              className="mt-4 text-sm rounded-lg px-4 py-3"
              style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' }}
            >
              {err}
            </div>
          )}

          <button
            className="btn btn-primary w-full mt-6"
            type="submit"
            disabled={loading}
            style={{ padding: '13px', fontSize: 15 }}
          >
            {loading ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
          </button>

          <button
            type="button"
            onClick={() => nav(register ? '/login' : '/register')}
            className="w-full mt-4 text-sm text-center"
            style={{ background: 'none', border: 0, cursor: 'pointer', color: '#8b5cf6', padding: '8px' }}
          >
            {register
              ? 'Already have an account? Sign in'
              : "Don't have an account? Create one"}
          </button>
        </form>
      </div>
    </div>
  );
}
