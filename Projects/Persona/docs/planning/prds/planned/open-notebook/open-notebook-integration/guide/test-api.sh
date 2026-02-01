#!/bin/bash
# OpenNotebook API Test Script
# Run: chmod +x test-api.sh && ./test-api.sh

API_URL="http://localhost:5055"
OLLAMA_URL="http://localhost:11434"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=============================================="
echo "  OpenNotebook API Test Suite"
echo "=============================================="
echo ""

# Function to check result
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}PASS${NC}"
    else
        echo -e "${RED}FAIL${NC}"
    fi
}

# 1. Health Check
echo -n "1. API Health Check............... "
HEALTH=$(curl -s "$API_URL/health" 2>/dev/null)
if [[ "$HEALTH" == *"healthy"* ]]; then
    echo -e "${GREEN}PASS${NC} - $HEALTH"
else
    echo -e "${RED}FAIL${NC} - API not responding"
    echo "   Make sure services are running:"
    echo "   docker compose -f docker-compose.full.yml up -d"
    exit 1
fi

# 2. Ollama Check
echo -n "2. Ollama Connection.............. "
OLLAMA=$(curl -s "$OLLAMA_URL/api/tags" 2>/dev/null)
if [[ "$OLLAMA" == *"models"* ]]; then
    MODELS=$(echo $OLLAMA | jq -r '.models[].name' 2>/dev/null | tr '\n' ', ')
    echo -e "${GREEN}PASS${NC} - Models: ${MODELS%,}"
else
    echo -e "${YELLOW}WARN${NC} - Ollama not running (optional)"
fi

# 3. Available Providers
echo -n "3. Model Providers................ "
PROVIDERS=$(curl -s "$API_URL/api/models/providers" 2>/dev/null)
if [[ "$PROVIDERS" == *"available"* ]]; then
    AVAIL=$(echo $PROVIDERS | jq -r '.available | join(", ")' 2>/dev/null)
    echo -e "${GREEN}PASS${NC} - Available: $AVAIL"
else
    echo -e "${RED}FAIL${NC}"
fi

# 4. Default Models
echo -n "4. Default Models Config.......... "
DEFAULTS=$(curl -s "$API_URL/api/models/defaults" 2>/dev/null)
CHAT_MODEL=$(echo $DEFAULTS | jq -r '.default_chat_model // "not set"' 2>/dev/null)
if [[ "$CHAT_MODEL" == "not set" ]] || [[ "$CHAT_MODEL" == "" ]] || [[ "$CHAT_MODEL" == "null" ]]; then
    echo -e "${YELLOW}WARN${NC} - No default chat model configured"
else
    echo -e "${GREEN}PASS${NC} - Chat: $CHAT_MODEL"
fi

# 5. Database (via notebooks endpoint)
echo -n "5. Database Connection............ "
NOTEBOOKS=$(curl -s "$API_URL/api/notebooks" 2>/dev/null)
if [[ "$NOTEBOOKS" == "["* ]]; then
    COUNT=$(echo $NOTEBOOKS | jq 'length' 2>/dev/null)
    echo -e "${GREEN}PASS${NC} - $COUNT notebooks"
else
    echo -e "${RED}FAIL${NC} - Database error"
fi

# 6. Settings
echo -n "6. Settings Endpoint.............. "
SETTINGS=$(curl -s "$API_URL/api/settings" 2>/dev/null)
if [[ "$SETTINGS" == *"default_content_processing"* ]]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
fi

# 7. Sources
echo -n "7. Sources Endpoint............... "
SOURCES=$(curl -s "$API_URL/api/sources" 2>/dev/null)
if [[ "$SOURCES" == "["* ]]; then
    COUNT=$(echo $SOURCES | jq 'length' 2>/dev/null)
    echo -e "${GREEN}PASS${NC} - $COUNT sources"
else
    echo -e "${RED}FAIL${NC}"
fi

# 8. Web UI
echo -n "8. Web UI (port 8502)............. "
WEB=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8502" 2>/dev/null)
if [[ "$WEB" == "200" ]]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${YELLOW}WARN${NC} - HTTP $WEB"
fi

# 9. API Docs
echo -n "9. API Documentation.............. "
DOCS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/docs" 2>/dev/null)
if [[ "$DOCS" == "200" ]]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
fi

# 10. Docker Containers
echo ""
echo "10. Docker Container Status:"
docker ps --filter "name=open-notebook" --format "    {{.Names}}: {{.Status}}" 2>/dev/null

echo ""
echo "=============================================="
echo "  Test Summary"
echo "=============================================="
echo ""
echo "Web UI:    http://localhost:8502"
echo "API:       http://localhost:5055"
echo "API Docs:  http://localhost:5055/docs"
echo "Ollama:    http://localhost:11434"
echo ""
echo "Next steps:"
echo "  - Open http://localhost:8502 in browser"
echo "  - Create a notebook and add sources"
echo "  - Configure default models in Settings"
echo ""
