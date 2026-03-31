'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SupabaseClient } from '@supabase/supabase-js';

function useSupabase() {
  const ref = useRef<SupabaseClient | null>(null);
  if (typeof window !== 'undefined' && !ref.current) {
    ref.current = createClient();
  }
  return ref.current!;
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useSupabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Sign out existing session first to prevent stale user data
    await supabase.auth.signOut().catch(() => {});

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  const handleMicrosoftSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    if (error) {
      setError(error.message);
    } else {
      setError('');
      alert('Password reset email sent. Check your inbox.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] animate-gradient-bg relative overflow-hidden">
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(13,148,136,0.15),_transparent_50%),radial-gradient(ellipse_at_bottom_left,_rgba(124,58,237,0.1),_transparent_50%)]" />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Frosted glass card */}
        <div className="bg-white/[0.07] backdrop-blur-xl border border-white/[0.12] rounded-2xl shadow-2xl p-8">
          {/* Logo & branding */}
          <div className="text-center space-y-4 mb-8">
            <div className="flex items-center justify-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-teal-600/30">
                TS
              </div>
              <span className="text-2xl font-semibold text-white tracking-tight font-[family-name:var(--font-heading)]">
                Timesheet System
              </span>
            </div>
            <p className="text-sm text-slate-400">
              Sign in to manage your timesheets
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-sm font-medium text-slate-300">
                Email
              </label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:border-teal-500 focus-visible:ring-teal-500/30"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="login-password" className="text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 pr-16 focus-visible:border-teal-500 focus-visible:ring-teal-500/30"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-lg shadow-teal-600/20"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-transparent px-2 text-slate-500">or</span>
            </div>
          </div>

          {/* Microsoft SSO */}
          <Button
            variant="outline"
            className="w-full h-10 border-white/20 text-white hover:bg-white/10 bg-transparent"
            onClick={handleMicrosoftSignIn}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 21 21" fill="none">
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            Sign in with Microsoft
          </Button>

          {/* Forgot password */}
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-teal-400 hover:text-teal-300 hover:underline transition-colors"
            >
              Forgot password?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
