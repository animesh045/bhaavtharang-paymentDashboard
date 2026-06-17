'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push('/admin');
        router.refresh();
      } else {
        setErrorMsg(data.error || 'Incorrect administrative password.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#060608] text-slate-100 min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Glow backgrounds */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-radial-glow -z-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-radial-glow-purple -z-10 pointer-events-none" />

      <div className="max-w-md w-full glass-card rounded-3xl p-8 space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        
        {/* Branding header */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 p-[1.5px] shadow-lg shadow-indigo-500/20 mx-auto">
            <div className="h-full w-full bg-[#0c0c11] rounded-[14px] flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-indigo-400" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
              META VIBRONICS
            </h1>
            <p className="text-slate-500 text-xs uppercase font-bold tracking-widest">
              Administrative Console
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/40 border border-rose-500/30 text-rose-200 p-3.5 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Enter Admin Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-600">
                <Lock className="h-4.5 w-4.5" />
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full bg-[#0d0d12] border border-slate-800 focus:border-indigo-500 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none text-slate-100 placeholder:text-slate-700 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-100 disabled:opacity-50 flex items-center justify-center space-x-2 text-sm"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <>
                <span>Access Console</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <a
            href="/"
            className="text-[11px] font-semibold text-slate-600 hover:text-indigo-400 transition-colors"
          >
            Return to landing page
          </a>
        </div>
      </div>
    </div>
  );
}
