# Fashion Store — Server Deployment (GitHub)

Deploy via Git clone so updates are `git pull` + rebuild. CI/CD can be added on top of this later.

**App path on server:** `/var/www/fashion-store`

**Stack:** Docker (app on host port **3010**) → Neon PostgreSQL (`DATABASE_URL`) → Nginx (optional, for public access)

---

## 1. Prerequisites

| Where | What |
| ----- | ---- |
| PC | Project pushed to GitHub |
| VPS | Ubuntu 22.04/24.04, 1–2 GB RAM, ports 22 + 80 (+ 443 for HTTPS) |
| Neon | Free account at https://neon.tech |

---

## 2. Neon database

1. Create a project at https://console.neon.tech
2. Copy the PostgreSQL connection string from **Connection details**
3. Save it — you will set it as `DATABASE_URL` on the server

---

## 3. Push to GitHub

Repo: `https://github.com/botirov206/fashion-store.git`

```powershell
cd "C:\Users\Dell\Courses\2nd Semester Assignments\projects\fashion-store"
git add .
git commit -m "Your message"
git push origin main
```

Never commit `.env` — it is in `.gitignore`.

---

## 4. Server setup

```bash
ssh deploy@YOUR_SERVER_IP

sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit
```

SSH back in, then:

```bash
docker --version
docker compose version

sudo mkdir -p /var/www/fashion-store
sudo chown $USER:$USER /var/www/fashion-store
```

---

## 5. Clone and configure

```bash
cd /var/www
git clone https://github.com/botirov206/fashion-store.git
cd fashion-store

cp .env.example .env
nano .env
```

```env
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
PORT=3010
```

`PORT` is the **host** port Docker binds to (container still runs on 3000 inside). Use `3010` if another app already uses `3000`.

```bash
chmod 600 .env
```

---

## 6. Run with Docker

```bash
cd /var/www/fashion-store
docker compose -f docker-compose.prod.yml up -d --build
```

```bash
# Status
docker compose -f docker-compose.prod.yml ps

# Logs (Ctrl+C to exit)
docker compose -f docker-compose.prod.yml logs -f web

# Stop (only when you want to shut down)
docker compose -f docker-compose.prod.yml down
```

---

## 7. Verify

The app **does have a backend** — `server.js` (Express) serves the frontend and API routes (`/api/health`, `/api/products`, `/api/orders`). The container must be **running** when you test (do not run `down` first).

```bash
docker compose -f docker-compose.prod.yml ps   # STATUS should be "Up (healthy)"

curl http://127.0.0.1:3010/api/health
# {"status":"ok","database":"connected"}

curl http://127.0.0.1:3010/api/products
# JSON array of products
```

If `curl` fails with "Could not connect", check:

1. Container is up — run `up -d` again, not `down`
2. Server `.env` has `PORT=3010` and `docker compose ps` shows `127.0.0.1:3010->3000/tcp`

---

## 8. Nginx (public access)

```bash
sudo apt install -y nginx
sudo cp /var/www/fashion-store/deploy/nginx/fashion-store.conf /etc/nginx/sites-available/fashion-store
sudo nano /etc/nginx/sites-available/fashion-store   # set server_name; proxy_pass must be http://127.0.0.1:3010
sudo ln -sf /etc/nginx/sites-available/fashion-store /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

HTTPS (domain required):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 9. Deploy updates

```bash
cd /var/www/fashion-store
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 10. CI/CD (next step)

This manual flow is the base for automation:

1. **GitHub Actions** — run tests on every push to `main`
2. **Deploy job** — SSH into the VPS (or use a self-hosted runner) and run:

   ```bash
   cd /var/www/fashion-store && git pull && docker compose -f docker-compose.prod.yml up -d --build
   ```

Store server secrets in GitHub → **Settings → Secrets and variables → Actions** (`SSH_HOST`, `SSH_USER`, `SSH_KEY`, etc.).

---

## Troubleshooting

| Problem | Fix |
| ------- | --- |
| Container exits | `docker compose -f docker-compose.prod.yml logs web` — check `DATABASE_URL` in `.env` |
| curl connection refused | Container stopped (`down` was run) — run `up -d` again; confirm `PORT=3010` in `.env` |
| Nginx 502 | App not running or proxy must target `http://127.0.0.1:3010` |
| Browser unreachable | `sudo ufw status`; open 80/443 in cloud provider firewall |

---

## Quick reference

| Task | Command |
| ---- | ------- |
| First deploy | `git clone` → `.env` → `docker compose -f docker-compose.prod.yml up -d --build` |
| Update | `git pull` → `docker compose -f docker-compose.prod.yml up -d --build` |
| Health | `curl http://127.0.0.1:3010/api/health` |
