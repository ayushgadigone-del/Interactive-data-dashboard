import React, { useState } from 'react';
import { 
  BarChart3, 
  ShieldCheck, 
  AlertCircle, 
  ArrowLeft, 
  Lock, 
  Mail, 
  CheckCircle2, 
  Sparkles
} from 'lucide-react';

export interface AuthUser {
  email: string;
  name: string;
  role: string;
}

interface SignInPageProps {
  onSuccess: (user: AuthUser) => void;
  onBackToLanding: () => void;
}

export const SignInPage: React.FC<SignInPageProps> = ({ onSuccess, onBackToLanding }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Demo accounts for instant testing
  const DEMO_ACCOUNTS = [
    { email: 'ayushgadigone@gmail.com', name: 'Ayush (Lead Analyst)', role: 'Lead Analyst' },
    { email: 'analyst.demo@gmail.com', name: 'Data Analyst Demo', role: 'Analyst' },
    { email: 'researcher.demo@gmail.com', name: 'Research Scholar', role: 'Scholar' },
  ];

  const handleSelectDemo = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword('password123');
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError('Please enter your Gmail address.');
      return;
    }

    // Validation: Any valid Gmail address
    const isGmail = /^[a-zA-Z0-9._%+-]+@(gmail\.com|googlemail\.com)$/i.test(trimmedEmail);
    if (!isGmail) {
      setError('Please enter a valid Gmail address (e.g. yourname@gmail.com).');
      return;
    }

    // Ensure username before @
    const usernamePart = trimmedEmail.split('@')[0];
    if (!usernamePart || usernamePart.length < 1) {
      setError('Please enter a valid Gmail identifier.');
      return;
    }

    setIsSubmitting(true);

    // Formulate user profile
    setTimeout(() => {
      setIsSubmitting(false);
      const displayName = usernamePart
        .split(/[._+-]/)
        .filter(Boolean)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');

      const user: AuthUser = {
        email: trimmedEmail,
        name: displayName || 'Gmail User',
        role: trimmedEmail.includes('analyst') ? 'Analyst' : 'Member',
      };

      onSuccess(user);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Back Button */}
        <button
          onClick={onBackToLanding}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 mb-6 px-3 py-1.5 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Landing Page</span>
        </button>

        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-sm mb-1">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">
            Sign in to Data Studio
          </h2>
          <p className="text-xs text-stone-600 flex items-center justify-center gap-1.5">
            <span>Visual Analytics & Intelligence Platform</span>
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm sm:rounded-2xl border border-stone-200 sm:px-8 space-y-6">
          {/* Access Policy Badge */}
          <div className="bg-indigo-50 border border-indigo-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-indigo-900">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Gmail Access:</span>
              <p className="text-[11px] text-indigo-700 mt-0.5">
                Sign in is authorized for anyone with a valid <strong className="font-mono font-bold text-indigo-900">@gmail.com</strong> address.
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                Gmail Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  id="email-input"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="yourname@gmail.com"
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white placeholder-stone-400"
                />
              </div>
              <p className="text-[10px] text-stone-500 mt-1">
                Must be a valid <span className="font-mono font-medium text-stone-700">@gmail.com</span> address
              </p>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                Password
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  id="password-input"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white placeholder-stone-400"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="signin-submit-btn"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all cursor-pointer disabled:opacity-50"
            >
              Sign In
            </button>
          </form>

          {/* Quick Demo Pre-fill for Reviewers */}
          <div className="pt-2 border-t border-stone-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>Quick Test Accounts</span>
              </span>
              <span className="text-[10px] text-stone-600">Click to autofill</span>
            </div>
            <div className="space-y-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectDemo(acc)}
                  className="w-full text-left p-2 rounded-lg border border-stone-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors flex items-center justify-between text-xs cursor-pointer group"
                >
                  <div>
                    <div className="font-mono font-medium text-stone-800 text-[11px] group-hover:text-indigo-700">
                      {acc.email}
                    </div>
                    <div className="text-[10px] text-stone-700">{acc.name} • {acc.role}</div>
                  </div>
                  <CheckCircle2 className="w-3.5 h-3.5 text-stone-400 group-hover:text-indigo-600" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
