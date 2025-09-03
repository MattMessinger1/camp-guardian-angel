#!/bin/bash
echo "🔄 Pulling latest changes from Lovable..."
git pull origin main

echo "🔄 Restarting Supabase functions..."
npx supabase functions serve --env-file .env.local
