# Remedial Tracking System

Two-sided real-time kitchen remedial tracking app.

- **Manager PWA** — mobile field app, offline-capable, at `manager.<domain>`
- **Office Dashboard** — desktop kanban board at `<domain>` / `<domain>/office`
- **Backend** — Node.js + Express + Socket.io + PostgreSQL

---

## Production Deployment (current)

The live stack on the VPS:

| Piece         | How it runs           | Notes                                          |
|---------------|-----------------------|------------------------------------------------|
| PostgreSQL    | systemd (host)        | Database lives in the host's pg cluster        |
| Backend       | PM2 (`remedial-backend`) | `node backend/dist/index.js`, port `3003`   |
| Frontends     | nginx (static)        | Sites `remedial-manager` + `remedial-office`   |
| TLS           | nginx + certbot       | Wildcard cert on `system22.xyz`                |

### Why no Docker?
We started Docker-first but PostgreSQL was already on the host and rebuilding three images on a 4 GB VPS was too slow. PM2 + nginx is simpler and lighter.
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
PENDING → QUERY    (office clicks Needs Clarification, OR manager queries an ordered ticket)
QUERY   → PENDING  (office Mark Clarified — when no SAP order was previously submitted)
QUERY   → ORDERED  (office Mark Clarified — when SAP order was previously submitted)
PENDING → ORDERED  (office submits PO + delivery date + SAP ordered_items)
ORDERED → ARCHIVED (manager taps Confirm Order — the SAP items look right)
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

- **PWA service worker caches API responses.** After a deploy that changes URLs, clients may need to clear site data (Chrome: Site Settings → Clear & reset) before they see new behaviour.
- **Builds on the production VPS need swap.** 3.8 GB RAM is not enough for parallel vite builds; a 4 GB swap file is configured on the live box.
- **No pagination** on `GET /tickets` — fine for current volume but will need limit/offset if ticket count grows into the thousands.
- **No structured logging** — still using `console.log`; a library like pino would make production debugging easier.
- **No audit trail** — status changes aren't logged with who/when; worth adding for dispute resolution.
- **No CI pipeline pushed** — a GitHub Actions workflow exists locally but requires a token with `workflow` scope to push.
- **No date change feature** — office team cannot change delivery dates from within the app yet; still done via email.
- **Shared user accounts** — only two accounts (manager/office) exist. Individual user accounts needed for proper audit trails and access revocation.
- **No token revocation** — JWTs cannot be invalidated before expiry. A stolen token stays valid for up to 30 days (remember me). Needs a token blacklist or server-side sessions.
- **No Content-Security-Policy** — Helmet is enabled but CSP is not configured. Should be added to prevent XSS escalation.
- **No password change mechanism** — credentials can only be changed via environment variables and server restart.
- **Uploads not access-scoped** — any authenticated user can access any uploaded image if they guess the filename.

---

## Security Hardening (June 2026)

The following changes were applied to improve production security:

| Change | What it does |
|--------|-------------|
| **Role-based authorization** | Routes now check `req.user.role` — office users can only accept/order/clarify, managers can only archive. Previously any authenticated user could call any endpoint. |
| **UUID validation middleware** | All `:id` route params are validated as proper UUIDs before reaching the database. Invalid IDs return 400 instead of crashing. |
| **SQL injection fix** | The `/clarified` endpoint had a status value string-interpolated into SQL. Now uses a parameterized `$2` placeholder. |
| **Health check endpoint** | `GET /api/health` — checks database connectivity and returns server uptime. Use for monitoring. |
| **Global error handler** | A catch-all Express error handler prevents unhandled exceptions from crashing the process. |
| **Default password guard** | In production (`NODE_ENV=production`), the app refuses to start if `MANAGER_PASSWORD` or `OFFICE_PASSWORD` are still set to defaults, or if `JWT_SECRET` is missing. |
| **Body size limit reduced** | JSON body limit lowered from 50MB to 10MB to reduce abuse risk. |
| **CORS lockdown** | Wildcard `*` CORS origin is blocked in production. Set `CORS_ORIGIN` to your actual domains. |
| **Header border removed** | Removed the thin blue border line from the enterprise header for a cleaner look. |
| **Offline submit fix** | Added a 15-second hard timeout so the submit spinner never gets stuck. Sync waits 3 seconds for socket reconnection before retrying. |
| **Pending reports banner** | Reports tab now shows a visible banner when reports are saved offline waiting to sync — "1 report saved offline — will sync when signal returns". |
| **Login rate limiting** | Login endpoint limited to 5 attempts per minute per IP to prevent brute-force attacks. |
| **Socket role enforcement** | Socket `client:identify` now uses the verified JWT role instead of trusting the client. `ticket:submit` is restricted to manager role only. |
| **JWT secret validation** | Production startup now requires JWT_SECRET to be at least 32 characters long. |
| **Image file validation** | Uploaded images are validated by checking file magic bytes — only JPEG, PNG, and WebP are accepted. Prevents uploading malicious files disguised as images. |
| **Socket UUID validation** | The `ticket:join` socket event now validates the ticketId is a proper UUID before joining a room. |

---

## Test Suite

49 unit tests using **vitest**, located in `backend/src/__tests__/`:

| File | Tests | What it covers |
|------|-------|----------------|
| `validatePayload.test.ts` | 20 | All field validations, all five reasons, line items vs legacy format, image limits, delivery request types |
| `rowToTicket.test.ts` | 12 | Database row to Ticket object conversion, type coercion, null handling, JSON parsing, date formatting |
| `sanitise.test.ts` | 8 | XSS stripping (script tags, event handlers), plain text passthrough, object sanitisation |
| `auth.test.ts` | 9 | Role-based access (allow/deny), UUID validation (valid, invalid, edge cases) |

Run with:

```bash
cd backend
npm test
```
