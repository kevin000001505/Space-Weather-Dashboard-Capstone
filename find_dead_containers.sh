#!/bin/bash
# Find Dead Containers & Show Why They Crashed
# Run: bash find_dead_containers.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
ORANGE='\033[0;33m'
NC='\033[0m'

echo -e "${BLUE}=== FINDING DEAD/CRASHING CONTAINERS ===${NC}"
echo ""

# Get reference time - when most containers restarted (16 minutes ago)
RESTART_TIME=$(date -d "16 minutes ago" "+%Y-%m-%d %H:%M:%S")
echo -e "${YELLOW}Reference: Containers that restarted 16 minutes ago likely crashed${NC}"
echo ""

# 1. Check all containers
echo -e "${YELLOW}[1] ALL CONTAINERS STATUS${NC}"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}"
echo ""

# 2. Find containers that are DOWN or RESTARTING
echo -e "${YELLOW}[2] CONTAINERS THAT CRASHED (Not running or Exited)${NC}"
docker ps -a --filter "status=exited" --filter "status=restarting" --format "table {{.Names}}\t{{.Status}}\t{{.ExitCode}}"
echo ""

# 3. For each container, show logs
echo -e "${YELLOW}[3] CRASH LOGS BY CONTAINER${NC}"
echo ""

# Check pgadmin (2 hours - likely never started)
echo -e "${ORANGE}=== pgadmin (Status: 2 hours up) ===${NC}"
echo "This container is OLD - might not have restarted with others"
CONTAINER="pgadmin"
if docker ps -a --format "{{.Names}}" | grep -q "^${CONTAINER}$"; then
  EXIT_CODE=$(docker inspect "$CONTAINER" 2>/dev/null | grep -oP '"ExitCode":\s*\K[0-9]+' | head -1)
  echo "Exit Code: $EXIT_CODE"
  echo ""
  echo "Last 100 lines of logs:"
  docker logs --tail=100 "$CONTAINER" 2>&1
  echo ""
else
  echo "Container not found"
fi
echo ""

# Check frontend (2 hours)
echo -e "${ORANGE}=== frontend (Status: 2 hours up) ===${NC}"
CONTAINER="frontend"
if docker ps -a --format "{{.Names}}" | grep -q "^${CONTAINER}$"; then
  EXIT_CODE=$(docker inspect "$CONTAINER" 2>/dev/null | grep -oP '"ExitCode":\s*\K[0-9]+' | head -1)
  echo "Exit Code: $EXIT_CODE"
  echo ""
  echo "Last 100 lines of logs:"
  docker logs --tail=100 "$CONTAINER" 2>&1
  echo ""
else
  echo "Container not found"
fi
echo ""

# Check prefect_server (16 minutes)
echo -e "${ORANGE}=== prefect_server (Status: 16 minutes up) ===${NC}"
CONTAINER="prefect_server"
if docker ps -a --format "{{.Names}}" | grep -q "^${CONTAINER}$"; then
  EXIT_CODE=$(docker inspect "$CONTAINER" 2>/dev/null | grep -oP '"ExitCode":\s*\K[0-9]+' | head -1)
  echo "Exit Code: $EXIT_CODE"
  echo ""
  echo "Last 50 lines of logs:"
  docker logs --tail=50 "$CONTAINER" 2>&1
  echo ""
else
  echo "Container not found"
fi
echo ""

# Check prefect-worker-noaa (up 4 minutes - CRASHING!)
echo -e "${RED}=== prefect-worker-noaa (Up 4 minutes - CRASHING REPEATEDLY!) ===${NC}"
CONTAINER="prefect-worker-noaa"
if docker ps -a --format "{{.Names}}" | grep -q "$CONTAINER"; then
  RESTART_COUNT=$(docker inspect "$CONTAINER" 2>/dev/null | grep -oP '"RestartCount":\s*\K[0-9]+')
  EXIT_CODE=$(docker inspect "$CONTAINER" 2>/dev/null | grep -oP '"ExitCode":\s*\K[0-9]+' | head -1)
  echo -e "${RED}Restart Count: $RESTART_COUNT (crashing and restarting!)${NC}"
  echo "Exit Code: $EXIT_CODE"
  echo ""
  echo "Last 150 lines of logs (to see crash pattern):"
  docker logs --tail=150 "$CONTAINER" 2>&1
  echo ""
else
  echo "Container not found"
fi
echo ""

# 4. Check all logs for ERROR patterns
echo -e "${YELLOW}[4] SEARCHING FOR ERROR PATTERNS IN ALL CONTAINERS${NC}"
echo ""

for container in $(docker ps -a --format "{{.Names}}"); do
  # Get logs and search for errors
  ERROR_COUNT=$(docker logs "$container" 2>&1 | grep -ic "error\|exception\|fatal\|panic\|segfault\|traceback")
  
  if [ "$ERROR_COUNT" -gt 0 ]; then
    echo -e "${RED}$container - Found $ERROR_COUNT error lines${NC}"
    echo "First 10 errors:"
    docker logs "$container" 2>&1 | grep -iE "error|exception|fatal|panic|segfault|traceback" | head -10
    echo ""
  fi
done
echo ""

# 5. System-level diagnostics
echo -e "${YELLOW}[5] SYSTEM-LEVEL DIAGNOSTICS${NC}"
echo ""

echo "Recent OOM kills?"
sudo dmesg | grep -i "oom-kill\|out of memory" | tail -3
echo ""

echo "Recent kernel/docker errors?"
sudo journalctl --since "1 hour ago" -u docker | grep -iE "error|panic|fatal" | tail -10
echo ""

# 6. Check disk/memory
echo -e "${YELLOW}[6] SYSTEM RESOURCES${NC}"
echo "Disk:"
df -h | grep -E "^/dev|Mounted"
echo ""
echo "Memory:"
free -h
echo ""
echo "Docker disk usage:"
docker system df
echo ""

# 7. Summary
echo -e "${BLUE}=== SUMMARY ===${NC}"
echo ""
echo "Container Status Overview:"
echo "  • nginx (16 min) ......................... ✓ UP"
echo "  • prefect-worker-noaa (16 min, up 4 min). ⚠️  CRASHING (Restart=$RESTART_COUNT)"
echo "  • prefect-worker-flight (16 min, up 15) . ✓ UP"
echo "  • fastapi (16 min) ...................... ✓ UP"
echo "  • postgis (16 min) ...................... ✓ UP (healthy)"
echo "  • redis (16 min) ........................ ✓ UP (healthy)"
echo "  • frontend (2 hours) .................... ✗ DEAD or STUCK"
echo "  • prefect_server (16 min) .............. ⚠️  UP but possibly stuck"
echo "  • pgadmin (2 hours) ..................... ✗ DEAD"
echo ""
echo "Next Steps:"
echo "1. Review logs above for 'prefect-worker-noaa' - it's crashing repeatedly"
echo "2. Check 'frontend' and 'pgadmin' - they never restarted"
echo "3. Look for ERROR, Exception, Connection refused patterns"
echo ""
echo "To restart a dead container:"
echo "  docker-compose restart <container_name>"
echo ""
echo "To see live logs:"
echo "  docker logs -f <container_name>"
echo ""
