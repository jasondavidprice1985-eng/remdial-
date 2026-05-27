# Remedial Tracking System

Two-sided real-time kitchen remedial tracking app.

- **Manager PWA** — mobile field app, offline-capable, at `/`
- **Office Dashboard** — desktop kanban board at `/office/`
- **Backend** — Node.js + Express + Socket.io + PostgreSQL

---

## Deploy on a Fresh Linux VPS

### 1. Prerequisites

```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com | sh
```

### 2. Upload files

```bash
scp -r . user@YOUR_VPS_IP:/opt/remedial
```

### 3. Configure environment

```bash
cd /opt/remedial
cp .env.example .env
nano .env   # Set a strong POSTGRES_PASSWORD
```

### 4. Point your domain DNS

Set an A record for `yourdomain.com` → your VPS IP.
Then update the `Caddyfile`: replace `yourdomain.com` with your actual domain.

### 5. Build and start

```bash
cd /opt/remedial
docker compose up -d --build
```

### 6. Verify

```bash
docker compose ps          # all 5 containers healthy
docker compose logs caddy  # check TLS provisioning
```

Access:
- Manager PWA:      `https://yourdomain.com/`
- Office Dashboard: `https://yourdomain.com/office/`

---

## Local Development (no Docker)

### Backend

```bash
cd backend
npm install
# Set env vars:
export DATABASE_URL=postgres://localhost:5432/remedial_dev
export PORT=3001
export UPLOAD_DIR=./uploads
npm run dev
```

### Frontend Manager

```bash
cd frontend-manager
npm install
# Create .env (HTTPS dev — API/socket proxied through Vite):
echo "VITE_API_URL=/api/v1" > .env
echo "VITE_SOCKET_URL="       >> .env
npm run dev   # https://localhost:5173
```

For mobile/LAN testing, generate a cert that includes your machine IP:

```bash
./scripts/generate-dev-certs.sh 192.168.1.143
# Then open https://192.168.1.143:5173 on the device (accept/trust the cert once)
```

### Frontend Office

```bash
cd frontend-office
npm install
echo "VITE_API_URL=/api/v1" > .env
echo "VITE_SOCKET_URL="       >> .env
npm run dev   # https://localhost:5174
```

---

## Backup

```bash
# Add to VPS crontab (crontab -e):
0 2 * * * docker exec remedial-postgres-1 pg_dump -U remedial_user remedial | gzip > /opt/backups/remedial_$(date +\%Y\%m\%d).sql.gz
# Rotate: keep last 30 days
0 3 * * * find /opt/backups -name "remedial_*.sql.gz" -mtime +30 -delete
```

---

## Environment Variables Reference

| Variable            | Where         | Description                              |
|---------------------|---------------|------------------------------------------|
| `DATABASE_URL`      | Backend       | PostgreSQL connection string             |
| `PORT`              | Backend       | Internal port (default 3001)             |
| `NODE_ENV`          | Backend       | `production` or `development`            |
| `UPLOAD_DIR`        | Backend       | Path for uploaded files                  |
| `VITE_API_URL`      | Both frontends| REST base URL (baked in at build time)   |
| `VITE_SOCKET_URL`   | Both frontends| Socket.io server URL                     |
| `POSTGRES_DB`       | docker-compose| Database name                            |
| `POSTGRES_USER`     | docker-compose| Database user                            |
| `POSTGRES_PASSWORD` | docker-compose| Database password — **never commit**     |

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
