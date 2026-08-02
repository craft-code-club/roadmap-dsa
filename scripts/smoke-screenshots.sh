#!/usr/bin/env bash
# Regenera as capturas do app (screenshots/) a partir do build estático.
# Requer: Node (build) + Python3 (servidor) + curl + `agent-browser` no PATH
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
  # Confere a rota antes de capturar: sem isso, um slug renomeado gera um print
  # da página 404 e o script termina "verde", escondendo o erro.
  local code
  # `|| true`: sem isso, o `set -e` mataria o script sem mensagem se o servidor
  # não subisse (curl sai 7), e o motivo real ficaria invisível.
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT$1" || true)
  if [ "$code" != "200" ]; then
    echo "✗ $1 respondeu ${code:-sem resposta} (slug renomeado ou servidor fora do ar?)"
    exit 1
  fi
  agent-browser open "http://localhost:$PORT$1" >/dev/null 2>&1
  agent-browser wait 900 >/dev/null 2>&1
  agent-browser screenshot "$OUT/$2" --full >/dev/null 2>&1
  echo "  ✓ $2"
}

echo "→ capturando"
shot "/"                                   01-home.png
shot "/introducao/"                        02-introducao.png
shot "/roadmap/"                           03-roadmap.png
shot "/topico/two-pointers/"               04-two-pointers.png
shot "/topico/sliding-window-fixed/"       05-sliding-window-fixed.png
shot "/topico/sliding-window-dynamic/"     06-sliding-window-dynamic.png
shot "/apoie/"                             07-apoie.png

echo "✓ pronto → $OUT/"
