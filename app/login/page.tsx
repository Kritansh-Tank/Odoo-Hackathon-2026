'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Truck, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

type Mode = 'login' | 'signup' | 'forgot';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
  });

  const update = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setError('Full name is required');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name },
      },
    });
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Account created! Check your email to verify, then log in.');
      setMode('login');
    }
    setLoading(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Password reset email sent. Check your inbox.');
    }
    setLoading(false);
  };

  const handleSubmit = mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handleForgot;

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg-base)' }}>
      {/* Left — Branding Panel */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="hidden lg:flex flex-col justify-between w-[42%] p-12"
        style={{
          background: 'linear-gradient(135deg, #0a0a15 0%, #0e0e1a 60%, #141426 100%)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
          >
            <Truck size={20} className="text-black" />
          </div>
          <div>
            <div className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
              TransitOps
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Smart Transport Operations
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-5xl font-black leading-tight mb-6"
            style={{ color: 'var(--color-text-primary)', letterSpacing: '-2px' }}
          >
            Fleet Management,{' '}
            <span className="gradient-text">Reimagined.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-base leading-relaxed mb-10"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Track vehicles, dispatch drivers, manage maintenance, and get AI-powered risk assessments —
            all in one centralized platform.
          </motion.p>

          {/* Feature list */}
          {[
            '🚚 Real-time vehicle & driver tracking',
            '🤖 AI-powered dispatch risk assessment',
            '⛽ Fuel efficiency & cost analytics',
            '📊 3D visual fleet reports',
            '🔔 Smart license expiry alerts',
          ].map((feat, i) => (
            <motion.div
              key={feat}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.08, duration: 0.4 }}
              className="flex items-center gap-3 mb-3"
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--color-amber-500)' }}
              />
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {feat}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Bottom badge */}
        <div
          className="glass rounded-xl p-4 inline-flex items-center gap-3"
          style={{ borderColor: 'rgba(245,158,11,0.2)' }}
        >
          <div className="flex -space-x-2">
            {['FM', 'DR', 'SA'].map((initials) => (
              <div
                key={initials}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2"
                style={{
                  background: 'var(--color-bg-elevated)',
                  borderColor: 'var(--color-amber-500)',
                  color: 'var(--color-amber-400)',
                }}
              >
                {initials}
              </div>
            ))}
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Role-based access
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Admin · Fleet Manager · Driver · Safety Officer · Financial Analyst
            </div>
          </div>
        </div>
      </motion.div>

      {/* Right — Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              <Truck size={18} className="text-black" />
            </div>
            <span className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
              TransitOps
            </span>
          </div>

          {/* Title */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Reset password'}
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {mode === 'login'
                ? 'Sign in to your TransitOps account'
                : mode === 'signup'
                ? 'Sign up as an Employee — Admin assigns roles'
                : 'Enter your email to receive a reset link'}
            </p>
          </div>

          {/* Success message */}
          {success && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="alert alert-success mb-4">
              <AlertCircle size={16} />
              <span>{success}</span>
            </motion.div>
          )}

          {/* Error message */}
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="alert alert-danger mb-4">
              <AlertCircle size={16} />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label">Full Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Alex Johnson"
                  value={form.full_name}
                  onChange={(e) => update('full_name', e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label className="label">Email Address</label>
              <input
                className="input"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    minLength={mode === 'signup' ? 8 : undefined}
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-xs hover:underline"
                  style={{ color: 'var(--color-amber-400)' }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {mode === 'signup' && (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                ðŸ”’ All new accounts are created as <strong style={{ color: 'var(--color-text-secondary)' }}>Employee (Driver)</strong> role. Admins promote roles from the Settings screen.
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg w-full mt-2"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Switch mode */}
          <div className="mt-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {mode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <button onClick={() => setMode('signup')} className="font-semibold hover:underline" style={{ color: 'var(--color-amber-400)' }}>
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="font-semibold hover:underline" style={{ color: 'var(--color-amber-400)' }}>
                  Sign in
                </button>
              </>
            )}
          </div>

          {/* Demo credentials hint */}
          <div
            className="mt-6 p-3 rounded-lg text-xs text-center"
            style={{
              background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.15)',
              color: 'var(--color-text-muted)',
            }}
          >
            Demo: <span style={{ color: 'var(--color-amber-400)' }}>admin@transitops.com</span> / <span style={{ color: 'var(--color-amber-400)' }}>Admin@123</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

