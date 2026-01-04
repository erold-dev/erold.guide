#!/bin/bash

TOKEN=$(cat ~/Library/Preferences/.wrangler/config/default.toml | grep oauth_token | sed 's/oauth_token = "//' | sed 's/"$//')
ZONE_ID="fa06878681ba6f51bec876df6418c299"

echo "=== Adding CNAME for erold.guide → erold-website.pages.dev ==="
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "@",
    "content": "erold-website.pages.dev",
    "ttl": 1,
    "proxied": true
  }' | python3 -m json.tool

echo ""
echo "=== Adding CNAME for api.erold.guide → pub-f0a7090f2ec34cb1a84aca4375cb1a96.r2.dev ==="
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "api",
    "content": "pub-f0a7090f2ec34cb1a84aca4375cb1a96.r2.dev",
    "ttl": 1,
    "proxied": true
  }' | python3 -m json.tool

echo ""
echo "=== Current DNS Records ==="
curl -s "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; [print(f\"{r['type']:6} {r['name']:30} → {r['content']}\") for r in json.load(sys.stdin)['result']]"
