# Remedial Tracking System

Two-sided real-time kitchen remedial tracking app.

- **Manager PWA** — mobile field app, offline-capable, at `manager.<domain>`
- **Office Dashboard** — desktop kanban board at `<domain>` / `<domain>/office`
- **Backend** — Node.js + Express + Socket.io + PostgreSQL

---

## Production Deployment (current)

This project does **not** run on Docker in production despite a `docker-compose.yml` being present in the repo. The actual live stack on the VPS is:

| Piece         | How it runs           | Notes                                          |
|---------------|-----------------------|------------------------------------------------|
| PostgreSQL    | systemd (host)        | Database lives in the host's pg cluster        |
| Backend       | PM2 (`remedial-backend`) | `node backend/dist/index.js`, port `3003`   |
| Frontends     | nginx (static)        | Sites `remedial-manager` + `remedial-office`   |
| TLS           | nginx + certbot       | Wildcard cert on `system22.xyz`                |

### Why no Docker?
We started Docker-first and switched. PostgreSQL was already on the host (other apps use it), and rebuilding all three images on a 4 GB VPS was too slow. PM2 + nginx is simpler and lighter for this stack.

The `docker-compose.yml` and `Caddyfile` in the repo are **historical** — they describe an alternative deployment that has never been used in this environment. Either delete them or keep them clearly marked as reference only.

### nginx config — required location blocks

Both sites (`/etc/nginx/sites-available/remedial-manager` and `…/remedial-office`) need three proxy locations to the backend, plus the static root:

```nginx
location /api/      { proxy_pass http://localhost:3003; ... }
location /socket.io/ { proxy_pass http://localhost:3003; ... }
location /uploads/  { proxy_pass http://localhost:3003; }
location / {
    root /home/<user>/remedial/frontend-{manager|office}/dist;
    try_files $uri $uri/ /index.html;
}
```

The `/uploads/` block is mandatory — without it, image and audio attachments return the SPA `index.html` instead of the file.

### Redeploy

See [DEPLOY.md](./DEPLOY.md).

---

## Local Development

Backend:

```bash
cd backend
npm install
export DATABASE_URL=postgres://localhost:5432/remedial_dev
export PORT=3001
export UPLOAD_DIR=./uploads
npm run dev
```

Frontend manager / office:

```bash
cd frontend-{manager|office}
npm install
echo "VITE_API_URL=/api/v1" > .env
echo "VITE_SOCKET_URL="    >> .env
npm run dev   # https://localhost:5173 (manager) / 5174 (office)
```

For mobile/LAN testing of the manager:

```bash
./scripts/generate-dev-certs.sh 192.168.1.143
# open https://192.168.1.143:5173 on the device (accept the cert once)
```

---

## Environment Variables

Per-service `.env` files at `backend/.env`, `frontend-manager/.env`, `frontend-office/.env`. Not at project root.

| Variable          | Where         | Description                                        |
|-------------------|---------------|----------------------------------------------------|
| `DATABASE_URL`    | backend       | `postgres://user:pass@host:5432/db`                |
| `PORT`            | backend       | Internal port (prod: `3003`)                       |
| `JWT_SECRET`      | backend       | Long random string. **Never commit.**              |
| `UPLOAD_DIR`      | backend       | Absolute path to uploads directory                 |
| `NODE_ENV`        | backend       | `production` or `development`                      |
| `VITE_API_URL`    | both frontends| REST base URL, baked at build (`/api/v1`)          |
| `VITE_SOCKET_URL` | both frontends| Socket.io URL — empty string for same-origin       |

---

## State Machine

```
PENDING → QUERY    (office sends message with is_query=true)
QUERY   → PENDING  (office clicks Mark Clarified)
PENDING → ORDERED  (office submits PO + delivery date)
QUERY   → ORDERED  (office submits PO + delivery date)
ORDERED → ARCHIVED (manager taps Confirm Fitted)
```

Invalid transitions return HTTP 409.

---

## Backup

Postgres is on the host, so use a host `pg_dump`:

```cron
0 2 * * * PGPASSWORD='...' pg_dump -U remedial -h localhost remedial | gzip > /home/<user>/backups/remedial_$(date +\%Y\%m\%d).sql.gz
0 3 * * * find /home/<user>/backups -name 'remedial_*.sql.gz' -mtime +30 -delete
```

---

## Known limitations / deferred work

- **Test infrastructure** (vitest + tests + CI workflows) exists locally but is not yet pushed — separate change from the feature work.
- **PWA service worker caches API responses.** After a deploy that changes URLs, clients may need to clear site data (Chrome: Site Settings → Clear & reset) before they see new behaviour.
- **Builds on the production VPS need swap.** 3.8 GB RAM is not enough for parallel vite builds; a 4 GB swap file is configured on the live box.
