#!/bin/bash
# Startup script for EC2 frontend - save this file on EC2 and run it

echo "Starting frontend..."
cd /home/ubuntu/var/www/thenilekart/TheNileKart/frontend

# Kill any existing serve process
pkill -f "serve -s build" || true

# Start serve
npx serve -s build -l 3000 &

echo "Frontend started on port 3000"
