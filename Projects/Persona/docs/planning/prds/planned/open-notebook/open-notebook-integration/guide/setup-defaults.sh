#!/bin/bash
# Configure OpenNotebook default models
# Run: chmod +x setup-defaults.sh && ./setup-defaults.sh

API_URL="http://localhost:5055"

echo "Configuring OpenNotebook default models..."
echo ""

# Check if Ollama is available
PROVIDERS=$(curl -s "$API_URL/api/models/providers" 2>/dev/null)
HAS_OLLAMA=$(echo $PROVIDERS | jq -r '.available | contains(["ollama"])' 2>/dev/null)
HAS_GOOGLE=$(echo $PROVIDERS | jq -r '.available | contains(["google"])' 2>/dev/null)
HAS_GROQ=$(echo $PROVIDERS | jq -r '.available | contains(["groq"])' 2>/dev/null)

# Determine best available models
CHAT_MODEL=""
EMBEDDING_MODEL=""

if [[ "$HAS_GOOGLE" == "true" ]]; then
    CHAT_MODEL="google/gemini-2.0-flash-exp"
    EMBEDDING_MODEL="google/text-embedding-004"
    echo "Using Google Gemini (cloud) as primary"
elif [[ "$HAS_OLLAMA" == "true" ]]; then
    CHAT_MODEL="ollama/llama3.2"
    EMBEDDING_MODEL="ollama/nomic-embed-text"
    echo "Using Ollama (local) as primary"
elif [[ "$HAS_GROQ" == "true" ]]; then
    CHAT_MODEL="groq/llama-3.3-70b-versatile"
    echo "Using Groq (cloud) as primary"
fi

if [[ -z "$CHAT_MODEL" ]]; then
    echo "Error: No model providers available"
    exit 1
fi

# Set defaults
echo ""
echo "Setting default models..."
echo "  Chat: $CHAT_MODEL"
echo "  Embedding: $EMBEDDING_MODEL"

curl -X PUT "$API_URL/api/models/defaults" \
  -H "Content-Type: application/json" \
  -d "{
    \"default_chat_model\": \"$CHAT_MODEL\",
    \"default_transformation_model\": \"$CHAT_MODEL\",
    \"large_context_model\": \"$CHAT_MODEL\",
    \"default_embedding_model\": \"$EMBEDDING_MODEL\"
  }" | jq

echo ""
echo "Done! Defaults configured."
echo ""
echo "Verify with: curl -s $API_URL/api/models/defaults | jq"
