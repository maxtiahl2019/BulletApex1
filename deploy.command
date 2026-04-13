#!/bin/bash
cd "$(dirname "$0")"
echo "🚀 Deploying BulletApex to Vercel..."
rm -rf .vercel
npx vercel link --yes --project bulletapex
npx vercel --prod --yes
echo "✅ Done!"
