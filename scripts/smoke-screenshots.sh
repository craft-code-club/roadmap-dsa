#!/usr/bin/env bash
# Regenera as capturas do app (screenshots/) a partir do build estático.
# Requer: Node (build) + Python3 (servidor) + `agent-browser` no PATH
# (Vercel Labs: https://github.com/vercel-labs/agent-browser).
#
#   npm run screenshots
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-4321}"
OUT="screenshots"

if ! command -v agent-browser >/dev/null 2>&1; then
  echo "✗ agent-browser não encontrado no PATH. Instale: https://github.com/vercel-labs/agent-browser"
  exit 1
fi

echo "→ build (SSG)"
npm run build >/dev/null

echo "→ servindo ./out em http://localhost:$PORT"
python3 -m http.server "$PORT" --directory out >/dev/null 2>&1 &
SRV=$!
trap 'kill "$SRV" 2>/dev/null || true; agent-browser close --all >/dev/null 2>&1 || true' EXIT
sleep 1
mkdir -p "$OUT"

shot() { # <rota> <arquivo>
  agent-browser open "http://localhost:$PORT$1" >/dev/null 2>&1
  agent-browser wait 900 >/dev/null 2>&1
  agent-browser screenshot "$OUT/$2" --full >/dev/null 2>&1
  echo "  ✓ $2"
}

echo "→ capturando"
shot "/"                                  01-home.png
shot "/roadmap/"                          02-roadmap.png
shot "/topico/dois-ponteiros/"            03-dois-ponteiros.png
shot "/topico/janela-deslizante-fixa/"    04-janela-fixa.png
shot "/topico/janela-deslizante-dinamica/" 05-janela-dinamica.png

echo "✓ pronto → $OUT/"
