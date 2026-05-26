#!/usr/bin/env python3
"""
Telescopius API Proxy using cloudscraper
Called by the AstroCapture backend to bypass Cloudflare
"""
import sys
import json
import cloudscraper

TELESCOPIUS_BASE = 'https://api.telescopius.com/v2.2'
API_KEY = '659239331db06d5571f1ee34fdadb196'

ENDPOINTS = {
    'quote': '/quote-of-the-day',
    'search': '/targets/search',
    'highlights': '/targets/highlights',
    'solar': '/solar-system/times',
    'pictures': '/pictures/search',
    'lists': '/targets/lists',
}

def fetch(endpoint_key, params=None):
    scraper = cloudscraper.create_scraper()
    path = ENDPOINTS.get(endpoint_key)
    if not path:
        return {'error': f'Unknown endpoint: {endpoint_key}'}
    
    try:
        response = scraper.get(
            f'{TELESCOPIUS_BASE}{path}',
            headers={'Authorization': f'Key {API_KEY}'},
            params=params or {},
            timeout=30
        )
        if response.status_code == 200:
            return response.json()
        else:
            return {'error': f'HTTP {response.status_code}', 'body': response.text[:200]}
    except Exception as e:
        return {'error': str(e)}

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: telescopius_proxy.py <endpoint> [params_json]'}, indent=2))
        sys.exit(1)
    
    endpoint = sys.argv[1]
    params = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    
    result = fetch(endpoint, params)
    print(json.dumps(result, indent=2))
