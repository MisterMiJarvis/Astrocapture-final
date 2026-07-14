#!/usr/bin/env python3
"""
Telescopius API Proxy
Called by the AstroCapture backend to fetch data from Telescopius API.
Uses a browser User-Agent to pass Cloudflare's bot check (no cloudscraper needed).

Includes a 6-hour disk cache so the app still works when Telescopius rate-limits us.
"""
import sys
import json
import os
import time
import hashlib
import requests

TELESCOPIUS_BASE = 'https://api.telescopius.com/v2.2'
API_KEY = 'd79fde531207727158e6d8ff0a012d2f'

HEADERS = {
    'Authorization': f'Key {API_KEY}',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
    'Accept': 'application/json',
}

ENDPOINTS = {
    'quote': '/quote-of-the-day',
    'search': '/targets/search',
    'highlights': '/targets/highlights',
    'solar': '/solar-system/times',
    'pictures': '/pictures/search',
    'lists': '/targets/lists',
}

CACHE_DIR = '/home/ubuntu/astrocapture/api/cache/telescopius'
CACHE_TTL = 6 * 3600  # 6 hours

def cache_key(endpoint, params):
    # Filter out empty string values so they don't affect the cache key
    filtered = {k: v for k, v in (params or {}).items() if v}
    raw = f'{endpoint}:{json.dumps(filtered, sort_keys=True)}'
    return hashlib.md5(raw.encode()).hexdigest()

def cache_path(key):
    return os.path.join(CACHE_DIR, f'{key}.json')

def read_cache(key):
    path = cache_path(key)
    if not os.path.exists(path):
        return None
    age = time.time() - os.path.getmtime(path)
    if age > CACHE_TTL:
        return None
    try:
        with open(path, 'r') as f:
            return json.load(f)
    except:
        return None

def write_cache(key, data):
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = cache_path(key)
    try:
        with open(path, 'w') as f:
            json.dump(data, f)
    except:
        pass

def fetch(endpoint_key, params=None):
    # Check cache first
    key = cache_key(endpoint_key, params)
    cached = read_cache(key)
    if cached is not None:
        return cached
    
    path = ENDPOINTS.get(endpoint_key)
    if not path:
        return {'error': f'Unknown endpoint: {endpoint_key}'}
    
    try:
        response = requests.get(
            f'{TELESCOPIUS_BASE}{path}',
            headers=HEADERS,
            params=params or {},
            timeout=30
        )
        if response.status_code == 200:
            data = response.json()
            write_cache(key, data)
            return data
        else:
            # On error, try stale cache (any age)
            if cached is not None:
                return cached
            return {'error': f'HTTP {response.status_code}', 'body': response.text[:200]}
    except Exception as e:
        # On exception, try stale cache
        if cached is not None:
            return cached
        return {'error': str(e)}

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: telescopius_proxy.py <endpoint> [params_json]'}, indent=2))
        sys.exit(1)
    
    endpoint = sys.argv[1]
    params = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    
    result = fetch(endpoint, params)
    print(json.dumps(result, indent=2))