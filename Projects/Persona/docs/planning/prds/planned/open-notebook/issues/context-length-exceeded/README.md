# Context Length Exceeded

**OpenNotebook Version**: v1-latest
**Component**: LLM Chat / RAG Pipeline
**Severity**: High (causes chat failures on large documents)
**Related GitHub Issue**: [#345](https://github.com/lfnovo/open_notebook/issues/345)

---

## Symptom

Chat requests take an extremely long time (minutes) and eventually fail or return unhelpful responses. The LLM appears to struggle with content from large documents like books.

## Signs Presented

1. **Extremely slow chat responses**: Minutes instead of seconds

2. **Chat fails with vague errors** or returns:
   - "I don't see any book information in the provided context"
   - Generic responses that ignore the document content

3. **UI requires page refresh** to see any response

4. **Container logs may show timeout or context errors**:
   ```
   Failed to send messages
   ```

5. **GitHub Issue #345 describes this exact behavior**: Context length exceeded causes "Failed to send messages" error

## Root Cause

**Model context window too small for document content.**

When using Ollama's `llama3.2` model:
- **llama3.2 context window**: 4,096 tokens
- **Large book content**: 100,000+ tokens

The RAG pipeline retrieves relevant chunks from the embedded document and passes them to the LLM. If the combined context (system prompt + retrieved chunks + user question) exceeds the model's context window, the request fails or produces poor results.

### Token Analysis Example

| Component | Tokens |
|-----------|--------|
| Book content | ~116,800 |
| llama3.2 limit | 4,096 |
| **Overflow** | ~112,700 tokens |

## How We Found the Solution

1. Observed slow responses and need to refresh the page

2. Performed web search for "OpenNotebook slow chat refresh required" and "OpenNotebook v1.2 known issues"

3. Found **GitHub Issue #345**: Context length exceeded causes failures

4. Compared model context windows:
   - `llama3.2`: 4,096 tokens
   - `gemini-2.0-flash`: 1,000,000+ tokens

5. Determined switching to a large-context model would resolve the issue

## Solution

### Switch to a Large-Context Model (Gemini)

1. **Ensure Google API key is configured** in `docker.env`:
   ```
   GOOGLE_API_KEY=your_actual_api_key_here
   ```

2. **Restart containers** to load the new key (see env-vars-not-reloading issue)

3. **Verify Google provider is available**:
   ```bash
   curl -s http://localhost:5055/api/models/providers | jq '.available'
   # Should include "google"
   ```

4. **Set Gemini as default chat model**:
   ```bash
   # First, find the Gemini model ID
   curl -s http://localhost:5055/api/models | jq '.[] | select(.provider=="google" and .type=="language")'

   # Set as default
   curl -X PUT http://localhost:5055/api/models/defaults \
     -H "Content-Type: application/json" \
     -d '{"default_chat_model": "model:<gemini-model-id>"}'
   ```

5. **Update existing chat sessions** (see model-not-language-model-none issue)

### Alternative: Use Groq with Larger Context Models

Groq offers free-tier models with larger context:
- `llama-3.3-70b-versatile`: 128K context
- `mixtral-8x7b-32768`: 32K context

Configure `GROQ_API_KEY` in `docker.env` and follow similar steps.

## Caveats

1. **Cloud dependency**: Switching to Gemini/Groq requires internet and API keys. Ollama provides offline capability but with context limitations.

2. **Cost considerations**: While Gemini and Groq have free tiers, heavy usage may incur costs.

3. **Latency tradeoff**: Cloud models may have network latency but handle large contexts. Local models are faster for small contexts.

4. **Model quality varies**: Different models have different strengths. Test with your specific use case.

5. **Existing sessions may still fail**: After changing default model, existing chat sessions may still use the old model (see model-not-language-model-none issue).

## Prevention

- **Check document size before uploading**: Very large documents (100K+ tokens) require large-context models
- **Configure cloud models upfront**: Set up Gemini/Groq API keys during initial setup
- **Use appropriate model for task**: Small queries on small docs → Ollama; Large docs → Cloud models
- **Monitor OpenNotebook GitHub issues**: Known issues are often documented there
