# Implementation Checklist

> Track your progress on the Headless Obsidian setup

---

## Phase 1: Foundation

### Unraid Share Setup
- [ ] Create `/mnt/user/vaults/obsidian-vault` share
- [ ] Create subdirectories (Transcripts, Daily, Projects, Templates)
- [ ] Set share to prefer cache for performance
- [ ] Verify permissions allow Docker container access

### Plugin Installation
- [ ] Install Nerd Tools from Community Applications
- [ ] Verify rclone is available (`rclone --version`)
- [ ] Install inotify-tools via Nerd Tools
- [ ] Install User Scripts plugin

---

## Phase 2: MCP Server

### Docker Container
- [ ] Pull `node:20-alpine` image
- [ ] Create container `mcp-obsidian`
- [ ] Map port 3000:3000
- [ ] Mount vault to `/vault`
- [ ] Create appdata directory `/mnt/user/appdata/mcp-obsidian`

### MCP Installation
- [ ] Install smithery CLI or mcp-server-obsidian
- [ ] Create `config.json` with vault path
- [ ] Start MCP server successfully
- [ ] Test locally: `curl http://192.168.1.62:3000/health`

---

## Phase 3: Cloudflare Tunnel

### Tunnel Creation
- [ ] Log into Cloudflare Zero Trust dashboard
- [ ] Create tunnel named `obsidian-mcp`
- [ ] Copy tunnel token

### Cloudflared Container
- [ ] Pull `cloudflare/cloudflared:latest`
- [ ] Create container with host networking
- [ ] Add tunnel token to post arguments
- [ ] Verify tunnel shows "Healthy" in dashboard

### DNS Configuration
- [ ] Add public hostname: `mcp.byte-sized.io`
- [ ] Point to `http://localhost:3000`
- [ ] Test external access: `curl https://mcp.byte-sized.io`

### Security (Optional but Recommended)
- [ ] Create Access Application for mcp.byte-sized.io
- [ ] Configure authentication policy (email OTP)
- [ ] Test authentication flow

---

## Phase 4: Google Drive Integration

### rclone Setup
- [ ] Run `rclone config`
- [ ] Create remote named `gdrive`
- [ ] Complete OAuth authentication
- [ ] Test: `rclone ls gdrive:Recordings`

### Mount Script
- [ ] Create User Script: "Mount-Google-Drive"
- [ ] Add mount script content
- [ ] Set schedule: At Startup of Array
- [ ] Run script manually to test
- [ ] Verify mount: `ls /mnt/disks/gdrive_recordings`

---

## Phase 5: Audio Transcription

### Whisper Container
- [ ] Pull `jhj0517/whisper-webui:latest`
- [ ] Map ports 8080:8501
- [ ] Mount audio directory
- [ ] Mount output to vault Transcripts folder
- [ ] (Optional) Enable GPU passthrough
- [ ] Test Whisper web UI at `http://192.168.1.62:8080`

### Auto-Transcription Script
- [ ] Create User Script: "Audio-Watcher-Transcriber"
- [ ] Add watcher script content
- [ ] Create processed files directory
- [ ] Set schedule: At Startup of Array
- [ ] Test with sample audio file
- [ ] Verify markdown created in Transcripts folder

---

## Phase 6: Device Sync

### Syncthing Setup
- [ ] Pull `linuxserver/syncthing`
- [ ] Map ports 8384 and 22000
- [ ] Mount vault directory
- [ ] Access web UI
- [ ] Add vault folder to sync
- [ ] Configure ignore patterns

### Mobile Sync
- [ ] Install Syncthing on phone
- [ ] Add NAS as remote device
- [ ] Share vault folder
- [ ] Test sync: create note on phone

### Git Backup (Optional)
- [ ] Initialize git repo in vault
- [ ] Add remote repository
- [ ] Create `.gitignore`
- [ ] Create auto-commit script
- [ ] Schedule hourly sync

---

## Phase 7: Claude Integration

### Connect Claude
- [ ] Open Claude settings
- [ ] Add MCP tool with URL `https://mcp.byte-sized.io`
- [ ] If using Access, complete authentication
- [ ] Test search query: "What notes do I have?"

### Verify Operations
- [ ] Search works
- [ ] Read note works
- [ ] Create note works
- [ ] List folders works

---

## Phase 8: Monitoring

### Health Check
- [ ] Create health check script
- [ ] Schedule to run every 15 minutes
- [ ] Configure Unraid email notifications

### Documentation
- [ ] Document all container settings
- [ ] Save Docker Compose file (if used)
- [ ] Record all credentials securely
- [ ] Create backup of tunnel token

---

## Final Validation

- [ ] Cold boot test: Restart Unraid and verify all services auto-start
- [ ] Claude mobile test: Query vault from phone
- [ ] Claude Code web test: Extended session works
- [ ] Transcription test: Full pipeline from recording to vault
- [ ] Sync test: Changes propagate to all devices

---

## Notes

_Use this space to track issues, workarounds, and customizations:_

```
Date:
Issue:
Resolution:
```

---

*Related: [[PRD-Headless-Obsidian-Workflow]]*
