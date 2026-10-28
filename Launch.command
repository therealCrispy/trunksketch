#!/bin/zsh
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then
  node server.cjs
elif command -v python3 >/dev/null 2>&1; then
  open http://127.0.0.1:8765
  python3 -m http.server 8765 --bind 127.0.0.1
else
  echo 'Install Node.js (free) from https://nodejs.org, then run this launcher again.'
  read 'reply?Press Enter to close.'
fi
