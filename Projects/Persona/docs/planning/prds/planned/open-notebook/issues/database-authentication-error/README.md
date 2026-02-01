# Database Authentication Error

**OpenNotebook Version**: v1-latest
**Component**: SurrealDB
**Severity**: Critical (blocks application startup)

---

## Symptom

The OpenNotebook application fails to connect to the database on startup. The web UI at `http://localhost:8502` shows connection errors or fails to load data.

## Signs Presented

1. **Container logs show authentication failure**:
   ```
   There was a problem with authentication
   ```

2. **API health check fails** or returns database connection errors:
   ```bash
   curl http://localhost:5055/health
   # Returns error or unhealthy status
   ```

3. **Web UI displays empty state** or connection error messages

4. **Docker container restarts repeatedly** (if restart policy is set)

## Root Cause

Password mismatch between two configuration sources:

1. **docker-compose.full.yml** - SurrealDB container starts with hardcoded credentials:
   ```yaml
   command: start --log info --user root --pass root rocksdb:/mydata/mydatabase.db
   ```

2. **docker.env** - Application connects using environment variables:
   ```
   SURREAL_PASSWORD=your_password_here  # Placeholder never updated
   ```

When these don't match, the application cannot authenticate to SurrealDB.

## How We Found the Solution

1. Checked container logs for the open_notebook service:
   ```bash
   docker logs open-notebook-open_notebook-1
   ```

2. Found "problem with authentication" error message

3. Compared the password in `docker.env` (`SURREAL_PASSWORD`) with the password in `docker-compose.full.yml` (`--pass root`)

4. Discovered `docker.env` had a placeholder value instead of `root`

## Solution

Update `docker.env` to match the password in `docker-compose.full.yml`:

```bash
# Edit docker.env
SURREAL_PASSWORD=root
```

Then restart the services:
```bash
docker compose -f docker-compose.full.yml down
docker compose -f docker-compose.full.yml up -d
```

## Caveats

1. **Restart vs Down/Up**: A simple `docker compose restart` may not be sufficient if the container cached the old environment. Use `down` followed by `up` to ensure clean state.

2. **Default Credentials**: The default `root/root` credentials are insecure. For production:
   - Change both the compose file and env file to use strong passwords
   - Consider using Docker secrets instead of environment variables

3. **Existing Data**: If you change the SurrealDB password after data has been created, you may need to reset the database or update credentials within SurrealDB itself.

## Prevention

- Always verify `docker.env` values match what's expected by the compose file
- Document the expected password in comments
- Use a single source of truth for credentials (e.g., pass from env to compose)
