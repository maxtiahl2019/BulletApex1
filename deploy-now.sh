#!/bin/bash
cd "$(dirname "$0")"
echo "🚀 Deploying BulletApex to Vercel..."

# Use vercel CLI with authentication
# Make sure you're logged in: npx vercel login

npx vercel deploy --prod

echo "✅ Deployment complete!"
echo "🌐 Your site will be live at: https://bulletapex.com"
