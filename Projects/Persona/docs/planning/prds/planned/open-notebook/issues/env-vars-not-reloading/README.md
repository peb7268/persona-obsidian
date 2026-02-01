# Environment Variables Not Reloading

**OpenNotebook Version**: v1-latest
**Component**: Docker Compose / Container Configuration
**Severity**: Medium (causes confusion when changing configuration)

---

## Symptom

After updating `docker.env` with new values (e.g., API keys), the changes don't take effect even after restarting the containers. The application continues using the old configuration.

## Signs Presented

1. **New API key not recognized**: Provider still shows as "unavailable" after adding key to `docker.env`

2. **Container still has old values**:
   ```bash
   docker exec open-notebook-open_notebook-1 printenv GOOGLE_API_KEY
   # Shows: your_gemini_api_key_here (placeholder, not new key)
   ```

3. **Restart appears successful** but behavior unchanged:
   ```bash
   docker compose -f docker-compose.full.yml restart
   # Containers restart but config is stale
   ```

4. **Provider availability unchanged** after adding valid API key:
   ```bash
   curl -s http://localhost:5055/api/models/providers | jq '.available'
   # Missing the provider you just configured
   ```

## Root Cause

**`docker compose restart` does not reload environment files.**

Docker Compose behavior:
- `restart` → Restarts existing containers with their cached configuration
- `down` + `up` → Destroys containers and creates new ones, reading fresh env files

When you run `docker compose restart`:
1. Docker stops the running containers
2. Docker starts the same containers with the same configuration
3. Environment files (`env_file:` in compose) are NOT re-read

The container was created with the original env file values, and those values persist until the container is recreated.

## How We Found the Solution

1. Updated `docker.env` with new Google API key

2. Ran `docker compose restart`

3. Checked if Google provider was available → still unavailable

4. Verified the key in the container:
   ```bash
   docker exec open-notebook-open_notebook-1 printenv GOOGLE_API_KEY
   ```

5. Found the container still had the old placeholder value

6. Realized `restart` doesn't reload env files

7. Used `down` + `up` instead → new key loaded correctly

## Solution

### Use Down/Up Instead of Restart

```bash
cd /Users/pbarrick/Documents/open-notebook

# Stop and remove containers
docker compose -f docker-compose.full.yml down

# Create new containers with fresh config
docker compose -f docker-compose.full.yml up -d
```

### Verify New Values Loaded

```bash
# Check the specific environment variable
docker exec open-notebook-open_notebook-1 printenv GOOGLE_API_KEY

# Check provider availability
curl -s http://localhost:5055/api/models/providers | jq '.available'
```

### Alternative: Recreate Specific Service

If you only changed config for one service:

```bash
docker compose -f docker-compose.full.yml up -d --force-recreate open_notebook
```

## Caveats

1. **Data persistence**: `down` removes containers but NOT volumes. Your data in `surreal_data/` and `notebook_data/` is preserved.

2. **`down -v` removes volumes**: Do NOT use `-v` flag unless you want to delete all data:
   ```bash
   # DANGEROUS - removes data volumes
   docker compose down -v
   ```

3. **Brief downtime**: `down` + `up` causes a few seconds of downtime. `restart` is faster but doesn't reload config.

4. **Recreate vs restart**:
   - Need config changes? → `down` + `up`
   - Just need to restart the process? → `restart` is fine

5. **Check before assuming**: Always verify the env var is loaded in the container before assuming the change worked.

## Prevention

- Always use `down` + `up` when changing `docker.env`
- Create a helper script for config changes:
  ```bash
  #!/bin/bash
  # reload-config.sh
  docker compose -f docker-compose.full.yml down
  docker compose -f docker-compose.full.yml up -d
  echo "Config reloaded. Verifying..."
  sleep 5
  docker exec open-notebook-open_notebook-1 printenv | grep -E "API_KEY|API_BASE"
  ```
- Document this behavior in your setup notes
- Consider using `--env-file` flag with `docker compose up` for explicit control
