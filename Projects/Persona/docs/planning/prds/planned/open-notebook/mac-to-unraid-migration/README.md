# OpenNotebook: Mac to Unraid NAS Migration

**Status**: Planned
**Difficulty**: Easy (2-3 out of 5)
**Time Estimate**: 20-30 minutes
**Data to Migrate**: ~5MB

## Network Configuration

| Device | IP Address | Purpose |
|--------|------------|---------|
| Unraid NAS | `192.168.1.62` | Target server |
| Router | Ubiquiti Dream Machine Pro | Port forwarding (if needed) |

---

## Prerequisites

- SSH access to Unraid (`root@192.168.1.62`)
- Docker Compose support on Unraid (will install if needed)
- Mac has current OpenNotebook running at `/Users/pbarrick/Documents/open-notebook`

---

## Step 1: Install Docker Compose Plugin on Unraid

Since Unraid doesn't have compose support yet:

1. Open Unraid web UI: `http://192.168.1.62`
2. Go to **Apps** (Community Applications)
3. Search for **"Docker Compose Manager"** by dcflacern
4. Click **Install**
5. After install, find it under **Settings → Docker Compose Manager**

**Alternative**: Unraid 6.12+ has built-in **Stacks** feature (native compose support)

---

## Step 2: Create Directory Structure on Unraid

SSH into Unraid:

```bash
ssh root@192.168.1.62
```

Create directories:

```bash
mkdir -p /mnt/user/appdata/open-notebook
mkdir -p /mnt/user/appdata/ollama
```

---

## Step 3: Copy Files from Mac

From your Mac terminal:

```bash
cd /Users/pbarrick/Documents/open-notebook

# Copy config files
scp docker-compose.full.yml root@192.168.1.62:/mnt/user/appdata/open-notebook/
scp docker.env root@192.168.1.62:/mnt/user/appdata/open-notebook/

# Copy data directories (~5MB total)
scp -r surreal_data root@192.168.1.62:/mnt/user/appdata/open-notebook/
scp -r notebook_data root@192.168.1.62:/mnt/user/appdata/open-notebook/
```

---

## Step 4: Create Unraid docker-compose.yml

On Unraid, create the compose file:

```bash
ssh root@192.168.1.62
cat > /mnt/user/appdata/open-notebook/docker-compose.yml << 'EOF'
services:
  surrealdb:
    image: surrealdb/surrealdb:v2
    container_name: opennotebook-surrealdb
    volumes:
      - /mnt/user/appdata/open-notebook/surreal_data:/mydata
    environment:
      - SURREAL_EXPERIMENTAL_GRAPHQL=true
    ports:
      - "8000:8000"
    command: start --log info --user root --pass root rocksdb:/mydata/mydatabase.db
    restart: unless-stopped

  open_notebook:
    image: lfnovo/open_notebook:v1-latest
    container_name: opennotebook-app
    ports:
      - "8502:8502"
      - "5055:5055"
    env_file:
      - ./docker.env
    depends_on:
      - surrealdb
      - ollama
    volumes:
      - /mnt/user/appdata/open-notebook/notebook_data:/app/data
    restart: unless-stopped

  ollama:
    image: ollama/ollama:latest
    container_name: opennotebook-ollama
    ports:
      - "11434:11434"
    volumes:
      - /mnt/user/appdata/ollama:/root/.ollama
    restart: unless-stopped
EOF
```

---

## Step 5: Update docker.env for Unraid

Edit the docker.env file on Unraid:

```bash
ssh root@192.168.1.62
nano /mnt/user/appdata/open-notebook/docker.env
```

**Changes to make:**

```bash
# Change API_URL to Unraid IP
API_URL=http://192.168.1.62:5055
INTERNAL_API_URL=http://localhost:5055

# Change Ollama to use container networking
OLLAMA_API_BASE=http://ollama:11434
```

**Or use sed to make changes:**

```bash
ssh root@192.168.1.62
cd /mnt/user/appdata/open-notebook

# Update API_URL
sed -i 's|API_URL=http://localhost:5055|API_URL=http://192.168.1.62:5055|g' docker.env

# Update OLLAMA_API_BASE
sed -i 's|OLLAMA_API_BASE=http://host.docker.internal:11434|OLLAMA_API_BASE=http://ollama:11434|g' docker.env
```

---

## Step 6: Start Services on Unraid

```bash
ssh root@192.168.1.62
cd /mnt/user/appdata/open-notebook
docker-compose up -d
```

Check status:

```bash
docker-compose ps
```

Expected output:
```
NAME                      STATUS
opennotebook-surrealdb    Up
opennotebook-app          Up
opennotebook-ollama       Up
```

---

## Step 7: Pull Ollama Models

Download the AI models to Unraid (~2-3GB):

```bash
ssh root@192.168.1.62

# Pull language model
docker exec -it opennotebook-ollama ollama pull llama3.2

# Pull embedding model
docker exec -it opennotebook-ollama ollama pull nomic-embed-text
```

---

## Step 8: Verify Migration

### From Mac Terminal:

```bash
# Check API health
curl http://192.168.1.62:5055/health
# Expected: {"status":"healthy"}

# Check Ollama
curl http://192.168.1.62:11434/api/tags
# Expected: {"models":[{"name":"llama3.2:latest",...}]}
```

### From Mac Browser:

- **Web UI**: http://192.168.1.62:8502
- **API Docs**: http://192.168.1.62:5055/docs

---

## Step 9: Stop Mac Services

Once Unraid is verified working:

```bash
cd /Users/pbarrick/Documents/open-notebook
docker compose -f docker-compose.full.yml down
```

---

## Access URLs (After Migration)

| Service | URL |
|---------|-----|
| Web UI | http://192.168.1.62:8502 |
| API | http://192.168.1.62:5055 |
| API Docs | http://192.168.1.62:5055/docs |
| Ollama | http://192.168.1.62:11434 |

---

## Port Forwarding (Optional - External Access)

If you want to access OpenNotebook from outside your LAN via the Ubiquiti Dream Machine Pro:

### UDM Pro Configuration

1. Open UniFi Network: `https://192.168.1.1` (or your UDM Pro IP)
2. Go to **Settings → Firewall & Security → Port Forwarding**
3. Create rules:

| Name | Port (External) | Port (Internal) | IP | Protocol |
|------|-----------------|-----------------|-----|----------|
| OpenNotebook UI | 8502 | 8502 | 192.168.1.62 | TCP |
| OpenNotebook API | 5055 | 5055 | 192.168.1.62 | TCP |

**Security Note**: Only expose externally if you:
- Set up authentication (OpenNotebook doesn't have built-in auth)
- Use a reverse proxy with HTTPS (Nginx Proxy Manager, Traefik)
- Consider VPN access instead (Tailscale, WireGuard)

### Recommended: VPN Instead of Port Forwarding

For security, use Tailscale or WireGuard to access your home network remotely rather than exposing ports.

---

## Post-Migration Checklist

- [ ] Docker Compose Manager installed on Unraid
- [ ] Files copied to `/mnt/user/appdata/open-notebook/`
- [ ] docker.env updated with `192.168.1.62`
- [ ] All 3 containers running (surrealdb, open_notebook, ollama)
- [ ] Ollama models pulled (llama3.2, nomic-embed-text)
- [ ] Web UI accessible at http://192.168.1.62:8502
- [ ] API health check passing
- [ ] Existing notebooks/sources intact
- [ ] Mac services stopped
- [ ] (Optional) Bookmark added in browser

---

## Performance Notes

- **Ollama on Unraid**: x86 CPU will be slower than M3 Mac for local inference
- **Recommendation**: Use Gemini/Groq (cloud) as primary, Ollama as offline fallback
- **RAM**: Ensure Unraid has 8GB+ available for containers + Ollama models

---

## Troubleshooting

### Container Won't Start

```bash
ssh root@192.168.1.62
docker logs opennotebook-app
docker logs opennotebook-surrealdb
docker logs opennotebook-ollama
```

### Database Connection Error

Check SurrealDB is running:
```bash
docker exec opennotebook-surrealdb curl -s http://localhost:8000/health
```

### Ollama Not Responding

```bash
docker exec opennotebook-ollama ollama list
```

### Can't Access from Mac

1. Check Unraid firewall (usually not an issue)
2. Verify containers are running: `docker-compose ps`
3. Check ports aren't blocked: `nc -zv 192.168.1.62 8502`

---

## Rollback Plan

If migration fails, your Mac still has everything:

```bash
cd /Users/pbarrick/Documents/open-notebook
docker compose -f docker-compose.full.yml up -d
```

Access at http://localhost:8502 as before.

---

## Files Summary

| File | Location | Action |
|------|----------|--------|
| docker-compose.yml | `/mnt/user/appdata/open-notebook/` | Create new |
| docker.env | `/mnt/user/appdata/open-notebook/` | Copy & modify |
| surreal_data/ | `/mnt/user/appdata/open-notebook/` | Copy |
| notebook_data/ | `/mnt/user/appdata/open-notebook/` | Copy |
| ollama models | `/mnt/user/appdata/ollama/` | Download fresh |
