import React, { useState } from 'react';
import { User, ViewState } from '../types';
import { authenticateUser } from '../src/services/userService';
import { syncFiltersToServer } from '../src/services/filterService';
import { syncProjectsToServer } from '../src/services/projectService';
import { LogIn, Eye, EyeOff } from 'lucide-react';

interface AstroSuiteLoginViewProps {
  onLogin: (user: User) => void;
  onNavigate?: (view: ViewState) => void;
}

const AstroSuiteLoginView: React.FC<AstroSuiteLoginViewProps> = ({ onLogin, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const result = await authenticateUser(email, password);
      if (result) {
        // Sync localStorage data to server on login
        try {
          await Promise.all([
            syncFiltersToServer(),
            syncProjectsToServer(),
          ]);
        } catch (syncErr) {
          console.warn('Sync on login failed (non-critical):', syncErr);
        }
        onLogin(result.user);
      } else {
        setError('Email ou mot de passe incorrect');
      }
    } catch (err) {
      setError('Erreur de connexion. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1a2238] border border-[rgba(148,163,184,0.12)] mb-4">
            <LogIn className="w-8 h-8 text-[#3b82f6]" />
          </div>
          <h1 className="text-2xl font-bold text-[#e8eaf6]">Astro Suite</h1>
          <p className="text-[#8e9aaf] mt-2">Connectez-vous pour accéder aux modules avancés</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-[#8e9aaf] text-sm mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-4 py-2.5 text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none"
              placeholder="vous@exemple.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-[#8e9aaf] text-sm mb-1">Mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-4 py-2.5 pr-10 text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8e9aaf] hover:text-[#e8eaf6]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Connexion...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Se connecter
              </>
            )}
          </button>
        </form>

        {/* Back to site */}
        {onNavigate && (
          <button
            onClick={() => onNavigate(ViewState.GALLERY)}
            className="mt-4 text-center w-full text-[#8e9aaf] hover:text-[#e8eaf6] text-sm transition-colors"
          >
            ← Retour au site
          </button>
        )}
      </div>
    </div>
  );
};

export default AstroSuiteLoginView;
