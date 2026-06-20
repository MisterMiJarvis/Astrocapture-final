import React, { useEffect, useRef } from 'react';

// Generate or retrieve a persistent session ID (stored in sessionStorage)
function getSessionId(): string {
  let sid = sessionStorage.getItem('ac_session_id');
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem('ac_session_id', sid);
  }
  return sid;
}

// Track a page view — fire-and-forget
function trackPageView(path: string) {
  const sessionId = getSessionId();
  const payload = {
    path,
    referrer: document.referrer || '',
    sessionId,
  };

  // Use sendBeacon for reliability (doesn't block page unload)
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  const API_BASE = (window as any).__AC_API_BASE__ || '/api';
  navigator.sendBeacon?.(`${API_BASE}/analytics/track`, blob) ||
    fetch(`${API_BASE}/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => { /* silent */ });
}

interface VisitorTrackerProps {
  currentPath: string;
}

/**
 * Invisible component: place once in the app root.
 * Tracks page views automatically on path change.
 */
const VisitorTracker: React.FC<VisitorTrackerProps> = ({ currentPath }) => {
  const lastTracked = useRef('');

  useEffect(() => {
    if (currentPath && currentPath !== lastTracked.current) {
      lastTracked.current = currentPath;
      // Small delay to avoid tracking rapid navigations
      const timer = setTimeout(() => trackPageView(currentPath), 300);
      return () => clearTimeout(timer);
    }
  }, [currentPath]);

  return null; // invisible
};

export default VisitorTracker;