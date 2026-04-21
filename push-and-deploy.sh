#!/bin/bash

echo "🚀 Pushing updates to GitHub and deploying to Vercel..."

# Configure git if needed
git config user.email "contact@win-winsolution.com"
git config user.name "Max Tiahyi"

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push -u origin main

# Wait a moment for GitHub to sync
sleep 3

# Deploy with Vercel
echo "🔄 Triggering Vercel deployment..."
npx vercel deploy --prod --force

echo "✅ Deployment triggered!"
echo "🌐 Your site will be updated at: https://bulletapex.com"
