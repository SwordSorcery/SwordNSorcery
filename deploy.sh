#!/bin/bash

echo "Deploying Sword and Sorcery..."

# Pull latest changes
echo "Pulling latest changes from repository..."
git pull

# Install dependencies
echo "Installing dependencies..."
npm run install:all

# Build client
echo "Building client..."
cd client && npm run build && cd ..

# Restart server (using PM2 process manager)
echo "Restarting server..."
cd server
if pm2 list | grep -q "sas-server"; then
  pm2 restart sas-server
else
  pm2 start src/index.js --name sas-server
fi
cd ..

echo "Deployment completed successfully!" 