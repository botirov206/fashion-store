# Fashion Store — Docker Deployment Guide

This guide walks you through deploying **Fashion Store** on a Linux VPS using Docker. You do **not** need GitHub to deploy — you can copy the project directly from your PC to the server.

---

## Table of contents

1. [Architecture](#1-architecture)
2. [What you need](#2-what-you-need)
3. [Prepare the project on your PC](#3-prepare-the-project-on-your-pc)
4. [Create a cloud database (Neon)](#4-create-a-cloud-database-neon)
5. [Set up the server](#5-set-up-the-server)
6. [Copy the project to the server (no GitHub)](#6-copy-the-project-to-the-server-no-github)
7. [Configure environment variables on the server](#7-configure-environment-variables-on-the-server)
8. [Build and run with Docker](#8-build-and-run-with-docker)
9. [Verify the deployment](#9-verify-the-deployment)
10. [Put Nginx in front (recommended)](#10-put-nginx-in-front-recommended)
11. [Enable HTTPS with Let's Encrypt](#11-enable-https-with-lets-encrypt)
12. [Firewall](#12-firewall)
13. [Update the app after changes](#13-update-the-app-after-changes)
14. [Optional: use GitHub later](#14-optional-use-github-later)
15. [Alternative: full stack with local Postgres in Docker](#15-alternative-full-stack-with-local-postgres-in-docker)
16. [Troubleshooting](#16-troubleshooting)
17. [Quick reference](#17-quick-reference)

---

## 1. Architecture

```text
Browser
   │
   ▼
Nginx (port 80/443)          ← optional but recommended
   │
   ▼
Docker container: web        ← Node.js + Express (port 3000)
   │
   ▼
Neon PostgreSQL (cloud)      ← DATABASE_URL
```

| Component | Role |
|-----------|------|
| **Docker** | Runs the Node.js app in an isolated container |
| **Neon** | Managed PostgreSQL (no DB container needed on the server) |
| **Nginx** | Reverse proxy, HTTPS, domain routing |
| **`.env`** | Secrets and config (never commit this file) |

**Production compose file:** `docker-compose.prod.yml` — runs **only the web app** and connects to Neon via `DATABASE_URL`.

**Development compose file:** `docker-compose.yml` — runs web + local Postgres (useful for offline dev).

---

## 2. What you need

### On your PC (Windows)

- The `fashion-store` project folder
- SSH client (PowerShell / Windows Terminal is enough)
- Optional: [WinSCP](https://winscp.net/) for drag-and-drop uploads

### On the server (VPS)

- **OS:** Ubuntu 22.04 or 24.04 LTS (recommended)
- **RAM:** 1 GB minimum (2 GB recommended)
- **Open ports:** 22 (SSH), 80 (HTTP), 443 (HTTPS)
- **Provider examples:** Hetzner, DigitalOcean, AWS EC2, Contabo, etc.

### External services

- **Neon** account — free tier works for assignments and small projects  
  https://neon.tech

### Optional

- A domain name pointed to your server IP (for HTTPS and a clean URL)

---

## 3. Prepare the project on your PC

Before uploading, make sure your project contains these files:

```text
fashion-store/
├── db.js
├── server.js
├── package.json
├── Dockerfile
├── docker-compose.prod.yml      ← use this on the server
├── docker-compose.yml           ← local dev with Postgres
├── .env.example
├── .dockerignore
├── public/
│   ├── index.html
│   ├── app.js
│   └── styles.css
└── deploy/
    └── nginx/
        └── fashion-store.conf
```

**Do not upload:**

- `node_modules/` (Docker builds its own)
- `.env` with real secrets over insecure channels — create `.env` **on the server** instead (see step 7)

Test locally first:

```powershell
cd "C:\Users\Dell\Courses\2nd Semester Assignments\Assignments\fashion-store"
pnpm install
pnpm start
```

Open http://localhost:3010 and confirm products load.

---

## 4. Create a cloud database (Neon)

1. Sign in at https://console.neon.tech
2. Create a project (e.g. `fashion-store`)
3. Open **Dashboard → Connection details**
4. Copy the **connection string** (PostgreSQL URI), e.g.:

   ```text
   postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
   ```

5. Save it — you will paste this into the server `.env` as `DATABASE_URL`.

The app creates tables and seed products automatically on first startup (`initDB()` in `db.js`).

---

## 5. Set up the server

SSH into your VPS (replace with your server IP and user):

```powershell
ssh root@YOUR_SERVER_IP
```

Or, if you use a non-root user:

```powershell
ssh deploy@YOUR_SERVER_IP
```

### 5.1 Update the system

```bash
sudo apt update && sudo apt upgrade -y
```

### 5.2 Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Log out and log back in so the `docker` group applies:

```bash
exit
```

SSH in again, then verify:

```bash
docker --version
docker compose version
```

### 5.3 Create app directory

```bash
sudo mkdir -p /opt/fashion-store
sudo chown $USER:$USER /opt/fashion-store
cd /opt/fashion-store
```

---

## 6. Copy the project to the server (no GitHub)

Choose **one** method.

### Method A — SCP from Windows PowerShell (recommended)

Run this **on your PC** (not on the server):

```powershell
scp -r "C:\Users\Dell\Courses\2nd Semester Assignments\Assignments\fashion-store\*" deploy@YOUR_SERVER_IP:/opt/fashion-store/
```

If `scp` fails on paths with spaces, zip first:

```powershell
cd "C:\Users\Dell\Courses\2nd Semester Assignments\Assignments"
Compress-Archive -Path fashion-store -DestinationPath fashion-store.zip -Force
scp fashion-store.zip deploy@YOUR_SERVER_IP:/opt/
```

On the server:

```bash
cd /opt
unzip fashion-store.zip
mv fashion-store/* fashion-store/ 2>/dev/null || true
cd /opt/fashion-store
```

### Method B — WinSCP / FileZilla

1. Connect via SFTP to `YOUR_SERVER_IP`
2. Upload the whole `fashion-store` folder to `/opt/fashion-store`
3. **Skip** `node_modules` and `.env`

### Method C — `rsync` (if you have WSL or Git Bash)

```bash
rsync -avz --exclude node_modules --exclude .env \
  "/mnt/c/Users/Dell/Courses/2nd Semester Assignments/Assignments/fashion-store/" \
  deploy@YOUR_SERVER_IP:/opt/fashion-store/
```

### After upload, on the server

```bash
cd /opt/fashion-store
ls -la
```

You should see `Dockerfile`, `docker-compose.prod.yml`, `server.js`, and `public/`.

---

## 7. Configure environment variables on the server

Create `.env` **on the server** (never commit this file):

```bash
cd /opt/fashion-store
cp .env.example .env
nano .env
```

Set production values:

```env
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
PORT=3000
```

| Variable | Production value |
|----------|------------------|
| `DATABASE_URL` | Full Neon connection string from step 4 |
| `PORT` | `3000` (must match the port inside the container) |

Save: `Ctrl+O`, Enter, `Ctrl+X`.

Lock down permissions:

```bash
chmod 600 .env
```

---

## 8. Build and run with Docker

From `/opt/fashion-store`:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

What this does:

- Builds the image from `Dockerfile`
- Starts container `fashion-store`
- Binds app to `127.0.0.1:3000` (only localhost — Nginx will expose it publicly)
- Loads secrets from `.env`
- Restarts automatically after server reboot (`restart: unless-stopped`)

### Useful commands

```bash
# Container status
docker compose -f docker-compose.prod.yml ps

# Live logs
docker compose -f docker-compose.prod.yml logs -f web

# Stop
docker compose -f docker-compose.prod.yml down

# Rebuild after code changes
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 9. Verify the deployment

### On the server

```bash
curl http://127.0.0.1:3000/api/health
```

Expected:

```json
{"status":"ok","database":"connected"}
```

```bash
curl http://127.0.0.1:3000/api/products
```

You should get a JSON array of products.

### From your PC (before Nginx)

If you temporarily expose port 3000 publicly:

```bash
# On server — only for quick testing, not for production
# Edit docker-compose.prod.yml ports to "3000:3000" instead of 127.0.0.1:3000
```

Then open `http://YOUR_SERVER_IP:3000` in a browser.

**For production, use Nginx (next section) instead of exposing 3000 directly.**

---

## 10. Put Nginx in front (recommended)

Install Nginx:

```bash
sudo apt install -y nginx
```

Copy the sample config:

```bash
sudo cp /opt/fashion-store/deploy/nginx/fashion-store.conf /etc/nginx/sites-available/fashion-store
```

Edit and replace `YOUR_DOMAIN`:

```bash
sudo nano /etc/nginx/sites-available/fashion-store
```

If you **don't have a domain yet**, use your server IP:

```nginx
server {
    listen 80;
    server_name YOUR_SERVER_IP;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -sf /etc/nginx/sites-available/fashion-store /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Open in browser:

- With domain: `http://your-domain.com`
- Without domain: `http://YOUR_SERVER_IP`

---

## 11. Enable HTTPS with Let's Encrypt

**Requires a domain** whose DNS A record points to your server IP.

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Follow the prompts. Certbot will:

- Issue a free SSL certificate
- Update Nginx for HTTPS
- Set up auto-renewal

Test renewal:

```bash
sudo certbot renew --dry-run
```

Your app will be available at `https://your-domain.com`.

---

## 12. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

Do **not** open port 3000 publicly when using Nginx — the app stays on localhost only.

---

## 13. Update the app after changes

### Without GitHub

1. Edit code on your PC
2. Upload changed files to `/opt/fashion-store` (SCP / WinSCP / rsync)
3. On the server:

```bash
cd /opt/fashion-store
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f web
```

### Database migrations

This project uses `CREATE TABLE IF NOT EXISTS` on startup. Schema changes are applied automatically when you redeploy a new version of `db.js`.

---

## 14. Optional: use GitHub later

When you want version control and easier deploys:

### On your PC

```powershell
cd "C:\Users\Dell\Courses\2nd Semester Assignments\Assignments\fashion-store"
git init
git add .
git commit -m "Initial commit: Fashion Store"
```

Create a repo on GitHub, then:

```powershell
git remote add origin https://github.com/YOUR_USER/fashion-store.git
git branch -M main
git push -u origin main
```

### On the server (first time)

```bash
cd /opt
sudo rm -rf fashion-store   # only if you want a fresh clone
git clone https://github.com/YOUR_USER/fashion-store.git
cd fashion-store
cp .env.example .env
nano .env   # add DATABASE_URL
docker compose -f docker-compose.prod.yml up -d --build
```

### Future updates via Git

```bash
cd /opt/fashion-store
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

**Important:** Add `.env` to `.gitignore` (already done). Never push secrets to GitHub.

---

## 15. Alternative: full stack with local Postgres in Docker

Use this only if you want Postgres **on the same server** instead of Neon.

```bash
cd /opt/fashion-store
nano .env
```

Remove or comment out `DATABASE_URL` and rely on Docker Compose env vars in `docker-compose.yml`:

```bash
docker compose up -d --build
```

This starts:

- `db` — Postgres 16 with persistent volume `fashion_data`
- `web` — Node app connected to `db` service

**Downside:** You manage backups and disk space yourself. **Neon is simpler for production.**

---

## 16. Troubleshooting

### Container exits immediately

```bash
docker compose -f docker-compose.prod.yml logs web
```

Common causes:

| Error | Fix |
|-------|-----|
| `DATABASE_URL` missing | Create `/opt/fashion-store/.env` with valid Neon URL |
| SSL / connection refused | Ensure Neon project is active; check connection string |
| Port already in use | Change `PORT` in `.env` or stop conflicting service |

### Health check fails

```bash
curl -v http://127.0.0.1:3000/api/health
docker compose -f docker-compose.prod.yml ps
```

Wait 20–30 seconds after first start (DB init + seed).

### Nginx 502 Bad Gateway

- App not running: `docker compose -f docker-compose.prod.yml ps`
- Wrong proxy port: Nginx must point to `http://127.0.0.1:3000`
- Check logs: `sudo tail -f /var/log/nginx/error.log`

### Products empty but health OK

Seed runs only when the `products` table is empty. If you need to re-seed, delete rows in Neon SQL editor or drop/recreate tables.

### Cannot connect from browser

1. `sudo ufw status` — allow Nginx (80/443)
2. Cloud provider security group — open 80 and 443
3. Confirm DNS A record if using a domain

### View container shell (debug)

```bash
docker exec -it fashion-store sh
wget -qO- http://127.0.0.1:3000/api/health
```

---

## 17. Quick reference

| Task | Command |
|------|---------|
| Start (production) | `docker compose -f docker-compose.prod.yml up -d --build` |
| Stop | `docker compose -f docker-compose.prod.yml down` |
| Logs | `docker compose -f docker-compose.prod.yml logs -f web` |
| Health | `curl http://127.0.0.1:3000/api/health` |
| Restart Nginx | `sudo systemctl reload nginx` |
| App URL (with Nginx) | `http://YOUR_DOMAIN` or `http://YOUR_SERVER_IP` |

### Deployment checklist

- [ ] Neon database created; `DATABASE_URL` copied
- [ ] Docker installed on VPS
- [ ] Project uploaded to `/opt/fashion-store`
- [ ] `.env` created on server with `DATABASE_URL` and `PORT=3000`
- [ ] `docker compose -f docker-compose.prod.yml up -d --build` succeeded
- [ ] `/api/health` returns `"database":"connected"`
- [ ] Nginx configured and site loads in browser
- [ ] HTTPS enabled (if using a domain)
- [ ] Firewall allows SSH + Nginx only

---

## Security reminders

1. **Never commit `.env`** — it contains database credentials.
2. **Rotate Neon password** if credentials were ever shared or committed.
3. **Bind the app to localhost** in production (`127.0.0.1:3000` in `docker-compose.prod.yml`).
4. **Keep the system updated:** `sudo apt update && sudo apt upgrade -y`
5. **Use SSH keys** instead of password login when possible.

---

For local development on Windows, use `pnpm dev` and your local `.env`. For production on the server, use Docker + `docker-compose.prod.yml` + Neon.
