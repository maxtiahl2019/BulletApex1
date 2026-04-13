#!/bin/bash
cd "$(dirname "$0")"
echo "🚀 Deploying BulletApex (Fresh Build - Cache Cleared)..."

# Remove Vercel cache to force fresh deployment
rm -rf .vercel/output
rm -rf .next
rm -rf node_modules/.cache

# Deploy with production flag
npx vercel deploy --prod --force

echo "✅ Fresh deployment complete!"
echo "⏳ Waiting for CDN cache to clear (30 seconds)..."
sleep 30
echo "🌐 Your site is now live at: https://bulletapex.com"
