# Source Embedding Shows Zero Chunks

**OpenNotebook Version**: v1-latest
**Component**: Embedding Pipeline / Ollama
**Severity**: High (prevents RAG functionality)

---

## Symptom

After uploading a source (PDF, text file, etc.), the source appears in the UI and shows `embedded: true`, but the chat cannot find any information from the document. Questions about the content return generic responses like "I don't see any book information in the provided context."

## Signs Presented

1. **Source shows embedded but chat fails**:
   - Source list shows the document
   - `embedded: true` in source details
   - Chat responses indicate no content available

2. **API reveals zero embedded chunks**:
   ```bash
   curl -s http://localhost:5055/api/sources/{source_id} | jq '.embedded_chunks'
   # Returns: 0
   ```

3. **Embedding model may show errors in logs**:
   ```
   [Retry] Attempt 1 failed with RuntimeError: Failed to get embeddings:
   ```

## Root Cause

Multiple potential causes:

1. **Embedding not enabled during upload**: The source was uploaded without the "embed" option enabled in the UI

2. **Ollama embedding model unavailable**: The `nomic-embed-text` model wasn't pulled or Ollama service wasn't running

3. **Docker networking issue**: Container couldn't reach Ollama at `host.docker.internal:11434`

4. **Silent embedding failure**: The embedding process started but failed silently, marking `embedded: true` prematurely

## How We Found the Solution

1. Checked source details via API to see actual chunk count:
   ```bash
   curl -s http://localhost:5055/api/sources | jq '.[] | {id, title, embedded}'
   curl -s http://localhost:5055/api/sources/{id} | jq '.embedded_chunks'
   ```

2. Found `embedded_chunks: 0` despite `embedded: true`

3. Verified Ollama connectivity from inside the container:
   ```bash
   docker exec open-notebook-open_notebook-1 curl -s http://host.docker.internal:11434/api/tags
   ```

4. Checked if embedding model was available:
   ```bash
   ollama list
   # Should show nomic-embed-text
   ```

5. Determined the source needed to be re-uploaded with embedding enabled

## Solution

### Step 1: Verify Ollama is Running with Embedding Model

```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Pull embedding model if missing
ollama pull nomic-embed-text

# Verify from Docker container
docker exec open-notebook-open_notebook-1 curl -s http://host.docker.internal:11434/api/tags
```

### Step 2: Delete and Re-upload the Source

1. Delete the existing source via UI or API:
   ```bash
   curl -X DELETE http://localhost:5055/api/sources/{source_id}
   ```

2. Re-upload the source through the UI with embedding enabled

3. Monitor embedding progress:
   ```bash
   # Watch chunk count increase
   watch -n 2 'curl -s http://localhost:5055/api/sources/{new_source_id} | jq ".embedded_chunks"'
   ```

### Step 3: Verify Embedding Complete

```bash
curl -s http://localhost:5055/api/sources/{source_id} | jq '{embedded, embedded_chunks}'
# Should show: {"embedded": true, "embedded_chunks": 40} (or similar non-zero count)
```

## Caveats

1. **Embedding takes time**: Large PDFs can take several minutes to embed. The `embedded: true` flag may appear before all chunks are processed.

2. **Check container logs for errors**: Silent failures may be logged:
   ```bash
   docker logs open-notebook-open_notebook-1 --tail 100 | grep -i embed
   ```

3. **Ollama memory**: Embedding models require RAM. If Ollama is under memory pressure, embeddings may fail.

4. **Re-upload required**: There's no "re-embed" button in the UI. You must delete and re-upload the source.

5. **Source ID changes**: After re-uploading, the source gets a new ID. Any existing chat sessions referencing the old source ID will not find the content.

## Prevention

- Always verify `embedded_chunks > 0` after upload, not just `embedded: true`
- Ensure Ollama is running and embedding model is pulled before uploading sources
- Monitor container logs during first upload to catch embedding errors early
- Consider using cloud embedding models (Google `text-embedding-004`) for reliability
