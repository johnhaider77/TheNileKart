# EC2 Recovery & Deployment Plan

## Current Status
- Frontend built successfully locally ✅
- Build artifacts ready at: `/Users/johnhaider/YAM/JnM❤️/CodeRepos/thenilekart/TheNileKart/frontend/build`
- EC2 instance crashed due to OOM (out of memory) - t3.micro has only ~1GB RAM

## What Happened
- Node.js frontend build + npm processes consumed too much memory
- System killed processes: `Out of memory: Killed process 30422 (node)`
- EC2 instance now unreachable (SSH timeout)

## Recovery Steps (Once EC2 is back online)

### 1. Restart EC2 Instance
- Wait for auto-recovery or manually restart from AWS Console
- Once online, verify SSH connection:
  ```bash
  ssh -i ~/.ssh/thenilekart-key2.pem ubuntu@40.172.190.250 "echo 'EC2 is up'"
  ```

### 2. Clean Up Memory
```bash
ssh -i ~/.ssh/thenilekart-key2.pem ubuntu@40.172.190.250 << 'EOF'
pkill -9 node 2>/dev/null || true
pkill -9 npm 2>/dev/null || true
pkill -9 npm-start 2>/dev/null || true
rm -rf /tmp/* 2>/dev/null || true
free -h
EOF
```

### 3. Sync Built Frontend to EC2
```bash
rsync -avz -e "ssh -i ~/.ssh/thenilekart-key2.pem" \
  /Users/johnhaider/YAM/JnM❤️/CodeRepos/thenilekart/TheNileKart/frontend/build/ \
  ubuntu@40.172.190.250:/home/ubuntu/var/www/thenilekart/TheNileKart/frontend/
```

### 4. Start Backend (Memory-light)
```bash
ssh -i ~/.ssh/thenilekart-key2.pem ubuntu@40.172.190.250 << 'EOF'
cd /home/ubuntu/var/www/thenilekart/TheNileKart/backend
NODE_ENV=production nohup node server.js > /tmp/backend.log 2>&1 &
sleep 3
echo "Backend started"
EOF
```

### 5. Start Frontend (Serve Pre-built)
Instead of `npm start`, serve the pre-built files:
```bash
ssh -i ~/.ssh/thenilekart-key2.pem ubuntu@40.172.190.250 << 'EOF'
cd /home/ubuntu/var/www/thenilekart/TheNileKart/frontend
npm install -g serve 2>/dev/null || true
nohup serve -s build -l 3000 > /tmp/frontend.log 2>&1 &
sleep 3
echo "Frontend started"
EOF
```

### 6. Verify Services
```bash
ssh -i ~/.ssh/thenilekart-key2.pem ubuntu@40.172.190.250 << 'EOF'
echo "Running processes:"
ps aux | grep -E 'node|serve|npm' | grep -v grep
echo ""
echo "Memory usage:"
free -h
EOF
```

## Why This Approach Works
- **Serve pre-built**: `serve -s build` is much lighter than `npm start`
- **No build on EC2**: Build is done on Mac with 8GB+ RAM
- **Memory-efficient**: t3.micro stays responsive
- **Production-ready**: Pre-built files are optimized

## Alternative: Upgrade EC2 Instance
If sustained performance issues: upgrade to t3.small or t3.medium (costs ~$10-15/month more)

## Git Commit Status
✅ All code changes committed and pushed to main branch

---
**Last Updated**: 22 January 2026
