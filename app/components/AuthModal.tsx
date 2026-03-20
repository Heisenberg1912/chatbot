'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface Props {
  onClose: () => void;
  onAuth: (
    action: 'login' | 'register',
    data: Record<string, string>
  ) => Promise<{ error?: string; user?: unknown }>;
}

export default function AuthModal({ onClose, onAuth }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '', name: '', company: '', phone: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await onAuth(mode, form);
      if (result.error) {
        setError(result.error);
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-surface-light border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-xl dark:shadow-none text-gray-900 dark:text-content">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/5">
          <h2 className="font-semibold text-gray-900 dark:text-white">{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>
          <button onClick={onClose} className="text-gray-500 dark:text-content-muted hover:text-gray-900 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-400/10 px-3 py-2 rounded-lg">{error}</div>
          )}

          {mode === 'register' && (
            <div>
              <label className="text-xs text-gray-600 dark:text-content-muted mb-1 block font-medium">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-sm outline-none focus:border-blue-500 text-gray-900 dark:text-content placeholder-gray-400 dark:placeholder-content-muted transition-colors"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-gray-600 dark:text-content-muted mb-1 block font-medium">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-sm outline-none focus:border-blue-500 text-gray-900 dark:text-content placeholder-gray-400 dark:placeholder-content-muted transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600 dark:text-content-muted mb-1 block font-medium">Password *</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-sm outline-none focus:border-blue-500 text-gray-900 dark:text-content placeholder-gray-400 dark:placeholder-content-muted transition-colors"
            />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="text-xs text-gray-600 dark:text-content-muted mb-1 block font-medium">Company</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => updateField('company', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-sm outline-none focus:border-blue-500 text-gray-900 dark:text-content placeholder-gray-400 dark:placeholder-content-muted transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-content-muted mb-1 block font-medium">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-sm outline-none focus:border-blue-500 text-gray-900 dark:text-content placeholder-gray-400 dark:placeholder-content-muted transition-colors"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-surface hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition text-sm font-medium flex items-center justify-center gap-2 mt-2 shadow-sm"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <p className="text-xs text-gray-500 dark:text-content-muted text-center pt-2">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}