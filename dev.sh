#!/bin/bash
export PATH="/usr/local/bin:$PATH"
cd "$(dirname "$0")"
rm -rf .next
exec node node_modules/.bin/next dev --port 3000
