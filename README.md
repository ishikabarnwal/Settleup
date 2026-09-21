# SettleUp

A shared expense tracker: create groups, add expenses split equally, by exact amounts or by percentage, see who owes whom, and settle up in as few payments as possible.

This is a monorepo with two independent projects:

| Folder | What it is | Stack |
|---|---|---|
| [`backend/`](backend) | The REST API | Java 17, Spring Boot, PostgreSQL |
| [`frontend/`](frontend) | The web app | React, TypeScript, Vite |

Each folder has its own README with the full details: [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md).

## Running it locally

You need Java 17+, Node 20+ and Docker.

Start the API with an in-memory database (no Docker needed for this):

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

On Windows use `mvnw.cmd` instead of `./mvnw`. The API serves on `http://localhost:8080`. To run it against PostgreSQL instead, see [backend/README.md](backend/README.md#using-postgresql).

In a second terminal, start the web app:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The dev server forwards `/api` calls to the backend on port 8080, so no extra setup is needed.

## Tests

```bash
(cd backend && ./mvnw verify)      # needs Docker running (Testcontainers)
(cd frontend && npm test)          # unit tests
(cd frontend && npm run test:e2e)  # end-to-end, needs the backend running
```

## History

The two halves started out as separate repositories and were merged here with their full commit history. The old `settleup-frontend` repository is archived and read-only.
