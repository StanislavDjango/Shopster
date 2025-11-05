# Deployment Notes

## Infrastructure Overview

- **Backend**: Django 5 + Gunicorn container `web` (`stanyslav/vebsaythub:latest`).
- **Frontend**: Next.js 15 container `frontend` (`stanyslav/vebsayt-frontend:latest`).
- **Database**: PostgreSQL 16 (`postgres:16-alpine`) exposed on host port `5433`.
- **Cache**: Redis 7 (`redis:7-alpine`) exposed on host port `6379`.
- **Compose file on server**: `/srv/vebsayt/docker-compose.yml`.
- **Volumes**:
  - `postgres_data` — Postgres data files.
  - `static_volume` — Django collected static files.
  - `media_volume` — Django media uploads.

## Environment Files (Server)

- `/srv/vebsayt/.env` — Django/backend configuration (database creds, JWT settings, Sentry, etc.).
- `/srv/vebsayt/.env.local.frontend` — Next.js configuration (API URL, Algolia keys, NextAuth secret).

> Store `.env` files securely on the server — do not commit them to Git.

## Docker Workflow

### 1. Local Build
```bash
docker compose -f deploy/docker-compose.yml build        # build backend + frontend production images
docker images                                            # verify local images
```

### 2. Publish to Docker Hub
```bash
docker login

# Backend image
docker tag deploy-web:latest stanyslav/vebsaythub:latest
docker push stanyslav/vebsaythub:latest

# Frontend image
docker tag deploy-frontend:latest stanyslav/vebsayt-frontend:latest
docker push stanyslav/vebsayt-frontend:latest
```

> Releases can also be triggered via GitHub Actions (`docker-build.yml`) once Docker Hub credentials are configured.

### 3. Update on the Server
```bash
ssh root@<SERVER_IP>
cd /srv/vebsayt
docker compose pull            # fetch latest images
docker compose up -d           # restart containers in the background
docker compose ps              # confirm all services are running
```

### Useful Commands
```bash
docker compose logs web | tail -n 50        # Django logs
docker compose logs frontend | tail -n 50   # Next.js logs

docker compose restart web                  # restart backend
docker compose restart frontend             # restart frontend

docker compose exec web bash                # shell inside backend container
docker compose exec db psql -U POSTGRES shop
```

## Database Backup & Restore

### Export Local Database
```bash
cmd /c "docker compose exec -T db pg_dump -U POSTGRES --encoding UTF8 shop > dump_local.sql"
```

### Import on Server
```bash
scp dump_local.sql root@<SERVER_IP>:/srv/vebsayt/dump_local.sql
ssh root@<SERVER_IP>
cd /srv/vebsayt
docker compose stop web
docker compose exec -T db psql -U POSTGRES postgres -c 'DROP DATABASE IF EXISTS shop;'
docker compose exec -T db psql -U POSTGRES postgres -c 'CREATE DATABASE shop OWNER "POSTGRES";'
docker compose exec -T db psql -U POSTGRES shop < dump_local.sql
docker compose start web
```

## Post-Deployment Checks

- Backend: `http://<SERVER_IP>:8000/` (admin at `/admin/`).
- Frontend: `http://<SERVER_IP>:3000/` (catalog `/products`, blog `/blog`, search, checkout).
- Swagger/Docs: `http://<SERVER_IP>:8000/api/docs/`.
- Algolia autocomplete: ensure `NEXT_PUBLIC_ALGOLIA_*` env variables in `.env.local.frontend` are set to production values.

## Key Files

- `deploy/docker-compose.yml` — production docker-compose configuration.
- `frontend/Dockerfile.prod` — Next.js production Dockerfile.
- `deploy/.env.prod`, `deploy/.env.local.prod` — example environment templates for server use.
- `docs/deployment-notes.md` — this document; keep it updated with operational changes.

