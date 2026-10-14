# 開発用サーバー：ブラウザにキャッシュさせない（編集したファイルが再読み込みだけで反映される）
#   python3 serve.py        → http://localhost:8765/
#   python3 serve.py 9000   → ポートを変える
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
handler = partial(NoCacheHandler, directory=str(Path(__file__).resolve().parent))
print(f'http://localhost:{port}/')
ThreadingHTTPServer(('', port), handler).serve_forever()
