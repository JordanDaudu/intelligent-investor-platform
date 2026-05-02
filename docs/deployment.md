# Deployment

## Local Docker (development)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend → <http://localhost:5000> when running on Replit, or <http://localhost:5173> when running via local `docker compose up`
- Backend  → <http://localhost:8000/health>

## Staging

Recommended provider-agnostic flow:

1. Provision a small VM (e.g. DigitalOcean droplet, AWS t3.small, Hetzner CX11).
2. Install Docker + Docker Compose on the VM.
3. `git clone` this repo and create `.env.staging`.
4. `docker compose -f docker-compose.prod.yml --env-file .env.staging up -d --build`.
5. Point a DNS record at the VM and front the backend (port 8000) and frontend (port 80) with a reverse proxy (Caddy, Traefik, or nginx) that handles TLS.

The CI pipeline:

- On push to `stage`, runs the test + build matrix, then `staging-deployment` (a placeholder you wire to step 4 above), then `staging-health-check` which polls `${STAGING_API_URL}/health`.

## Production (extra credit)

Same as staging but:

- Use a managed Postgres (e.g. RDS, Cloud SQL, Neon, Supabase).
- Run multiple backend replicas behind a load balancer.
- Serve the frontend from a CDN (`vite build` outputs ready-to-host static files).
- Require code review on every PR into `main` (assignment requirement).

## Replit publish

`replit.md` documents the in-workspace setup. When the user clicks **Publish**, Replit auto-deploys the same workspace; the deployment is configured under `[deployment]` in `.replit`.

## Scaling notes

| Component  | Vertical                       | Horizontal                                                                      |
|------------|--------------------------------|---------------------------------------------------------------------------------|
| Frontend   | n/a (static)                   | CDN nodes around the world                                                      |
| Backend    | Bigger CPU/memory              | Multiple stateless replicas behind a load balancer (sticky sessions not needed) |
| Database   | Bigger Postgres instance       | Read replicas (Prisma supports a read URL); partitioning if needed              |

Health-driven orchestration (Kubernetes `livenessProbe`/`readinessProbe`, ECS health checks, Docker Swarm `healthcheck`) should target `GET /health` — it returns 200 only when the database is reachable, so failures will correctly drain unhealthy replicas.

### Capacity ballpark

A single 1-vCPU NestJS replica comfortably serves ~500 RPS of the lightweight calculation endpoint. The 15-year projection is `O(15)` and the bucket math is `O(1)`, so the bottleneck is almost always Postgres latency on the profiles CRUD — keep DB connection pool size sane (`?connection_limit=10` per replica is a good starting point).
