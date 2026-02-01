# Slow Chat Requiring Page Refresh

**OpenNotebook Version**: v1-latest
**Component**: Chat UI / WebSocket / API
**Severity**: Medium (poor user experience)
**Related Issues**: [context-length-exceeded](../context-length-exceeded/), [model-not-language-model-none](../model-not-language-model-none/)

---

## Symptom

After sending a chat message, the response takes an extremely long time (minutes) and the UI doesn't update. The user must manually refresh the page to see if a response was generated.

## Signs Presented

1. **Message sent but UI shows no response**: The input is cleared but no AI response appears

2. **Spinner or loading state persists** indefinitely

3. **Manual page refresh reveals response**: After refreshing, the AI response may appear in the chat history

4. **Multiple duplicate messages in history**: Repeated attempts create multiple copies of the same question

5. **Response quality is poor when it finally appears**: Generic or unhelpful responses despite the wait

## Root Cause

This is typically a **compound issue** with multiple contributing factors:

### Primary Cause: Context Length Exceeded
See [context-length-exceeded](../context-length-exceeded/) for details. When the LLM context window is exceeded:
- Request takes extremely long to process (or times out)
- UI streaming may fail silently
- Response quality degrades significantly

### Secondary Cause: Model Resolution Failure
See [model-not-language-model-none](../model-not-language-model-none/) for details. When `model_override: null`:
- Request fails at the API level
- UI may not properly display the error
- User sees hanging state instead of error message

### Tertiary Cause: UI/API Timeout Mismatch
The UI may have different timeout settings than the API:
- API timeout: 120 seconds (`ESPERANTO_LLM_TIMEOUT`)
- UI WebSocket/fetch timeout: may differ
- Result: UI gives up before API responds

## How We Found the Solution

1. User reported: "Chat takes too long, have to refresh to see results"

2. Performed web search for "OpenNotebook slow chat refresh required"

3. Found GitHub Issue #345 describing context length problems

4. Checked container logs for timeout/error messages:
   ```bash
   docker logs open-notebook-open_notebook-1 --tail 100 | grep -iE "(error|timeout|failed)"
   ```

5. Identified multiple contributing factors:
   - Large document (116K tokens) vs small context window (4K tokens)
   - Chat sessions with `model_override: null`

6. Addressed each factor systematically

## Solution

### Step 1: Switch to Large-Context Model

```bash
# Configure Gemini API key in docker.env
GOOGLE_API_KEY=your_actual_key

# Recreate containers to load new config
docker compose -f docker-compose.full.yml down
docker compose -f docker-compose.full.yml up -d

# Verify Google provider available
curl -s http://localhost:5055/api/models/providers | jq '.available'
```

### Step 2: Set Model Override on Chat Sessions

```bash
# Get Gemini model ID
curl -s http://localhost:5055/api/models | jq '.[] | select(.name=="gemini-2.0-flash")'

# Update chat session
curl -X PUT "http://localhost:5055/api/chat/sessions/{session_id}" \
  -H "Content-Type: application/json" \
  -d '{"model_override": "model:xxxxxxxx"}'
```

### Step 3: Verify Fix with API Test

```bash
# Direct API test (bypasses UI issues)
curl -s -X POST "http://localhost:5055/api/chat/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "{session_id}",
    "message": "What is this book about?",
    "context": {"sources": ["{source_id}"], "notes": []}
  }' --max-time 60 | jq
```

If the API returns a proper response quickly, the fix is working.

### Step 4: Test in UI

1. Refresh the page
2. Navigate to the chat session
3. Send a test message
4. Response should appear within seconds (not minutes)

## Caveats

1. **Multiple issues compound**: This symptom often has multiple causes. Address all of them:
   - Context length (use large-context model)
   - Model resolution (set model_override)
   - Source embedding (verify chunks > 0)

2. **API works but UI doesn't**: If API calls succeed but UI still fails, the issue may be:
   - Browser caching old session data
   - WebSocket connection issues
   - UI-specific bugs

3. **New sessions need configuration**: Each new chat session may need model_override set manually

4. **Source ID changes break sessions**: If you re-uploaded a source, the session may reference an old source ID that no longer exists

5. **Check all layers**:
   ```bash
   # API health
   curl http://localhost:5055/health

   # Provider status
   curl http://localhost:5055/api/models/providers | jq

   # Session config
   curl "http://localhost:5055/api/chat/sessions?notebook_id={id}" | jq

   # Source status
   curl http://localhost:5055/api/sources | jq '.[] | {id, embedded_chunks}'
   ```

## Prevention

- Configure large-context models (Gemini, Groq) from the start
- Always set `model_override` when creating chat sessions
- Verify source embedding completed with non-zero chunks
- Test with API before relying on UI
- Monitor container logs for errors during chat requests

## Diagnostic Checklist

When encountering slow/hanging chat:

- [ ] Is the model set? Check `model_override` on session
- [ ] Is the provider available? Check `/api/models/providers`
- [ ] Does the source have embedded chunks? Check `embedded_chunks > 0`
- [ ] Is the context length appropriate? Large docs need large-context models
- [ ] Does direct API call work? Test with curl before blaming UI
- [ ] Are there errors in logs? Check `docker logs`
