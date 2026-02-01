# Headless Obsidian Workflow on Unraid NAS

## Project Overview

**Version:** 1.0
**Created:** January 13, 2026
**Owner:** Paul Barrick
**Domain:** byte-sized.io
**Status:** Planning

---

## Executive Summary

This project establishes a headless Obsidian vault on an Unraid NAS that serves as a centralized personal knowledge system accessible from anywhere via Claude AI. The system runs 24/7 without requiring a GUI, enabling:

1. **Mobile Claude Integration** - Query and interact with the vault directly from Claude mobile app
2. **Extended Planning Sessions** - Use Claude Code web for deep work and planning
3. **Unified Personal Context** - Single source of truth for all personal knowledge

---

## Infrastructure Context

### Current Setup

| Component | Details |
|-----------|---------|
| **Domain** | byte-sized.io |
| **NAS** | Unraid at 192.168.1.62 |
| **Router** | Ubiquiti Dream Machine Pro |
| **ISP** | BAM Internet (ports 80/443 blocked outbound) |
| **DNS** | Cloudflare |
| **Tunnel Solution** | Cloudflare Tunnels via Docker |

### Key Constraint

BAM Internet blocks ports 80 and 443, making traditional port forwarding impossible. All external access must route through Cloudflare Tunnels, which establish outbound connections that bypass these restrictions.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL ACCESS                              │
├─────────────────────────────────────────────────────────────────────┤
│  Claude Mobile App  ──┐                                              │
│  Claude Desktop     ──┼──► mcp.byte-sized.io ──► Cloudflare Tunnel  │
│  Claude Code Web    ──┘                                              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      UNRAID NAS (192.168.1.62)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │ Cloudflared  │◄───│  MCP Server  │◄───│   Obsidian   │          │
│  │   Container  │    │  (Node.js)   │    │    Vault     │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│         │                   │                    ▲                   │
│         │                   │                    │                   │
│         ▼                   ▼                    │                   │
│  Outbound tunnel     Port 3000              /mnt/user/              │
│  to Cloudflare       (internal)             vaults/obsidian         │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                        AUDIO PIPELINE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │    rclone    │◄───│   Whisper    │───►│  Transcripts │          │
│  │ Google Drive │    │   WebUI      │    │   in Vault   │          │
│  │    Mount     │    │  Container   │    │              │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│         ▲                                                            │
│         │                                                            │
│  Samsung Watch ──► Google Drive ──► /mnt/disks/gdrive_recordings    │
│  Voice Recorder                                                      │
│  S Pen Notes                                                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

#### 1.1 Create Vault Share on Unraid

```bash
# Create the vault directory structure
mkdir -p /mnt/user/vaults/obsidian-vault
mkdir -p /mnt/user/vaults/obsidian-vault/Transcripts
mkdir -p /mnt/user/vaults/obsidian-vault/Daily
mkdir -p /mnt/user/vaults/obsidian-vault/Projects
mkdir -p /mnt/user/vaults/obsidian-vault/Templates
```

**Unraid Share Settings:**
- Share Name: `vaults`
- Allocation: High-water
- Cache: Prefer (for faster access)

#### 1.2 Install Required Plugins

Via Community Applications:
- [x] Nerd Tools (for rclone and inotify-tools)
- [x] User Scripts

---

### Phase 2: MCP Server Setup (Week 1-2)

#### 2.1 Create Node.js Container for MCP

**Docker Compose (or manual Unraid template):**

```yaml
version: '3.8'
services:
  mcp-obsidian:
    container_name: mcp-obsidian
    image: node:20-alpine
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - /mnt/user/vaults/obsidian-vault:/vault:rw
      - /mnt/user/appdata/mcp-obsidian:/app:rw
    working_dir: /app
    command: sh -c "npm install && node server.js"
    environment:
      - VAULT_PATH=/vault
      - NODE_ENV=production
```

#### 2.2 Install MCP Obsidian Server

Inside the container:

```bash
docker exec -it mcp-obsidian /bin/sh

# Install the MCP server
npm init -y
npm install @anthropic-ai/mcp-server-obsidian

# Or use smithery CLI
npm install -g @smithery/cli
npx @smithery/cli install mcp-obsidian --client claude
```

#### 2.3 MCP Server Configuration

Create `/mnt/user/appdata/mcp-obsidian/config.json`:

```json
{
  "vault": {
    "path": "/vault",
    "name": "byte-sized-vault"
  },
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  },
  "features": {
    "search": true,
    "create": true,
    "edit": true,
    "delete": false
  }
}
```

---

### Phase 3: Cloudflare Tunnel Integration (Week 2)

#### 3.1 Create Tunnel in Cloudflare Dashboard

1. Navigate to: **Cloudflare Zero Trust → Networks → Tunnels**
2. Click **Create a tunnel**
3. Name: `obsidian-mcp`
4. Copy the tunnel token

#### 3.2 Deploy Cloudflared Container

**Unraid Docker Template Settings:**

| Setting | Value |
|---------|-------|
| **Name** | cloudflared-obsidian |
| **Repository** | cloudflare/cloudflared:latest |
| **Network Type** | Host |
| **Post Arguments** | tunnel --no-autoupdate run --token YOUR_TUNNEL_TOKEN |

Or Docker Compose:

```yaml
version: '3.8'
services:
  cloudflared:
    container_name: cloudflared-obsidian
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    network_mode: host
    command: tunnel --no-autoupdate run --token ${TUNNEL_TOKEN}
    environment:
      - TUNNEL_TOKEN=your_token_here
```

#### 3.3 Configure Public Hostname

In Cloudflare Dashboard (Tunnels → obsidian-mcp → Public Hostname):

| Subdomain | Domain | Service |
|-----------|--------|---------|
| mcp | byte-sized.io | http://localhost:3000 |

**Result:** `https://mcp.byte-sized.io` routes to MCP server

#### 3.4 Add Access Policy (Recommended)

1. Go to **Zero Trust → Access → Applications**
2. Create Application:
   - Type: Self-hosted
   - Name: Obsidian MCP
   - Domain: mcp.byte-sized.io
3. Add Policy:
   - Rule: Email ends with `@gmail.com` (or your specific email)
   - Or use: One-time PIN to your email

---

### Phase 4: Google Drive Integration (Week 2-3)

#### 4.1 Configure rclone

```bash
# SSH into Unraid
rclone config

# Create new remote
# Name: gdrive
# Type: drive (Google Drive)
# Scope: drive
# Use your own client ID (recommended) or default
```

#### 4.2 Create Mount User Script

**Name:** `Mount-Google-Drive`
**Schedule:** At Startup of Array

```bash
#!/bin/bash

# Mount point
MOUNT_POINT="/mnt/disks/gdrive_recordings"

# Create mount directory
mkdir -p "$MOUNT_POINT"

# Check if already mounted
if mountpoint -q "$MOUNT_POINT"; then
    echo "Google Drive already mounted"
    exit 0
fi

# Mount Google Drive recordings folder
rclone mount gdrive:Recordings "$MOUNT_POINT" \
    --allow-other \
    --vfs-cache-mode writes \
    --vfs-cache-max-age 72h \
    --dir-cache-time 72h \
    --poll-interval 15s \
    --log-file /mnt/user/appdata/rclone/gdrive.log \
    --log-level INFO \
    --daemon

echo "Google Drive mounted at $MOUNT_POINT"
```

---

### Phase 5: Audio Transcription Pipeline (Week 3)

#### 5.1 Deploy Whisper WebUI Container

**Docker Settings:**

| Setting | Value |
|---------|-------|
| **Name** | whisper-transcriber |
| **Repository** | jhj0517/whisper-webui:latest |
| **Port** | 8080:8501 |
| **Volume 1** | /mnt/disks/gdrive_recordings:/audio |
| **Volume 2** | /mnt/user/vaults/obsidian-vault/Transcripts:/output |
| **GPU** | --gpus all (if NVIDIA available) |

#### 5.2 Create Auto-Transcription Script

**Name:** `Audio-Watcher-Transcriber`
**Schedule:** At Startup of Array

```bash
#!/bin/bash

AUDIO_DIR="/mnt/disks/gdrive_recordings"
VAULT_DIR="/mnt/user/vaults/obsidian-vault/Transcripts"
PROCESSED_DIR="${AUDIO_DIR}/processed"
WHISPER_API="http://localhost:8080/api/transcribe"

# Create directories
mkdir -p "$PROCESSED_DIR"
mkdir -p "$VAULT_DIR"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> /mnt/user/appdata/whisper/watcher.log
}

log "Starting audio watcher..."

# Watch for new audio files
inotifywait -m -e create -e moved_to --format '%f' "$AUDIO_DIR" | while read filename; do
    # Check if it's an audio file
    case "$filename" in
        *.mp3|*.wav|*.m4a|*.ogg|*.flac)
            filepath="${AUDIO_DIR}/${filename}"
            basename="${filename%.*}"
            timestamp=$(date '+%Y-%m-%d_%H-%M-%S')
            output_file="${VAULT_DIR}/${timestamp}_${basename}.md"

            log "Processing: $filename"

            # Wait for file to finish writing
            sleep 5

            # Transcribe using Whisper API
            response=$(curl -s -X POST "$WHISPER_API" \
                -F "file=@${filepath}" \
                -F "model=base" \
                -F "language=en")

            # Extract transcript text
            transcript=$(echo "$response" | jq -r '.text // empty')

            if [ -n "$transcript" ]; then
                # Create markdown note
                cat > "$output_file" << EOF
---
created: $(date '+%Y-%m-%d %H:%M')
source: audio_transcription
original_file: ${filename}
type: transcript
---

# Transcript: ${basename}

**Recorded:** $(date -r "$filepath" '+%Y-%m-%d %H:%M')
**Transcribed:** $(date '+%Y-%m-%d %H:%M')

---

${transcript}

---

![[${filename}]]
EOF

                log "Transcribed to: $output_file"

                # Move processed file
                mv "$filepath" "$PROCESSED_DIR/"
            else
                log "ERROR: Transcription failed for $filename"
            fi
            ;;
    esac
done
```

---

### Phase 6: Device Sync Setup (Week 3-4)

#### 6.1 Deploy Syncthing Container

**Docker Settings:**

| Setting | Value |
|---------|-------|
| **Name** | syncthing |
| **Repository** | linuxserver/syncthing |
| **Port** | 8384:8384 (Web UI), 22000:22000 (sync) |
| **Volume** | /mnt/user/vaults/obsidian-vault:/sync/vault |

#### 6.2 Configure Syncthing Shares

1. Access Syncthing at`http://192.168.1.62:8384`
2. Add folder: `/sync/vault`
3. Share with mobile devices running Syncthing
4. Set sync type: **Send & Receive**
5. Ignore patterns:
   ```
   .obsidian/workspace*
   .trash/
   *.tmp
   ```

#### 6.3 Alternative: Git-based Sync

For version control, add Git sync:

```bash
# Initialize repo in vault
cd /mnt/user/vaults/obsidian-vault
git init
git remote add origin git@github.com:peb7268/obsidian-vault.git

# Create sync script
cat > /mnt/user/scripts/vault-git-sync.sh << 'EOF'
#!/bin/bash
cd /mnt/user/vaults/obsidian-vault
git add -A
git commit -m "Auto-sync $(date '+%Y-%m-%d %H:%M')" || true
git push origin main
EOF
chmod +x /mnt/user/scripts/vault-git-sync.sh
```

Schedule via User Scripts to run hourly.

---

## Claude Integration

### Connecting Claude Mobile/Desktop

Once the MCP server is running and exposed via Cloudflare:

1. Open Claude settings
2. Navigate to **Integrations** or **MCP Tools**
3. Add new MCP server:
   - URL: `https://mcp.byte-sized.io`
   - Type: Obsidian
4. Test with: "Search my notes for..."

### Available Operations

| Operation | Example Query |
|-----------|---------------|
| Search | "Find all notes about project planning" |
| Read | "Show me the contents of my daily note" |
| Create | "Create a new note called 'Meeting Notes'" |
| Update | "Add a task to my daily note" |
| List | "What notes do I have in Projects folder?" |

---

## Security Considerations

### Network Security

- [ ] Cloudflare Access policy restricts to authenticated users only
- [ ] MCP server only accessible via tunnel (not exposed directly)
- [ ] No inbound ports opened on UDM Pro
- [ ] All traffic encrypted via HTTPS

### Data Security

- [ ] Vault stored on encrypted array (if enabled)
- [ ] Git commits exclude sensitive files (via .gitignore)
- [ ] Google Drive requires OAuth authentication
- [ ] API keys stored in environment variables only

### Recommended .gitignore

```
# Sensitive
.env
*.key
credentials/

# Obsidian internals
.obsidian/workspace*
.obsidian/cache
.trash/

# Audio files (stored separately)
*.mp3
*.wav
*.m4a
```

---

## Monitoring & Maintenance

### Health Check Script

Create `/mnt/user/scripts/health-check.sh`:

```bash
#!/bin/bash

check_container() {
    if docker ps --format '{{.Names}}' | grep -q "^$1$"; then
        echo "✓ $1 is running"
        return 0
    else
        echo "✗ $1 is NOT running"
        return 1
    fi
}

echo "=== Headless Obsidian Health Check ==="
echo "Time: $(date)"
echo ""

check_container "mcp-obsidian"
check_container "cloudflared-obsidian"
check_container "whisper-transcriber"
check_container "syncthing"

echo ""
echo "=== Mount Status ==="
if mountpoint -q /mnt/disks/gdrive_recordings; then
    echo "✓ Google Drive mounted"
else
    echo "✗ Google Drive NOT mounted"
fi

echo ""
echo "=== MCP Server Status ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health && echo "✓ MCP responding" || echo "✗ MCP not responding"
```

### Unraid Notifications

Enable Docker container monitoring in Unraid settings to receive alerts if containers stop.

---

## Rollback Plan

If issues occur:

1. **MCP Server fails:** Claude access stops but vault remains intact
2. **Cloudflare Tunnel fails:** Use local network access at `192.168.1.62:3000`
3. **rclone mount fails:** Audio pipeline stops; manual mount or restart script
4. **Syncthing conflicts:** Git history provides recovery; check `.stversions`

---

## Success Criteria

- [ ] Can query vault from Claude mobile app
- [ ] Can query vault from Claude Code web
- [ ] Audio recordings auto-transcribe within 5 minutes
- [ ] Changes sync across devices within 1 minute
- [ ] System maintains 99% uptime
- [ ] All access properly authenticated

---

## Timeline

| Week | Milestone |
|------|-----------|
| 1 | Vault share created, MCP server running locally |
| 2 | Cloudflare Tunnel configured, external access working |
| 3 | Google Drive mount and transcription pipeline active |
| 4 | Syncthing configured, full system operational |

---

## Appendix A: Docker Commands Reference

```bash
# View all container logs
docker logs mcp-obsidian -f
docker logs cloudflared-obsidian -f
docker logs whisper-transcriber -f

# Restart containers
docker restart mcp-obsidian
docker restart cloudflared-obsidian

# Check container resource usage
docker stats

# Enter container shell
docker exec -it mcp-obsidian /bin/sh
```

## Appendix B: Troubleshooting

### MCP Connection Failed

1. Check container is running: `docker ps | grep mcp`
2. Check Cloudflare tunnel status in dashboard
3. Verify DNS propagation: `dig mcp.byte-sized.io`
4. Test local access: `curl http://localhost:3000`

### Transcription Not Working

1. Check whisper container logs
2. Verify audio file format is supported
3. Check inotifywait is running: `ps aux | grep inotify`
4. Verify mount is active: `ls /mnt/disks/gdrive_recordings`

### Sync Conflicts

1. Check Syncthing web UI for conflict files
2. Review `.stversions` for previous versions
3. Use git log to trace changes
4. Manual merge if needed

---

## Related Documents

- [[Implementation-Checklist]]
- [[Docker-Compose-Full]]
- [[Backup-Strategy]]

---

*Last Updated: January 13, 2026*
