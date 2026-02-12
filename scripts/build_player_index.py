#!/usr/bin/env python3
"""
Build a static player index (docs/data/players.json) from the backend API.

Sweeps player name prefixes to discover all MLS players, then corrects
team assignments using each player's most recent card year + sale date.

Usage:  python3 scripts/build_player_index.py
"""

import json
import os
import ssl
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

# --- Config ---
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(ROOT, '.env')
OUTPUT_PATH = os.path.join(ROOT, 'docs', 'data', 'players.json')

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

MLS_TEAM_NAMES = {
    'Atlanta United', 'Austin FC', 'CF Montreal', 'Charlotte FC',
    'Chicago Fire FC', 'Colorado Rapids', 'Columbus Crew', 'DC United',
    'FC Cincinnati', 'FC Dallas', 'Houston Dynamo FC', 'Inter Miami CF',
    'LA Galaxy', 'Los Angeles FC', 'Minnesota United', 'Nashville SC',
    'New England Revolution', 'New York City FC', 'New York Red Bulls',
    'Orlando City SC', 'Philadelphia Union', 'Portland Timbers',
    'Real Salt Lake', 'San Diego FC', 'San Jose Earthquakes',
    'Seattle Sounders FC', 'Sporting Kansas City', 'St. Louis City SC',
    'Toronto FC', 'Vancouver Whitecaps FC'
}

# Name prefixes to sweep all players.
# API requires 2+ chars and returns up to 50 results per query.
# Note: the search matches on team name too, so some 2-letter prefixes are
# dominated by team-name matches (e.g. "yo" → "New York"). Add targeted
# 3-letter sub-prefixes (e.g. "yoh") for any names that get squeezed out.
NAME_PREFIXES = [
    'ab', 'ac', 'ad', 'al', 'am', 'an', 'ar', 'au',
    'ba', 'be', 'bi', 'bl', 'bo', 'br', 'bu',
    'ca', 'ce', 'ch', 'ci', 'cl', 'co', 'cr', 'cu',
    'da', 'de', 'di', 'do', 'dr', 'du',
    'ed', 'el', 'em', 'en', 'er', 'es', 'ev',
    'fa', 'fe', 'fi', 'fl', 'fo', 'fr', 'fu',
    'ga', 'ge', 'gi', 'go', 'gr', 'gu',
    'ha', 'he', 'hi', 'ho', 'hu',
    'ia', 'ig', 'il', 'in', 'ir', 'is', 'iv',
    'ja', 'je', 'ji', 'jo', 'ju',
    'ka', 'ke', 'kh', 'ki', 'kl', 'ko', 'kr', 'ku', 'ky',
    'la', 'le', 'li', 'lo', 'lu', 'ly',
    'ma', 'me', 'mi', 'mo', 'mu',
    'na', 'ne', 'ni', 'no', 'nu',
    'ob', 'od', 'ol', 'om', 'or', 'os', 'ot', 'ow',
    'pa', 'pe', 'ph', 'pi', 'po', 'pr', 'pu',
    'qu',
    'ra', 're', 'ri', 'ro', 'ru', 'ry',
    'sa', 'sc', 'se', 'sh', 'si', 'sl', 'so', 'sp', 'st', 'su', 'sw',
    'ta', 'te', 'th', 'ti', 'to', 'tr', 'tu', 'ty',
    'ul', 'um', 'ur', 'us',
    'va', 've', 'vi', 'vo',
    'wa', 'we', 'wh', 'wi', 'wo', 'wr',
    'xa', 'xi',
    'ya', 'ye', 'yo', 'yoh', 'yu',
    'za', 'ze', 'zi', 'zo', 'zu',
]


def load_env():
    backend_url = None
    token = None
    if not os.path.exists(ENV_PATH):
        raise RuntimeError(f'.env not found at {ENV_PATH}')
    with open(ENV_PATH) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            key, _, value = line.partition('=')
            if key == 'BACKEND_URL':
                backend_url = value.rstrip('/')
            elif key == 'FRONTEND_TOKEN':
                token = value
    if not backend_url or not token:
        raise RuntimeError('BACKEND_URL and FRONTEND_TOKEN must be set in .env')
    return backend_url, token


def fetch_players(backend_url, token, prefix):
    url = f'{backend_url}/api/sorare/players?q={urllib.request.quote(prefix)}&limit=50'
    req = urllib.request.Request(url, headers={
        'X-Frontend-Token': token,
        'Accept': 'application/json'
    })
    try:
        with urllib.request.urlopen(req, timeout=15, context=SSL_CTX) as resp:
            data = json.loads(resp.read())
            return data.get('players', data if isinstance(data, list) else [])
    except Exception as e:
        print(f'  WARN: prefix "{prefix}" failed: {e}')
        return []


def _process_rows(rows, seen):
    """Add MLS players from API rows into the seen dict. Returns count of new."""
    count = 0
    for row in rows:
        slug = row.get('player_slug') or row.get('slug')
        if not slug or slug in seen:
            continue
        team = row.get('team_name') or row.get('team', '')
        if team not in MLS_TEAM_NAMES:
            continue
        seen[slug] = {
            'slug': slug,
            'name': row.get('player_display_name') or row.get('name', ''),
            'team': team,
            'position': row.get('positions', []),
            'pictureUrl': row.get('picture_url') or row.get('pictureUrl')
        }
        count += 1
    return count


RARITIES = ['limited', 'rare', 'super_rare', 'unique']


def fetch_latest_sale(backend_url, token, slug, rarity):
    """Fetch the single most recent sale for a player+rarity.
    Returns (season_year, occurred_at, team_name) or (0, '', '')."""
    url = (f'{backend_url}/api/sorare/token_prices'
           f'?player_slug={urllib.request.quote(slug)}&rarity={rarity}&limit=1')
    req = urllib.request.Request(url, headers={
        'X-Frontend-Token': token,
        'Accept': 'application/json'
    })
    try:
        with urllib.request.urlopen(req, timeout=15, context=SSL_CTX) as resp:
            data = json.loads(resp.read())
            rows = data.get('rows', [])
            if rows:
                return (
                    rows[0].get('season_year') or 0,
                    rows[0].get('occurred_at', ''),
                    rows[0].get('team_name', '')
                )
    except Exception:
        pass
    return 0, '', ''


def main():
    backend_url, token = load_env()
    print(f'Backend: {backend_url}')

    seen = {}

    # Phase 1: Name prefix sweep
    print(f'\n--- Phase 1: {len(NAME_PREFIXES)} name prefixes ---')
    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = {pool.submit(fetch_players, backend_url, token, pf): pf for pf in NAME_PREFIXES}
        for future in as_completed(futures):
            pf = futures[future]
            rows = future.result()
            count = _process_rows(rows, seen)
            if count > 0:
                print(f'  "{pf}": {len(rows)} results, {count} new MLS players')
    print(f'  → {len(seen)} players after name sweep')

    # Phase 2: Correct teams using most recent card year + sale date.
    # Priority: highest season_year first, then most recent occurred_at as tiebreaker.
    # A 2025 card's team always beats a 2024 card's team, regardless of sale recency.
    print(f'\n--- Phase 2: Correcting teams from most recent card year ({len(seen)} players × {len(RARITIES)} rarities) ---')
    slugs = list(seen.keys())
    # latest_sale[slug] = (season_year, occurred_at, team_name)
    latest_sale = {}

    tasks = [(slug, rarity) for slug in slugs for rarity in RARITIES]
    completed = 0

    with ThreadPoolExecutor(max_workers=20) as pool:
        futures = {
            pool.submit(fetch_latest_sale, backend_url, token, slug, rarity): (slug, rarity)
            for slug, rarity in tasks
        }
        for future in as_completed(futures):
            slug, rarity = futures[future]
            season_year, occurred_at, team = future.result()
            completed += 1
            if completed % 500 == 0:
                print(f'  {completed}/{len(tasks)} queries done...')
            if not team or not occurred_at:
                continue
            existing = latest_sale.get(slug)
            # Prefer higher season_year; use occurred_at as tiebreaker within same year
            if existing is None or (season_year, occurred_at) > (existing[0], existing[1]):
                latest_sale[slug] = (season_year, occurred_at, team)

    corrections = 0
    for slug, (season_year, occurred_at, sale_team) in latest_sale.items():
        if slug not in seen:
            continue
        if sale_team not in MLS_TEAM_NAMES:
            continue  # player moved out of MLS; keep last known MLS team
        if seen[slug]['team'] != sale_team:
            print(f'  corrected {seen[slug]["name"]}: {seen[slug]["team"]} → {sale_team} ({season_year} card, last sale {occurred_at[:10]})')
            seen[slug]['team'] = sale_team
            corrections += 1
    print(f'  → {corrections} team corrections')

    players = sorted(seen.values(), key=lambda p: p['name'])

    # Compact JSON (no unnecessary whitespace)
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(players, f, separators=(',', ':'))

    size_kb = os.path.getsize(OUTPUT_PATH) / 1024
    print(f'\nDone: {len(players)} MLS players → {OUTPUT_PATH} ({size_kb:.1f} KB)')


if __name__ == '__main__':
    main()
