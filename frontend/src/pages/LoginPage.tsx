import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader, CheckCircle } from 'lucide-react';
import apiService from '../services/api';

/**
 * Login Page - LegalArie
 * Professional login interface for legal practice management
 */

export default function LoginPage() {
  const [email, setEmail] = useState('owner@legalaarie.com');
  const [password, setPassword] = useState('Demo@123456');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await apiService.login(email, password);
      
      if (result) {
        navigate('/dashboard');
      } else {
        setError('Invalid email or password');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      const result = await apiService.login('owner@legalaarie.com', 'Demo@123456');
      
      if (result) {
        navigate('/dashboard');
      } else {
        setError('Demo credentials not found. Please contact support.');
      }
    } catch (err: any) {
      setError('Failed to login with demo account');
      console.error('Demo login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="w-full max-w-md relative z-10">
        {/* Logo & Branding */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg mb-4">
            <span className="text-3xl font-bold text-white">⚖️</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">LegalArie</h1>
          <p className="text-slate-400">Legal Practice Management Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-slate-800">
          <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-slate-400 text-sm mb-8">Sign in to your account to continue</p>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 cursor-pointer"
                  disabled={isLoading}
                />
                <span className="text-sm text-slate-300">Remember me</span>
              </label>
              <a href="#forgot-password" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                Forgot password?
              </a>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-500 disabled:to-blue-600 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Demo Login Button */}
          <button
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="w-full mt-4 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-700 text-slate-200 font-medium py-3 rounded-lg transition-colors border border-slate-700 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Try Demo Account
          </button>

          {/* Divider */}
          <div className="mt-6 pt-6 border-t border-slate-700 text-center">
            <p className="text-sm text-slate-400">
              demo@example.com / Demo@123456
            </p>
          </div>
        </div>

        {/* Footer Text */}
        <div className="mt-8 text-center text-slate-400 text-sm">
          <p>© 2026 LegalArie. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

