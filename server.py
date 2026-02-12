"""
Local dev server with API proxy.
Serves docs/ as static files and proxies /api/* to the Heroku backend,
avoiding CORS issues during local development.

Usage:  python3 server.py
Then open http://localhost:8000
"""

import http.server
import urllib.request
import ssl
import json
import os

# Skip SSL verification for local dev proxy (macOS Python often lacks certs)
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

PORT = 8000
DOCS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs')

BACKEND_URL = None
FRONTEND_TOKEN = None

def load_config():
    global BACKEND_URL, FRONTEND_TOKEN
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if not os.path.exists(env_path):
        print('[proxy] ERROR: .env file not found. Create one with:')
        print('  BACKEND_URL=https://your-heroku-app.herokuapp.com')
        print('  FRONTEND_TOKEN=your-token-here')
        return
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            key, _, value = line.partition('=')
            if key == 'BACKEND_URL':
                BACKEND_URL = value.rstrip('/')
            elif key == 'FRONTEND_TOKEN':
                FRONTEND_TOKEN = value
    print(f'[proxy] Backend: {BACKEND_URL}')
    print(f'[proxy] Token:   {FRONTEND_TOKEN[:8]}...' if FRONTEND_TOKEN else '[proxy] Token: NOT SET')


class DevHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DOCS_DIR, **kwargs)

    def do_GET(self):
        if self.path.startswith('/api/'):
            self.proxy_request()
        else:
            super().do_GET()

    def proxy_request(self):
        if not BACKEND_URL:
            self.send_error(502, 'Backend not configured — check docs/js/config.js')
            return

        target_url = BACKEND_URL + self.path
        headers = {
            'X-Frontend-Token': FRONTEND_TOKEN or '',
            'Accept': 'application/json',
        }

        try:
            req = urllib.request.Request(target_url, headers=headers, method='GET')
            with urllib.request.urlopen(req, timeout=15, context=SSL_CTX) as resp:
                body = resp.read()
                self.send_response(resp.status)
                self.send_header('Content-Type', resp.getheader('Content-Type', 'application/json'))
                self.send_header('Content-Length', len(body))
                self.end_headers()
                self.wfile.write(body)
        except urllib.error.HTTPError as e:
            body = e.read()
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', len(body))
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            msg = json.dumps({'error': str(e)}).encode()
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', len(msg))
            self.end_headers()
            self.wfile.write(msg)

    def log_message(self, format, *args):
        # Color API proxy requests differently
        path = args[0] if args else ''
        if '/api/' in str(path):
            print(f'[proxy] {args[0]}' if args else '')
        else:
            super().log_message(format, *args)


if __name__ == '__main__':
    load_config()
    print(f'[server] Serving docs/ at http://localhost:{PORT}')
    print(f'[server] /api/* requests proxied to {BACKEND_URL}')
    print()
    server = http.server.HTTPServer(('', PORT), DevHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n[server] Stopped.')
