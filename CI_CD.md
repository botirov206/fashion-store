# Fashion Store — CI/CD Setup

Auto-deploy on push to `main`. Uses the **same SSH key and secrets** as your other project on this server — no new server setup needed.

**Workflow file:** `.github/workflows/deploy.yml`  
**App path on server:** `/var/www/fashion-store`  
**Domain:** `https://fashioon.kahoot.uz`

---

## 1. Reuse existing server SSH key

Your server already has a deploy key for GitHub Actions (from the other project). **Do not create a new one.**

The `ubuntu` user's `~/.ssh/authorized_keys` already allows the Actions runner to SSH in.

---

## 2. GitHub secrets

In **fashion-store** repo → **Settings → Secrets and variables → Actions** → **New repository secret**

Use the **same values** as your other project:

| Secret | Value | Notes |
| ------ | ----- | ----- |
| `EC2_HOST` | `YOUR_SERVER_IP` | Your server public IP |
| `EC2_USER` | `ubuntu` | SSH username |
| `EC2_SSH_KEY` | *(copy from other repo)* | Full private key — same key as the other project |

Copy `EC2_SSH_KEY` from the other repo's secrets, or from your local `.pem` file if you still have it.

---

## 3. One-time server check

Before the first automated deploy, confirm manual setup is done (see `DEPLOYMENT.md`):

```bash
ssh ubuntu@YOUR_SERVER_IP

cd /var/www/fashion-store
ls -la docker-compose.prod.yml .env
docker compose -f docker-compose.prod.yml ps
curl http://127.0.0.1:3010/api/health
```

The repo must already be cloned and `.env` must exist on the server (`.env` is never deployed by CI/CD).

---

## 4. How deploy works

1. Push to `main` (or click **Actions → Deploy → Run workflow**)
2. GitHub Actions SSHs as `ubuntu`
3. `git fetch` + `git reset --hard origin/main` in `/var/www/fashion-store`
4. `docker compose -f docker-compose.prod.yml up -d --build`
5. Health check: `curl http://127.0.0.1:3010/api/health`

---

## 5. Trigger manually

Repo → **Actions** → **Deploy** → **Run workflow**

---

## Troubleshooting

| Problem | Fix |
| ------- | --- |
| SSH connection failed | Check `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY` match the other working project |
| `not a git repo` | Run `git clone https://github.com/botirov206/fashion-store.git /var/www/fashion-store` on the server |
| Health check fails | Check `.env` on server (`DATABASE_URL`, `PORT=3010`); run `docker compose -f docker-compose.prod.yml logs web` |
| Permission denied (docker) | `sudo usermod -aG docker ubuntu` then log out/in |
