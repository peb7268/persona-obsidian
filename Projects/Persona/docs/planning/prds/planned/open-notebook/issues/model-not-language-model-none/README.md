# Model is not a LanguageModel: None

**OpenNotebook Version**: v1-latest
**Component**: Chat API / Model Resolution
**Severity**: High (blocks chat functionality)

---

## Symptom

When sending a chat message through the UI, the request fails with a 500 Internal Server Error. The chat appears to hang or returns an error immediately.

## Signs Presented

1. **API returns 500 error** with specific message:
   ```json
   {"detail": "Error executing chat: Model is not a LanguageModel: None"}
   ```

2. **Container logs show the error**:
   ```
   ERROR | api.routers.chat:execute_chat:384 - Error executing chat: Model is not a LanguageModel: None
   ```

3. **Direct API calls may work** while UI calls fail (depending on how the request is constructed)

4. **Chat session has `model_override: null`**:
   ```bash
   curl -s "http://localhost:5055/api/chat/sessions?notebook_id={notebook_id}" | jq
   # Shows: "model_override": null
   ```

## Root Cause

**Chat sessions created with `model_override: null` fail to resolve the default model.**

When a chat session is created, it can have a `model_override` field:
- If set to a valid model ID → uses that model
- If set to `null` → should fall back to `default_chat_model`

However, there appears to be a bug where sessions with `model_override: null` don't properly resolve the default model, resulting in `None` being passed to the chat executor.

### The Resolution Chain

```
Chat Request → Session model_override (null) → Default model lookup → None → Error
```

## How We Found the Solution

1. Chat worked via direct API calls but failed in UI

2. Checked container logs and found the specific error:
   ```bash
   docker logs open-notebook-open_notebook-1 --tail 50 | grep -i error
   ```

3. Compared API calls: our curl requests included proper context, UI requests resulted in None

4. Examined chat session configurations:
   ```bash
   curl -s "http://localhost:5055/api/chat/sessions?notebook_id={notebook_id}" | jq
   ```

5. Found sessions with `model_override: null` were failing

6. Tested setting `model_override` explicitly on the session → chat worked

## Solution

### Fix Existing Sessions

Set the `model_override` explicitly on each chat session:

```bash
# Get the Gemini model ID
MODEL_ID=$(curl -s http://localhost:5055/api/models | jq -r '.[] | select(.name=="gemini-2.0-flash") | .id')

# Update each session
curl -X PUT "http://localhost:5055/api/chat/sessions/{session_id}" \
  -H "Content-Type: application/json" \
  -d "{\"model_override\": \"$MODEL_ID\"}"
```

### Bulk Update All Sessions for a Notebook

```bash
NOTEBOOK_ID="notebook:your_notebook_id"
MODEL_ID="model:your_model_id"

# Get all sessions and update each
curl -s "http://localhost:5055/api/chat/sessions?notebook_id=$NOTEBOOK_ID" | \
  jq -r '.[].id' | \
  while read session_id; do
    curl -s -X PUT "http://localhost:5055/api/chat/sessions/$session_id" \
      -H "Content-Type: application/json" \
      -d "{\"model_override\": \"$MODEL_ID\"}"
    echo "Updated: $session_id"
  done
```

### Verify the Fix

```bash
# Check session now has model_override set
curl -s "http://localhost:5055/api/chat/sessions?notebook_id={notebook_id}" | jq '.[].model_override'
# Should show: "model:xxxxx" instead of null
```

## Caveats

1. **New sessions inherit the problem**: Each new chat session created in the UI will have `model_override: null`. You may need to update new sessions after creation.

2. **Model ID must be valid**: The `model_override` must reference an existing model ID. Check available models:
   ```bash
   curl -s http://localhost:5055/api/models | jq '.[] | {id, name, provider}'
   ```

3. **Session-specific override**: This sets the model per-session, not globally. Different sessions can use different models.

4. **UI may not show the change**: The UI might not reflect the model_override setting. The fix works at the API level.

5. **Related to source re-upload**: When you delete and re-upload a source, existing sessions may reference the old source ID. Consider creating new sessions after source changes.

## Prevention

- After creating a new chat session, immediately set the `model_override` via API
- Consider filing a bug report with OpenNotebook about null model resolution
- Use the session that already has `model_override` set (like the one with title "What is this book about?" which had it configured)
- Keep track of working session IDs for reuse
