#!/usr/bin/env bash
# Builds and deploys to /var/www/antseedmarkets, the world-readable
# directory nginx's antseedmarkets-com site serves from. /root stays 700
# (no www-data traversal) -- see README.md's Architecture section for why
# this repo doesn't run its own backend/Node process the way antseed-zh
# does (whose Express process runs as root and can read /root directly).
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
mkdir -p /var/www/antseedmarkets
rsync -a --delete dist/ /var/www/antseedmarkets/
# Root's umask makes rsync write these 600/700 by default, which nginx
# (runs as www-data) can't read -- silently 500s the whole site via an
# internal-redirect loop to an unreadable index.html. Bit us for real on
# 2026-09-24 (the first redeploy after this script was written forgot this
# line). Never skip it.
chmod -R a+rX /var/www/antseedmarkets
echo "Deployed to /var/www/antseedmarkets -- live immediately, no nginx reload needed."
