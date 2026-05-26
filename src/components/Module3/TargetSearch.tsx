import React, { useState, useCallback } from 'react';
import { CatalogTarget, TargetSearchResult } from '../../types/module3';
import { searchTarget } from '../../services/module3/framingService';

interface TargetSearchProps {
  onSelectTarget: (target: CatalogTarget) => void;
  lat?: number;
  lon?: number;
}

/**
 * Recherche multi-catalogue avec autocomplétion.
 */
export const TargetSearch: React.FC<TargetSearchProps> = ({ onSelectTarget, lat, lon }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TargetSearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    const res = await searchTarget(query, lat, lon);
    setResults(res);
    setLoading(false);
  }, [query, lat, lon]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="M31, NGC 7000, Orion..."
          className="flex-1 px-4 py-2 rounded border border-gray-300"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '...' : '🔍'}
        </button>
      </div>

      {results && results.results.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            {results.results.length} résultats
            {results.duplicateCount > 0 && ` (${results.duplicateCount} doublons fusionnés)`}
          </p>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {results.results.map((target) => (
              <button
                key={target.id}
                onClick={() => onSelectTarget(target)}
                className="w-full text-left p-3 rounded border hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{target.catalogName}</span>
                  <span className="text-xs text-gray-500">{target.type}</span>
                </div>
                <div className="text-sm text-gray-600">
                  RA {target.ra} | Dec {target.dec}
                  {target.magnitude !== undefined && ` | mag ${target.magnitude}`}
                </div>
                {target.aliases && target.aliases.length > 0 && (
                  <div className="text-xs text-gray-400">
                    Aussi : {target.aliases.join(', ')}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {results && results.results.length === 0 && (
        <p className="text-gray-500">Aucun résultat trouvé.</p>
      )}
    </div>
  );
};
