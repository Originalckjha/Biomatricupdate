'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Fingerprint, Lock, Eye, EyeOff } from 'lucide-react';
import { Suspense } from 'react';

function LoginForm() {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get('from') ?? '/';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push(from);
        router.refresh();
      } else {
        setError('Wrong password — try again.');
        setPassword('');
      }
    } catch {
      setError('Could not connect. Check your internet and try again.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700
            flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25">
            <Fingerprint size={34} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Biometric Live</h1>
          <p className="text-gray-500 text-sm mt-1">This dashboard is password protected</p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm font-medium mb-2">
              Dashboard Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
                className="w-full bg-gray-800 border border-gray-700 focus:border-indigo-500
                  rounded-xl pl-10 pr-11 py-3 text-white placeholder-gray-600 outline-none
                  transition-colors text-sm"
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1"
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
                <span>⚠</span> {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl
              font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Checking…' : 'Access Dashboard →'}
          </button>
        </form>

        {/* Admin note */}
        <div className="mt-8 p-4 bg-gray-800/40 border border-gray-700/40 rounded-xl">
          <p className="text-gray-500 text-xs leading-relaxed">
            <strong className="text-gray-400">Admin:</strong> Set the{' '}
            <code className="text-indigo-400 bg-gray-900/60 px-1 py-0.5 rounded">DASHBOARD_PASSWORD</code>{' '}
            environment variable in your Vercel project settings to control who can access this dashboard.
            If no password is set, the dashboard is open to anyone.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
