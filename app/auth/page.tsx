'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.error ?? 'Login failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.error ?? 'Registration failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060614] text-white font-mono flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xs">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="text-3xl font-bold tracking-widest bg-gradient-to-r from-orange-500 via-yellow-400 to-cyan-500 bg-clip-text text-transparent">
            SPITWARS
          </div>
          <div className="text-[10px] text-gray-600 tracking-widest mt-1">ONLINE BATTLES</div>
        </div>

        {/* Tab selector */}
        <div className="flex gap-1 mb-4 bg-black/30 p-1 rounded-lg">
          {(['login', 'register'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className="flex-1 py-2 rounded-md text-xs font-bold tracking-widest transition-all"
              style={{
                background: tab === t ? 'rgba(249,115,22,.2)' : 'transparent',
                color: tab === t ? '#f97316' : '#6b7280',
                border: tab === t ? '1px solid #f9731644' : '1px solid transparent',
              }}
            >
              {t === 'login' ? 'LOGIN' : 'REGISTER'}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="bg-white/[.03] border border-[#1e3a2f] rounded-xl p-4">
          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <div>
                <label className="text-[9px] text-gray-500 tracking-widest block mb-1">
                  USERNAME OR EMAIL
                </label>
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  required
                  className="w-full bg-black/30 border border-gray-700 rounded-lg px-3 py-2.5 text-sm font-mono text-white placeholder-gray-600 focus:border-orange-700 focus:outline-none"
                  placeholder="gerald or gerald@andes.com"
                />
              </div>
              <div>
                <label className="text-[9px] text-gray-500 tracking-widest block mb-1">
                  PASSWORD
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-black/30 border border-gray-700 rounded-lg px-3 py-2.5 text-sm font-mono text-white placeholder-gray-600 focus:border-orange-700 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              {error && <div className="text-red-400 text-[11px] text-center">{error}</div>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 font-bold tracking-widest rounded-lg text-white mt-1 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#f97316,#dc2626)' }}
              >
                {loading ? 'LOGGING IN...' : 'LOGIN'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-3">
              <div>
                <label className="text-[9px] text-gray-500 tracking-widest block mb-1">
                  USERNAME
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={20}
                  pattern="[a-zA-Z0-9_-]+"
                  className="w-full bg-black/30 border border-gray-700 rounded-lg px-3 py-2.5 text-sm font-mono text-white placeholder-gray-600 focus:border-orange-700 focus:outline-none"
                  placeholder="GeraldTheLlama"
                />
                <div className="text-[8px] text-gray-700 mt-1">3–20 chars, letters/numbers/_-</div>
              </div>
              <div>
                <label className="text-[9px] text-gray-500 tracking-widest block mb-1">
                  EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-black/30 border border-gray-700 rounded-lg px-3 py-2.5 text-sm font-mono text-white placeholder-gray-600 focus:border-orange-700 focus:outline-none"
                  placeholder="gerald@andes.com"
                />
              </div>
              <div>
                <label className="text-[9px] text-gray-500 tracking-widest block mb-1">
                  PASSWORD
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-black/30 border border-gray-700 rounded-lg px-3 py-2.5 text-sm font-mono text-white placeholder-gray-600 focus:border-orange-700 focus:outline-none"
                  placeholder="min 6 characters"
                />
              </div>
              {error && <div className="text-red-400 text-[11px] text-center">{error}</div>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 font-bold tracking-widest rounded-lg text-white mt-1 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#f97316,#dc2626)' }}
              >
                {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
              </button>
            </form>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-[10px] text-gray-700">
          <a href="/" className="hover:text-gray-500">← back to home</a>
          <a href="/game" className="hover:text-orange-400 text-gray-500">Play as guest →</a>
        </div>
      </div>
    </div>
  );
}
