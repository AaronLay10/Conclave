#!/usr/bin/env bash
set -euo pipefail

printf 'Unpacking KingdomOS source for Vercel build...\n'
cat source.part.* > /tmp/kingdomos-source.tar.gz.b64
base64 --decode /tmp/kingdomos-source.tar.gz.b64 > /tmp/kingdomos-source.tar.gz
tar -xzf /tmp/kingdomos-source.tar.gz -C .

printf 'Installing application dependencies...\n'
npm install --no-audit --no-fund
