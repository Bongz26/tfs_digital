import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api/auth';

function getTokenFromLocation() {
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  const hashParams = new URLSearchParams(hash.replace('#', ''));
  const accessToken = hashParams.get('access_token');
  if (accessToken) return accessToken;
  const searchParams = new URLSearchParams(search);
  const tokenParam = searchParams.get('token');
  if (tokenParam) return tokenParam;
  return null;
}

export default function ResetPassword() {
  const [token, setToken] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setToken(getTokenFromLocation());
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!token) {
      setError('Invalid or missing reset token. Open the link from the email.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(password, token);
      setMessage('Password reset successful. Redirecting to sign in...');
      setCompleted(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError('Password reset failed. Try again.');
    } finally {
      if (!completed) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-red-800 to-red-900">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30"></div>
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-500 rounded-full shadow-lg mb-4">
            <span className="text-4xl font-bold text-red-900">T</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Thusanang Funeral Services</h1>
          <p className="text-red-200">Set a new password</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {message}
              </div>
            )}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                placeholder="••••••••"
                required
                autoComplete="new-password"
                disabled={loading || completed}
              />
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                placeholder="••••••••"
                required
                autoComplete="new-password"
                disabled={loading || completed}
              />
            </div>
            <button
              type="submit"
              disabled={loading || completed}
              className="w-full bg-red-700 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-800 focus:ring-4 focus:ring-red-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (completed ? 'Redirecting...' : 'Updating...') : 'Reset Password'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-red-600 hover:text-red-800 font-medium">Back to Sign In</Link>
          </div>
        </div>
        <p className="mt-8 text-center text-sm text-red-200">© {new Date().getFullYear()} Thusanang Funeral Services. All rights reserved.</p>
      </div>
    </div>
  );
}
