#!/bin/bash

TOKEN=$(cat ~/Library/Preferences/.wrangler/config/default.toml | grep oauth_token | sed 's/oauth_token = "//' | sed 's/"$//')
ACCOUNT_ID="9188fe46532260dee6b94f642ff0e790"

echo "=== Getting Zone ID for erold.guide ==="
ZONE_RESPONSE=$(curl -s "https://api.cloudflare.com/client/v4/zones?name=erold.guide" \
  -H "Authorization: Bearer $TOKEN")
echo "$ZONE_RESPONSE" | python3 -m json.tool | head -20

ZONE_ID=$(echo "$ZONE_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['result'][0]['id'])" 2>/dev/null)
echo "Zone ID: $ZONE_ID"

echo ""
echo "=== Adding erold.guide to Pages project ==="
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/erold-website/domains" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"name":"erold.guide"}' | python3 -m json.tool

echo ""
echo "=== Adding api.erold.guide to R2 bucket ==="
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/r2/buckets/erold-guidelines-api/custom_domains" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data "{\"domain\":\"api.erold.guide\",\"zoneId\":\"$ZONE_ID\"}" | python3 -m json.tool
