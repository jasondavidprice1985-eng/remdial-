#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CERT_DIR="$ROOT/certs"
KEY="$CERT_DIR/dev-key.pem"
CERT="$CERT_DIR/dev-cert.pem"
EXTRA_IP="${1:-}"

mkdir -p "$CERT_DIR"

SAN="DNS:localhost,DNS:remedial.local,IP:127.0.0.1"
if [[ -n "$EXTRA_IP" ]]; then
  SAN="$SAN,IP:$EXTRA_IP"
fi

openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout "$KEY" -out "$CERT" -days 825 \
  -subj "/CN=localhost" \
  -addext "subjectAltName=$SAN"

echo "Wrote $KEY and $CERT"
echo "Restart Vite dev servers, then open https://localhost:<port>"
if [[ -n "$EXTRA_IP" ]]; then
  echo "LAN: https://$EXTRA_IP:<port> (trust this cert on test devices)"
fi
