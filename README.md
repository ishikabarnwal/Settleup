# SettleUp

A shared expense tracker. Create groups, split expenses equally, by exact amount, or by percentage, and see the minimum set of payments needed to settle every balance.

**Live app:** https://thesettleup.vercel.app
**API:** https://settleup-api-89kg.onrender.com ([health check](https://settleup-api-89kg.onrender.com/health))

## Structure

Monorepo, two independent projects:

| Folder | Stack |
|---|---|
| [`backend/`](backend) | Java 17, Spring Boot, PostgreSQL |
| [`frontend/`](frontend) | React, TypeScript, Vite |

Full details in each folder's own README: [backend/README.md](backend/README.md), [frontend/README.md](frontend/README.md).

## Running locally

Requires Java 17+, Node 20+, and Docker.

Start the API against an in-memory database:

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

(Windows: use `mvnw.cmd`.) Serves on `http://localhost:8080`. For PostgreSQL instead, see [backend/README.md](backend/README.md#using-postgresql).

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` — the dev server proxies `/api` to port 8080, no extra config needed.

## Tests

```bash
(cd backend && ./mvnw verify)      # needs Docker (Testcontainers)
(cd frontend && npm test)          # unit
(cd frontend && npm run test:e2e)  # e2e, needs the backend running
```

## Deployment

API and database on [Render](https://render.com), frontend on [Vercel](https://vercel.com).

| | URL |
|---|---|
| Web app | https://thesettleup.vercel.app |
| API | https://settleup-api-89kg.onrender.com |
| Health check | https://settleup-api-89kg.onrender.com/health |

### Backend

[`render.yaml`](render.yaml) defines both the database (`settleup-db`) and the API (`settleup-api`) as a Render Blueprint. The API builds from [`backend/Dockerfile`](backend/Dockerfile) and runs under the `prod` profile, which reads every setting from the environment — if anything required is missing, the app refuses to start and says what's absent.

Deploy: **New → Blueprint** in Render, select this repository. When it asks for `CORS_ALLOWED_ORIGINS`, give the frontend's origin (scheme + host, no path) — `https://thesettleup.vercel.app` for the live site.

| Variable | Source |
|---|---|
| `CORS_ALLOWED_ORIGINS` | You provide this |
| `SPRING_PROFILES_ACTIVE` | `render.yaml` → `prod` |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` | `render.yaml`, from `settleup-db` |
| `JWT_SECRET` | Generated once by Render; rotating it signs everyone out |
| `API_DOCS_ENABLED` | `render.yaml` → `false`; set `true` to expose Swagger UI |
| `PORT` | Render |

The API redeploys only when `backend/` changes.

### Frontend

Import the repo in Vercel with:

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Framework | Vite (auto-detected) |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| `VITE_API_URL` | The Render API URL — `https://settleup-api-89kg.onrender.com` for the live site |

`VITE_API_URL` is baked in at build time, so changing it requires a redeploy. [`frontend/vercel.json`](frontend/vercel.json) routes all paths to the app so client-side routes survive a page reload.

### Notes

Render and Vercel each need the other's URL — deploy Render first with the expected Vercel URL, deploy Vercel, then correct `CORS_ALLOWED_ORIGINS` on Render if it differs (saving restarts the API). Vercel preview deployments get their own URLs and are blocked by CORS unless added explicitly.

Free-tier limits apply: the Render web service sleeps after ~15 minutes idle (first request after that can take up to a minute), and Render's free PostgreSQL databases expire after a fixed window — don't treat the data as permanent.

## History

Backend and frontend started as separate repositories and were merged here with full commit history intact. The old `settleup-frontend` repository is archived.
