import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'framer-motion';

interface AuthProps {
  onClose?: () => void;
  defaultMode?: 'login' | 'register';
}

const Auth: React.FC<AuthProps> = ({ onClose, defaultMode = 'login' }) => {
  const { login, register } = useAuth();
  const { t } = useLanguage();
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'user' | 'artisan'>('user');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    if (!email || !password) {
      setError(t('authErrorRequired'));
      return false;
    }

    if (!validateEmail(email)) {
      setError(t('authErrorEmailInvalid'));
      return false;
    }

    if (password.length < 6) {
      setError(t('authErrorPasswordShort'));
      return false;
    }

    if (mode === 'register') {
      if (!username) {
        setError(t('authErrorRequired'));
        return false;
      }

      if (password !== passwordConfirm) {
        setError(t('authErrorPasswordMismatch'));
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(username, email, password, role);
      }
      onClose?.();
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.message?.includes('already')) {
        setError(t('authErrorEmailExists'));
      } else if (err.message?.includes('credentials') || err.message?.includes('password')) {
        setError(t('authErrorInvalidCredentials'));
      } else {
        setError(err.message || 'An error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setPassword('');
    setPasswordConfirm('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-[var(--color-surface)] rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
              {t('authWelcome')}
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              {t('authWelcomeSubtitle')}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-2 mb-6 bg-[var(--color-page-bg)] p-1 rounded-lg">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                mode === 'login'
                  ? 'bg-[var(--color-primary-accent)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {t('authLoginTitle')}
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                mode === 'register'
                  ? 'bg-[var(--color-primary-accent)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {t('authRegisterTitle')}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                  {t('authUsername')}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('authUsernamePlaceholder')}
                  className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-page-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-accent)]"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                {t('authEmail')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('authEmailPlaceholder')}
                className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-page-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-accent)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                {t('authPassword')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('authPasswordPlaceholder')}
                className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-page-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-accent)]"
              />
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    {t('authPasswordConfirm')}
                  </label>
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder={t('authPasswordConfirmPlaceholder')}
                    className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-page-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-accent)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    {t('authRoleLabel')}
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('user')}
                      className={`flex-1 py-3 px-4 rounded-lg border transition-all ${
                        role === 'user'
                          ? 'border-[var(--color-primary-accent)] bg-[var(--color-primary-accent)]/10 text-[var(--color-primary-accent)]'
                          : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {t('authRoleUser')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('artisan')}
                      className={`flex-1 py-3 px-4 rounded-lg border transition-all ${
                        role === 'artisan'
                          ? 'border-[var(--color-primary-accent)] bg-[var(--color-primary-accent)]/10 text-[var(--color-primary-accent)]'
                          : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {t('authRoleArtisan')}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-[var(--color-primary-accent)] text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? mode === 'login'
                  ? t('authLoggingIn')
                  : t('authRegistering')
                : mode === 'login'
                ? t('authLoginButton')
                : t('authRegisterButton')}
            </button>
          </form>

          {/* Toggle Mode Link */}
          <div className="mt-6 text-center">
            <button
              onClick={toggleMode}
              className="text-[var(--color-primary-accent)] hover:underline text-sm"
            >
              {mode === 'login' ? t('authRegisterLink') : t('authLoginLink')}
            </button>
          </div>

          {/* Guest Mode */}
          {onClose && (
            <div className="mt-4 text-center">
              <button
                onClick={onClose}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-sm"
              >
                {t('authGuestMode')}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;

