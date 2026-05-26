import React, { useState } from 'react';

interface TestResult {
  name: string;
  status: 'loading' | 'success' | 'error' | 'info';
  data?: any;
  error?: string;
  duration?: number;
}

interface EndpointDoc {
  name: string;
  method: string;
  url: string;
  description: string;
  params: { name: string; required: boolean; description: string }[];
}

const ENDPOINTS: EndpointDoc[] = [
  {
    name: 'Quote of the Day',
    method: 'GET',
    url: '/api/telescopius/quote',
    description: 'Returns an inspirational astronomy quote',
    params: [],
  },
  {
    name: 'Search Targets',
    method: 'GET',
    url: '/api/telescopius/search',
    description: 'Search deep sky objects by name, type, or coordinates',
    params: [
      { name: 'q', required: true, description: 'Search query (e.g. M31)' },
      { name: 'lat', required: false, description: 'Observer latitude' },
      { name: 'lon', required: false, description: 'Observer longitude' },
      { name: 'timezone', required: false, description: 'Timezone' },
    ],
  },
  {
    name: 'Target Highlights',
    method: 'GET',
    url: '/api/telescopius/highlights',
    description: 'Returns popular targets visible from your location',
    params: [
      { name: 'lat', required: false, description: 'Observer latitude' },
      { name: 'lon', required: false, description: 'Observer longitude' },
      { name: 'timezone', required: false, description: 'Timezone' },
      { name: 'min_alt', required: false, description: 'Minimum altitude (default 20°)' },
    ],
  },
  {
    name: 'Solar System Times',
    method: 'GET',
    url: '/api/telescopius/solar',
    description: 'Sun, Moon and planets rise/set times',
    params: [
      { name: 'lat', required: false, description: 'Observer latitude' },
      { name: 'lon', required: false, description: 'Observer longitude' },
      { name: 'timezone', required: false, description: 'Timezone' },
    ],
  },
  {
    name: 'Search Pictures',
    method: 'GET',
    url: '/api/telescopius/pictures',
    description: 'Search astrophotography images from the community',
    params: [
      { name: 'order', required: false, description: 'Sorting (is_featured, date_taken, date_added, total_loves)' },
      { name: 'results_per_page', required: false, description: 'Results per page' },
    ],
  },
  {
    name: 'Target Lists',
    method: 'GET',
    url: '/api/telescopius/lists',
    description: 'Returns your saved target lists',
    params: [],
  },
];

const OBJECT_TYPES: { [key: string]: string } = {
  'STAR': 'Star',
  'DSTAR': 'Double Star',
  'GXY': 'Galaxy',
  'ENEB': 'Emission Nebula',
  'RNEB': 'Reflection Nebula',
  'PNEB': 'Planetary Nebula',
  'SNR': 'Supernova Remnant',
  'GCL': 'Globular Cluster',
  'OCL': 'Open Cluster',
};

const TelescopiusTestView: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [location, setLocation] = useState({ lat: 43.7889, lon: 4.7533, timezone: 'Europe/Paris' });
  const [activeTab, setActiveTab] = useState<'test' | 'docs'>('test');

  const addResult = (name: string, status: TestResult['status'], data?: any, error?: string, duration?: number) => {
    setResults(prev => [...prev, { name, status, data, error, duration }]);
  };

  const getObjectTypeName = (code: string) => OBJECT_TYPES[code] || code;

  const runAllTests = async () => {
    setResults([]);
    setIsRunning(true);

    // Test 1: Quote of the Day
    const test1Name = 'Quote of the Day';
    addResult(test1Name, 'loading');
    const t1Start = Date.now();
    try {
      const response = await fetch('/api/telescopius/quote');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const quote = await response.json();
      addResult(test1Name, 'success', quote, undefined, Date.now() - t1Start);
    } catch (err: any) {
      addResult(test1Name, 'error', undefined, err.message, Date.now() - t1Start);
    }

    // Test 2: Search M31
    const test2Name = 'Search M31';
    addResult(test2Name, 'loading');
    const t2Start = Date.now();
    try {
      const params = new URLSearchParams({ q: 'M31', lat: String(location.lat), lon: String(location.lon), timezone: location.timezone });
      const response = await fetch(`/api/telescopius/search?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const searchResults = await response.json();
      addResult(test2Name, 'success', searchResults, undefined, Date.now() - t2Start);
    } catch (err: any) {
      addResult(test2Name, 'error', undefined, err.message, Date.now() - t2Start);
    }

    // Test 4: Target Highlights
    const test4Name = 'Target Highlights';
    addResult(test4Name, 'loading');
    const t4Start = Date.now();
    try {
      const params = new URLSearchParams({ lat: String(location.lat), lon: String(location.lon), timezone: location.timezone, min_alt: '20' });
      const response = await fetch(`/api/telescopius/highlights?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const highlights = await response.json();
      addResult(test4Name, 'success', highlights, undefined, Date.now() - t4Start);
    } catch (err: any) {
      addResult(test4Name, 'error', undefined, err.message, Date.now() - t4Start);
    }

    // Test 5: Solar System Times
    const test5Name = 'Solar System Times';
    addResult(test5Name, 'loading');
    const t5Start = Date.now();
    try {
      const params = new URLSearchParams({ lat: String(location.lat), lon: String(location.lon), timezone: location.timezone });
      const response = await fetch(`/api/telescopius/solar?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const times = await response.json();
      addResult(test5Name, 'success', times, undefined, Date.now() - t5Start);
    } catch (err: any) {
      addResult(test5Name, 'error', undefined, err.message, Date.now() - t5Start);
    }

    // Test 6: Pictures
    const test6Name = 'Search Pictures';
    addResult(test6Name, 'loading');
    const t6Start = Date.now();
    try {
      const params = new URLSearchParams({ order: 'is_featured', results_per_page: '5' });
      const response = await fetch(`/api/telescopius/pictures?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const pictures = await response.json();
      addResult(test6Name, 'success', pictures, undefined, Date.now() - t6Start);
    } catch (err: any) {
      addResult(test6Name, 'error', undefined, err.message, Date.now() - t6Start);
    }

    // Test 7: Target Lists
    const test7Name = 'Target Lists';
    addResult(test7Name, 'loading');
    const t7Start = Date.now();
    try {
      const response = await fetch('/api/telescopius/lists');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const lists = await response.json();
      addResult(test7Name, 'success', lists, undefined, Date.now() - t7Start);
    } catch (err: any) {
      addResult(test7Name, 'error', undefined, err.message, Date.now() - t7Start);
    }

    setIsRunning(false);
  };

  const renderResult = (result: TestResult) => {
    const statusConfig = {
      loading: { icon: '⏳', color: 'text-yellow-400' },
      success: { icon: '✅', color: 'text-green-400' },
      error: { icon: '❌', color: 'text-red-400' },
      info: { icon: 'ℹ️', color: 'text-blue-400' },
    };
    const config = statusConfig[result.status];

    return (
      <div key={result.name} className="bg-background/50 border border-border rounded-lg p-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span>{config.icon}</span>
            <span className="font-semibold">{result.name}</span>
          </div>
          {result.duration !== undefined && result.duration > 0 && (
            <span className="text-xs text-text-secondary">{result.duration}ms</span>
          )}
        </div>

        {result.status === 'loading' && (
          <div className="text-sm text-text-secondary animate-pulse">Loading...</div>
        )}

        {result.status === 'error' && (
          <div className="text-sm text-red-400 bg-red-500/10 p-2 rounded">
            {result.error}
          </div>
        )}

        {result.status === 'success' && result.data && (
          <div className="text-sm">
            {renderData(result.name, result.data)}
          </div>
        )}

        {result.status === 'info' && (
          <div className="text-sm text-blue-300">{result.data}</div>
        )}
      </div>
    );
  };

  const renderData = (name: string, data: any) => {
    switch (name) {
      case 'Quote of the Day':
        return (
          <div className="italic text-text-secondary">
            "{data.text}" — {data.author}
          </div>
        );

      case 'Search M31':
      case 'Search Galaxies':
        return (
          <div>
            <div className="text-text-secondary mb-2">Found {data.total} objects (source: {data.source})</div>
            {data.targets?.slice(0, 5).map((target: any, i: number) => (
              <div key={i} className="flex items-center gap-2 py-1 border-b border-border/50 last:border-0">
                <span className="text-xs bg-primary/20 px-2 py-0.5 rounded">{getObjectTypeName(target.type)}</span>
                <span className="font-medium">{target.name}</span>
                {target.magnitude && <span className="text-xs text-text-secondary">Mag {target.magnitude}</span>}
              </div>
            ))}
          </div>
        );

      case 'Target Highlights':
        return (
          <div>
            <div className="text-text-secondary mb-2">{data.matched} highlighted targets</div>
            {data.page_results?.slice(0, 5).map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-2 py-1 border-b border-border/50 last:border-0">
                <span className="text-xs bg-accent/20 px-2 py-0.5 rounded">{getObjectTypeName(item.object?.type)}</span>
                <span>{item.object?.main_name || item.object?.main_id}</span>
              </div>
            ))}
          </div>
        );

      case 'Solar System Times':
        return (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-yellow-500/10 p-2 rounded">
              <div className="text-xs text-yellow-400">☀️ Sun</div>
              <div className="text-sm">Rise: {data.sun?.rise}</div>
              <div className="text-sm">Set: {data.sun?.set}</div>
            </div>
            <div className="bg-slate-500/10 p-2 rounded">
              <div className="text-xs text-slate-400">🌙 Moon</div>
              <div className="text-sm">Rise: {data.moon?.rise}</div>
              <div className="text-sm">Phase: {data.moon?.phase}%</div>
            </div>
          </div>
        );

      case 'Search Pictures':
        return (
          <div>
            <div className="text-text-secondary mb-2">{data.matched} pictures found</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {data.page_results?.slice(0, 5).map((pic: any, i: number) => (
                <div key={i} className="relative aspect-square bg-background rounded overflow-hidden">
                  {pic.thumbnail_url && (
                    <img 
                      src={pic.thumbnail_url} 
                      alt={pic.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                    <div className="text-xs truncate">{pic.title}</div>
                    <div className="text-[10px] text-text-secondary">by {pic.username}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'Target Lists':
        return (
          <div>
            <div className="text-text-secondary mb-2">{Array.isArray(data) ? data.length : 0} lists</div>
            {Array.isArray(data) && data.slice(0, 5).map((list: any, i: number) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <span className="text-xs bg-primary/20 px-2 py-0.5 rounded">📋</span>
                <span>{list.name}</span>
              </div>
            ))}
          </div>
        );

      default:
        return <pre className="text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">🔭 Telescopius API Test</h1>
          <p className="text-text-secondary">Testing real Telescopius API via backend proxy</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('test')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'test' ? 'bg-primary text-white' : 'bg-background border border-border hover:bg-background/80'}`}
          >
            🧪 Test
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'docs' ? 'bg-primary text-white' : 'bg-background border border-border hover:bg-background/80'}`}
          >
            📚 Docs
          </button>
        </div>
      </div>

      {activeTab === 'test' && (
        <>
          <div className="bg-background/30 border border-border rounded-xl p-4 mb-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-text-secondary block mb-1">Latitude</label>
                <input
                  type="number"
                  value={location.lat}
                  onChange={(e) => setLocation({ ...location, lat: parseFloat(e.target.value) })}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm"
                  step="0.0001"
                />
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Longitude</label>
                <input
                  type="number"
                  value={location.lon}
                  onChange={(e) => setLocation({ ...location, lon: parseFloat(e.target.value) })}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm"
                  step="0.0001"
                />
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Timezone</label>
                <input
                  type="text"
                  value={location.timezone}
                  onChange={(e) => setLocation({ ...location, timezone: e.target.value })}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-2 text-xs text-text-secondary">
              Default: Saint-Étienne-du-Grès (43.7889°N, 4.7533°E)
            </div>
          </div>

          <button
            onClick={runAllTests}
            disabled={isRunning}
            className="w-full px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg font-semibold transition-colors mb-6"
          >
            {isRunning ? 'Running...' : '▶️ Run All Tests'}
          </button>

          <div className="space-y-2">
            {results.map(renderResult)}
          </div>

          {results.length > 0 && !isRunning && (
            <div className="mt-6 p-4 bg-background/50 border border-border rounded-lg">
              <h3 className="font-semibold mb-2">📊 Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl text-green-400">{results.filter(r => r.status === 'success').length}</div>
                  <div className="text-xs text-text-secondary">Passed</div>
                </div>
                <div>
                  <div className="text-2xl text-red-400">{results.filter(r => r.status === 'error').length}</div>
                  <div className="text-xs text-text-secondary">Failed</div>
                </div>
                <div>
                  <div className="text-2xl text-text-secondary">{results.reduce((acc, r) => acc + (r.duration || 0), 0)}ms</div>
                  <div className="text-xs text-text-secondary">Total time</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'docs' && (
        <div className="space-y-4">
          <div className="bg-background/30 border border-border rounded-xl p-4">
            <h2 className="font-semibold mb-2">How it works</h2>
            <p className="text-sm text-text-secondary mb-2">
              The frontend calls the AstroCapture backend proxy (<code className="text-primary">/api/telescopius/*</code>), 
              which uses Python <code className="text-primary">cloudscraper</code> to bypass Cloudflare and call the real Telescopius API.
            </p>
          </div>

          <div className="bg-background/30 border border-border rounded-xl p-4">
            <h2 className="font-semibold mb-2">Object Types</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(OBJECT_TYPES).map(([code, name]) => (
                <div key={code} className="flex items-center gap-2 text-sm">
                  <span className="text-xs bg-primary/20 px-2 py-0.5 rounded font-mono">{code}</span>
                  <span className="text-text-secondary">{name}</span>
                </div>
              ))}
            </div>
          </div>

          {ENDPOINTS.map((endpoint, i) => (
            <div key={i} className="bg-background/50 border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-mono">{endpoint.method}</span>
                <code className="text-sm text-primary">{endpoint.url}</code>
              </div>
              <p className="text-sm text-text-secondary mb-3">{endpoint.description}</p>
              
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-secondary">
                    <th className="pb-2">Parameter</th>
                    <th className="pb-2">Required</th>
                    <th className="pb-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoint.params.map((param, j) => (
                    <tr key={j} className="border-t border-border/30">
                      <td className="py-2 font-mono text-primary">{param.name}</td>
                      <td className="py-2">
                        {param.required ? (
                          <span className="text-red-400 text-xs">Required</span>
                        ) : (
                          <span className="text-text-secondary text-xs">Optional</span>
                        )}
                      </td>
                      <td className="py-2 text-text-secondary">{param.description}</td>
                    </tr>
                  ))}
                  {endpoint.params.length === 0 && (
                    <tr><td className="py-2 text-text-secondary italic" colSpan={3}>No parameters required</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TelescopiusTestView;
