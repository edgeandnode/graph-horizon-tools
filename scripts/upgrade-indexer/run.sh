#!/bin/bash
# Run migration workflow N times with comparison

set -e

# Configuration
BATCH_SIZE="${BATCH_SIZE:-10}"
RUNS="${RUNS:-1}"
POD="${POD:-shell-0}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${YELLOW}=== Migration Runner ===${NC}"
echo "Batch size: $BATCH_SIZE"
echo "Runs: $RUNS"
echo "Pod: $POD"
echo ""

TOTAL_START=$SECONDS

for ((i=1; i<=RUNS; i++)); do
    echo ""
    echo -e "${YELLOW}################################################################${NC}"
    echo -e "${YELLOW}###                      Run $i / $RUNS                         ###${NC}"
    echo -e "${YELLOW}################################################################${NC}"
    echo ""
    RUN_START=$SECONDS

    # Run migration
    kubectl exec -ti "$POD" -- env BATCH_SIZE="$BATCH_SIZE" bash -s < "$SCRIPT_DIR/migrate.sh"

    # Fetch current state and compare
    kubectl exec -ti "$POD" -- bash -s < "$SCRIPT_DIR/fetch.sh"
    kubectl cp "$POD":/allocations.json "$SCRIPT_DIR/allos-snapshot-current.json"
    "$SCRIPT_DIR/compare.sh"

    echo ""
    echo -e "Run $i completed in $((SECONDS - RUN_START))s"
    echo ""
done

echo -e "${GREEN}=== All runs completed in $((SECONDS - TOTAL_START))s ===${NC}"
