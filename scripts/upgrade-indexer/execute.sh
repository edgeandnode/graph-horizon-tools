#!/bin/bash
# Executes approved reallocate actions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Execute Approved Actions ===${NC}"
echo ""

if graph indexer actions execute approved -o json; then
    echo ""
    echo -e "${GREEN}Execution complete${NC}"
else
    echo ""
    echo -e "${RED}Execution failed${NC}"
    exit 1
fi
