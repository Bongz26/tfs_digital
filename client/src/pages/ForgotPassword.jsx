import React, { useState } from 'react';
import { forgotPassword } from '../api/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setMessage(res.message || 'If an account exists, a reset link has been sent.');
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
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
          <h1 className="text-3xl font-bold text-white mb-2">Thusanang Funeral Services</h1>
          <p className="text-red-200">Reset your password</p>
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 border rounded-lg" placeholder="you@example.com" required />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-red-700 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-800 disabled:opacity-50">
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
          <p className="mt-4 text-sm text-gray-600">You will receive an email with a link to reset your password.</p>
        </div>
      </div>
    </div>
  );
}

