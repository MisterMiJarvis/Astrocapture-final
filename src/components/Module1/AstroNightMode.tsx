// ============================================================================
// COMPOSANT: AstroNightMode — Toggle thème rouge astro
// Module 1 — Dashboard Central
// ============================================================================

import React, { useEffect, useCallback } from 'react';

interface AstroNightModeProps {
  enabled: boolean;
  onToggle: () => void;
}

export const AstroNightMode: React.FC<AstroNightModeProps> = ({ enabled, onToggle }) => {
  // Applique le thème rouge au document entier
  useEffect(() => {
    if (enabled) {
      document.documentElement.classList.add('astro-night-mode');
    } else {
      document.documentElement.classList.remove('astro-night-mode');
    }

    return () => {
      document.documentElement.classList.remove('astro-night-mode');
    };
  }, [enabled]);

  // Raccourci clavier: N pour toggle
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'n' || e.key === 'N') {
      // Éviter conflit avec inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      onToggle();
    }
  }, [onToggle]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <button
      onClick={onToggle}
      className={`
        fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full
        text-sm font-medium transition-all shadow-lg
        ${enabled
          ? 'bg-red-900 text-red-200 border border-red-700 hover:bg-red-800'
          : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'}
      `}
      title={enabled ? 'Mode nuit actif (N pour désactiver)' : 'Mode nuit (N pour activer)'}
    >
      <span className="text-lg">{enabled ? '🌙' : '☀️'}</span>
      <span className="hidden sm:inline">
        {enabled ? 'Mode Nuit' : 'Mode Jour'}
      </span>
    </button>
  );
};

export default AstroNightMode;
