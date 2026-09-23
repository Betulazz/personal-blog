#!/usr/bin/env bash
# Install a certificate deployed by the Aliyun Cloud Assistant certificate
# service (or copied manually) and reload Nginx.
#
# Expected inputs:
#   docker/certs/deploy/cert.pem     server certificate (leaf)
#   docker/certs/deploy/privkey.pem  private key
#   docker/certs/deploy/chain.cer    intermediate chain (optional)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="$ROOT_DIR/docker/certs/deploy"
CERT_DIR="$ROOT_DIR/docker/certs"

CERT="$DEPLOY_DIR/cert.pem"
KEY="$DEPLOY_DIR/privkey.pem"
CHAIN="$DEPLOY_DIR/chain.cer"

for file in "$CERT" "$KEY"; do
  if [[ ! -s "$file" ]]; then
    echo "Missing or empty certificate input: $file" >&2
    exit 1
  fi
done

cat "$CERT" > "$CERT_DIR/fullchain.pem"
if [[ -s "$CHAIN" ]]; then
  printf '\n' >> "$CERT_DIR/fullchain.pem"
  cat "$CHAIN" >> "$CERT_DIR/fullchain.pem"
fi
install -m 600 "$KEY" "$CERT_DIR/privkey.pem"
chmod 644 "$CERT_DIR/fullchain.pem"
chmod 700 "$DEPLOY_DIR"
chmod 600 "$KEY"

echo "Installed certificate:"
openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -subject -issuer -enddate -ext subjectAltName

cd "$ROOT_DIR"
docker compose exec -T nginx nginx -s reload
echo "Nginx reloaded"
