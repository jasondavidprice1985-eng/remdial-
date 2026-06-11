# Deploy

The live VPS runs PM2 + nginx + host PostgreSQL. There is no Docker.

## Redeploy after pushing to `main`

SSH to the VPS:

```bash
ssh -p <ssh-port> <user>@<vps-ip>
cd <deploy-path>/remedial
git pull
```

Backend (only if anything in `backend/` changed):

> **`JWT_SECRET`** must be set in `backend/.env` for auth to work. Without it, all API requests will return 401.

```bash
cd backend
npm run build
```

Manager frontend (only if `frontend-manager/` or `shared/` changed):

```bash
cd <deploy-path>/remedial/frontend-manager
npm run build      # output goes to dist/ — nginx serves it immediately
```

Office frontend (only if `frontend-office/` or `shared/` changed):

```bash
cd <deploy-path>/remedial/frontend-office
npm run build
```

After all builds complete, restart the backend:

```bash
pm2 restart remedial-backend
pm2 logs remedial-backend --lines 20 --nostream
```

> **Auth rebuild order**: Frontends now depend on backend auth. When making auth-related changes, rebuild in this order: backend build → both frontends build → backend restart.

No `npm install` is needed unless `package.json` / `package-lock.json` changed.

## After a deploy that changes UI

The PWA service worker is sticky. Tell users — or do it yourself when testing — to **Site Settings → Clear & reset** for `<domain>`. Otherwise they may continue seeing the previous build.

## First-time / post-reboot

Ensure PM2 brings the backend back up at boot:

```bash
pm2 save
pm2 startup   # follow the printed command (it'll need sudo once)
```

## Gotchas

- **Don't run `docker compose up`.** No service in production is Dockerised. The compose file in the repo is historical and not used.
- **Build needs swap.** The VPS only has 3.8 GB RAM. A 4 GB swap file at `/swapfile` is already configured in `/etc/fstab`. If you ever recreate the box, add swap first or builds will hang.
- **`/uploads/` nginx block is mandatory.** Without it, images and audio fall through to the SPA `index.html` fallback and return as `text/html`, which the browser caches as a broken image and the PWA may keep serving from cache for hours. Both site configs (`remedial-manager`, `remedial-office`) must have:
  ```nginx
  location /uploads/ { proxy_pass http://localhost:3003; }
  ```
- **PostgreSQL credentials** live in `backend/.env`, **not** at project root. Docker-compose-style `${POSTGRES_*}` env interpolation does nothing here.

