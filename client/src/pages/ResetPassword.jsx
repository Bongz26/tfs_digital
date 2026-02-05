import React, { useEffect, useState } from 'react';
import { resetPassword } from '../api/auth';

function parseHashParams() {
  if (typeof window === 'undefined') return {};
  const hash = window.location.hash || '';
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const access_token = params.get('access_token') || '';
  const refresh_token = params.get('refresh_token') || '';
  return { access_token, refresh_token };
}

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    const { access_token, refresh_token } = parseHashParams();
    if (access_token) {
      try {
        localStorage.setItem('tfs_access_token', access_token);
      } catch {}
      setToken(access_token);
    }
    if (refresh_token) {
      try {
        localStorage.setItem('tfs_refresh_token', refresh_token);
      } catch {}
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (!token) {
      setError('Missing reset token. Open the link from your email.');
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword(password, token);
      setMessage(res.message || 'Password reset successful. Please login.');
    } catch (err) {
      setError(err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-red-800 to-red-900">
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-500 rounded-full shadow-lg mb-4">
            <span className="text-4xl font-bold text-red-900">T</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-red-200">Enter a new password for your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">{message}</div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 border rounded-lg" placeholder="••••••••" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full px-4 py-3 border rounded-lg" placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-red-700 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-800 disabled:opacity-50">
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
          <p className="mt-4 text-sm text-gray-600">If this page shows missing token, open the password reset link from your email again.</p>
        </div>
      </div>
    </div>
  );
}

