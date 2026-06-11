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

| Variable             | Where         | Description                                        |
|---------------------|---------------|----------------------------------------------------|
| `DATABASE_URL`      | backend       | `postgres://user:pass@host:5432/db`                |
| `PORT`              | backend       | Internal port (prod: `3003`)                       |
| `JWT_SECRET`        | backend       | Long random string. **Never commit.**              |
| `UPLOAD_DIR`        | backend       | Absolute path to uploads directory                 |
| `NODE_ENV`          | backend       | `production` or `development`                      |
| `ADMIN_USERNAME`    | backend       | First admin username (default: `admin`)            |
| `ADMIN_PASSWORD`    | backend       | First admin password (prod: **must be overridden**) |
| `ADMIN_DISPLAY_NAME`| backend       | First admin display name (default: `Administrator`)|
| `LOG_LEVEL`         | backend       | Pino log level — `debug`, `info`, `warn`, `error`  |
| `VITE_API_URL`      | both frontends| REST base URL, baked at build (`/api/v1`)          |
| `VITE_SOCKET_URL`   | both frontends| Socket.io URL — empty string for same-origin       |

---

## State Machine

```
PENDING → QUERY    (office clicks Needs Clarification, OR manager sends message with is_query flag)
QUERY   → PENDING  (office Mark Clarified — when no SAP order was previously submitted)
QUERY   → ORDERED  (office Mark Clarified — when SAP order was previously submitted)
PENDING → ORDERED  (office submits PO + delivery date + SAP ordered_items)
ORDERED → ARCHIVED (manager taps Confirm Order — the SAP items look right)
```

**Query via messages:** A manager can raise a query by sending a message with `is_query: true`. This only works on tickets in `pending` or `ordered` status, and only for manager-role tokens. Archived tickets ignore the `is_query` flag (message is saved, status unchanged).

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
- **No date change feature** — office team cannot change delivery dates from within the app yet; still done via email.
- **No audit trail frontend** — audit logs are stored in the database but no UI yet to view the history of a ticket.
- **No Forecast Dashboard** — planned feature to show upcoming deliveries grouped by site from the daily SAP forecast report.
- **No Delivery Report Diff** — planned feature to compare daily delivery reports and show changes.

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
| **Default password guard** | In production (`NODE_ENV=production`), the app refuses to start if `ADMIN_PASSWORD` is still the default, or if `JWT_SECRET` is missing. |
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
| **Product typeahead search** | New `products` table with 5,122 SAP material codes and descriptions. Search endpoint (`GET /api/v1/products/search?q=`) for typeahead. Self-learning endpoint (`POST /api/v1/products/learn`) auto-saves new products from real orders. Import script for seeding from RAFT export. |
| **Message sender from JWT** | Message sender is now derived from the JWT token role, not from the request body. Previously any authenticated user could forge messages as the other role. |
| **is_query state guard** | The `is_query` flag on messages only transitions tickets in `pending` or `ordered` status, and only for manager-role tokens. Archived tickets are protected. |
| **Ticket creation restricted** | `POST /tickets` now requires `requireRole('manager')`. Office tokens cannot create tickets via REST API. |
| **Viewer from JWT** | The read-receipt viewer is derived from the JWT role, not a query parameter. Previously either side could spoof the other's perspective. |
| **Signed upload URLs** | All upload paths are signed with an HMAC-SHA256 token and 24-hour expiry. Unsigned or expired URLs return 403. |
| **Account number preservation** | Location account numbers are no longer overwritten with empty strings when a ticket is submitted without an account number. |
| **Ticket creation transaction** | Ticket creation is now wrapped in a BEGIN/COMMIT/ROLLBACK transaction. A failure mid-insertion no longer leaves orphaned tickets. |
| **Delivery date validation** | Invalid calendar dates (e.g., `2026-13-45`) now return a clean 400 error instead of a 500 server error. |
| **Product input guards** | Product SAP codes are capped at 50 characters and descriptions at 500 characters to prevent database errors. |
| **Audit log FK change** | The audit_log foreign key changed from `ON DELETE CASCADE` to `ON DELETE SET NULL`, so audit records survive ticket deletion. Added `ticket_ref` for identification. |
| **Individual user accounts** | Replaced shared manager/office accounts with individual user accounts. Admin can create users, deactivate accounts, and users can self-service change their passwords. Deactivated users cannot log in. |
| **Content-Security-Policy** | Helmet is now configured with explicit CSP directives (default-src: 'self', img-src: 'self' data:, etc.). |
| **Token versioning** | Each user has a `token_version` counter in the database, included in the JWT. `requireAuth` checks the version on every request. Bumping the version instantly invalidates all existing tokens. |
| **Remember-me reduced** | The "remember me" JWT expiry reduced from 30 days to 7 days. |
| **Socket.io CORS lockdown** | Socket.io now uses the same resolved origin as Express — wildcard is blocked in production. |
| **Structured logging** | Replaced `console.log`/`console.error` with pino for structured, level-based logging. Message text is redacted in production for privacy. |
| **CI security audit** | `npm audit --audit-level=high` runs in CI to catch vulnerable dependencies. |
| **E2E tests in CI** | Playwright lifecycle tests run against a PostgreSQL service container on every push/PR. |
| **Pagination** | `GET /tickets` now supports `limit` (max 100, default 50) and `offset` query parameters. |
| **Partial index for unread counts** | Added partial index `idx_messages_unread` on `messages(ticket_id, sender) WHERE read_at IS NULL` for faster unread count queries. |
| **Updated_at trigger** | PostgreSQL `BEFORE UPDATE` trigger on `tickets` ensures `updated_at` is always set, even if a query forgets to update it.)

---

## Test Suite

110 unit tests using **vitest**, located in `backend/src/__tests__/`:

| Test File | Tests | What it covers |
|-----------|-------|----------------|
| `validatePayload.test.ts` | 20 | All field validations, all five reasons, line items vs legacy format, image limits, delivery request types |
| `rowToTicket.test.ts` | 12 | Database row to Ticket object conversion, type coercion, null handling, JSON parsing, date formatting |
| `sanitise.test.ts` | 8 | XSS stripping (script tags, event handlers), plain text passthrough, object sanitisation |
| `auth.test.ts` | 7 | Role-based access (allow/deny), UUID validation (valid, invalid, edge cases) |
| `products.test.ts` | 8 | Product search (short query, valid query, DB error), learn endpoint (new products, empty/missing items, skip invalid) |
| `authService.test.ts` | 8 | Login (valid/invalid credentials, inactive user, remember me, must_change_password), default user seeding |
| `media.test.ts` | 14 | Image saving/rejection, audio format validation, MIME type mapping |
| `ticketRef.test.ts` | 6 | Ticket reference generation, format, collision retry, max attempts |
| `rateLimiter.test.ts` | 5 | Rate limiter exports and configuration |
| `ticketHelpers.test.ts` | 13 | Payload validation and row conversion helpers |
| `messageFormat.test.ts` | 9 | Shared message formatting utilities |

Plus integration tests in `backend/src/__tests__/integration/` (require PostgreSQL) and E2E tests in `e2e/tests/` (run via Playwright).

Run with:

```bash
cd backend
npm test
```
