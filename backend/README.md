# SettleUp Backend

A REST API for **splitting shared expenses and managing group balances**. Users can create groups, add expenses, track who owes whom, and record settlements.

This is the backend half of the SettleUp monorepo. The web app that uses it lives in [`../frontend`](../frontend). All commands below are run from this `backend/` folder.

## Requirements

- Java 17+
- Maven (Maven Wrapper included)
- Docker (for local PostgreSQL and for running the tests)

## Configuration

Sensitive values are provided through environment variables.

| Variable | Required | Default |
|---|---|---|
| `JWT_SECRET` | Yes* | — |
| `DB_URL` | No | `jdbc:postgresql://localhost:5432/settleup` |
| `DB_USERNAME` | No | `settleup` |
| `DB_PASSWORD` | No | `settleup` |
| `CORS_ALLOWED_ORIGINS` | No | `http://localhost:5173` |
| `API_DOCS_ENABLED` | No | `true` |

\* `JWT_SECRET` is required when running with PostgreSQL and must be at least 32 characters long.

`CORS_ALLOWED_ORIGINS` is a comma separated list of frontend origins allowed to call the API from a browser (for example `https://settleup.example.com,http://localhost:5173`). The default covers the frontend's local dev server.

Copy `.env.example` to `.env` and add your values.

## Run Locally

### Using H2

The `dev` profile uses an in-memory database, so PostgreSQL is not required.

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Windows:

```bash
mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=dev
```

API: `http://localhost:8080`

> H2 data is cleared whenever the application restarts.

### Using PostgreSQL

Start PostgreSQL with Docker:

```bash
docker compose up -d
```

Set your JWT secret and start the application:

```bash
export JWT_SECRET=your-long-random-secret
./mvnw spring-boot:run
```

Hibernate automatically manages the database schema.

## Tests

```bash
./mvnw verify
```

Tests run against a real PostgreSQL 17 database that [Testcontainers](https://testcontainers.com) starts in Docker for the run and throws away afterwards, so **Docker must be running**. Nothing needs to be set up by hand, and your `docker compose` database isn't touched.

## API Docs

Interactive docs (Swagger UI) are served at `http://localhost:8080/swagger-ui.html`, with the raw OpenAPI spec at `/v3/api-docs`. Neither needs a token. To try protected endpoints from the page, call register or login, click **Authorize** and paste the token.

Set `API_DOCS_ENABLED=false` to turn both off, for example in production.

## API Overview

All endpoints except `/health`, `/api/auth/register`, `/api/auth/login` and the API docs require:

```text
Authorization: Bearer <token>
```

### Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Login and receive a token |

### Users

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/users/me` | Get current user |

### Groups

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/groups` | Create a group |
| GET | `/api/groups` | List user's groups |
| GET | `/api/groups/{groupId}` | Get group details, including each member's role |
| DELETE | `/api/groups/{groupId}` | Delete the group and all its history (owner only) |
| POST | `/api/groups/{groupId}/members` | Add a member |
| DELETE | `/api/groups/{groupId}/members/{userId}` | Remove a member with a zero balance (owner only) |

### Expenses

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/groups/{groupId}/expenses` | Add an expense (accepts `Idempotency-Key`) |
| GET | `/api/groups/{groupId}/expenses` | List expenses, newest first |
| GET | `/api/groups/{groupId}/expenses/{expenseId}` | Get expense details |
| DELETE | `/api/groups/{groupId}/expenses/{expenseId}` | Delete an expense |

### Balances & Settlements

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/groups/{groupId}/balances` | View member balances |
| POST | `/api/groups/{groupId}/settlements` | Record a payment (accepts `Idempotency-Key`) |
| GET | `/api/groups/{groupId}/settlements` | View payment history |
| DELETE | `/api/groups/{groupId}/settlements/{settlementId}` | Delete a recorded payment |
| GET | `/api/groups/{groupId}/settlements/suggested` | Get suggested payments |

### Health and Docs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Application health check |
| GET | `/swagger-ui.html` | Interactive API docs |
| GET | `/v3/api-docs` | OpenAPI spec as JSON |

## Expense Splitting

SettleUp supports three split types:

- **EQUAL** — divides the expense equally among participants (`participantIds`, or the whole group if left out).
- **EXACT** — uses the exact amount assigned to each participant (`shares`). They must add up to the total.
- **PERCENTAGE** — gives each participant a percentage of the total (`percentages`, e.g. `[{"userId":1,"percent":60},{"userId":2,"percent":40}]`). Up to two decimal places, and they must add up to exactly 100.

All amounts are handled in **paise** to avoid rounding errors, and the shares always add up to the original expense. When a total doesn't divide cleanly (in an equal or percentage split), the leftover paise go one each to the lowest user ids, so nobody is ever more than a paisa off.

Each split type only accepts its own field; sending another type's field returns a 400.

Only group members can pay for or participate in an expense.

## Balance Calculation

A member's balance is calculated from:

```text
Amount Paid
− Expense Share
+ Settlements Paid
− Settlements Received
```

A **positive balance** means the member should receive money.  
A **negative balance** means the member owes money.

The settlement planner then matches debtors with creditors to generate a short list of payments that clears the group's balances.

## Owners and Members

Whoever creates a group is its **owner**. Group details list each member with a `role` of `OWNER` or `MEMBER`.

| Action | Owner | Member |
|---|---|---|
| View the group, balances, expenses and settlements | ✓ | ✓ |
| Add members | ✓ | ✓ |
| Add or delete expenses and settlements | ✓ | ✓ |
| Remove members | ✓ | — |
| Delete the group | ✓ | — |

A member who tries an owner-only action gets a `403` saying so. The owner can't remove themselves; they'd delete the group instead. Deleting a group permanently removes all of its expenses and settlements.

## Safe Retries (Idempotency-Key)

Creating an expense or recording a settlement can be retried safely by sending an `Idempotency-Key` header, for example a UUID generated once per action on the client:

```bash
curl -X POST http://localhost:8080/api/groups/1/settlements \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: 5f1c9a2e-7b1d-4c1e-9a53-2d7c0b6f8e10" \
  -H 'Content-Type: application/json' \
  -d '{"paidBy":2,"paidTo":1,"amount":500.00}'
```

- **Same key, same request** within 24 hours: nothing new is created. You get the original `201` response back, with an `Idempotent-Replayed: true` header.
- **Same key, different request** (a different body or a different endpoint): `409 Conflict`. Use a new key for a new request.
- **No key**: the request behaves as normal and every POST creates something.
- Keys are per user, so two people can't collide. They can be 1–255 characters.
- A request that fails (for example a 400 for bad input) doesn't use up its key, so you can fix it and retry with the same one.
- If two requests with the same key arrive at the same moment, only one expense or settlement is created and both get the same response.
- After 24 hours (`app.idempotency.window`) a key can be reused. Expired keys are cleaned up hourly.

## Deleting and Removing

Balances are never stored. They're recalculated from the remaining expenses and settlements on every request, so deleting either one can't leave them out of date.

- **Deleting an expense** is allowed at any time, even after people have settled up. Balances update straight away; if someone had already paid their share of a deleted expense, they simply show as owed that money back.
- **Deleting a settlement** undoes the payment, so whatever it covered is owed again.
- **Removing a member** only works once their balance in the group is exactly zero. Otherwise the request fails with a 400 telling you their balance, and nothing changes. Their past expenses and settlements stay in the group's history.
- Because a removed member has to leave at zero, an expense or settlement that involves someone who has left can't be deleted (400). Deleting it would give them a balance in a group they're no longer part of.

## Example

```bash
# Register
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ishika","email":"ishika@example.com","password":"secret123"}' \
  | sed -E 's/.*"token":"([^"]+)".*/\1/')

# Create a group
curl -X POST http://localhost:8080/api/groups \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Goa Trip"}'

# Add an expense
curl -X POST http://localhost:8080/api/groups/1/expenses \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"description":"Hotel","amount":3000.00,"paidBy":1,"splitType":"EQUAL"}'

# Check balances
curl http://localhost:8080/api/groups/1/balances \
  -H "Authorization: Bearer $TOKEN"
```

## Tech Stack

- **Java 17**
- **Spring Boot**
- **Spring Security + JWT**
- **PostgreSQL / H2**
- **Hibernate / JPA**
- **Maven**
- **Docker**
- **Testcontainers** (PostgreSQL in tests)
- **springdoc-openapi** (Swagger UI)

## Project Structure

The backend is organised by feature:

```text
com.ishika.settleupbackend
├── config
├── exception
├── expense
├── group
├── idempotency
├── security
├── settlement
└── user
```

## Error Handling

The API returns structured JSON errors with HTTP status, message, path, and validation errors when applicable.

## Known Limitations

- **Suggested payments aren't guaranteed to be the minimum.** The planner repeatedly matches the biggest debtor with the biggest creditor. That never needs more than one payment fewer than there are people with a balance, and is optimal unless some smaller group within them happens to cancel out on its own, but finding the true minimum in every case is NP-hard.
- **No database migrations.** Hibernate creates and updates the schema (`ddl-auto=update`). It adds new tables and columns but won't change existing constraints or column types, and adding a required column to a table that already has rows would fail. The one case that has come up so far, the allowed `splitType` values, is corrected automatically on startup. Anything beyond that needs a manual step until proper migrations (e.g. Flyway) are added.
- **Expenses can't be edited**, only deleted and added again.
- **Any member can delete any expense or settlement**, not just the person who added it.
- **Ownership can't be transferred**, and members can't leave a group themselves. Only the owner can remove them, and the owner can't leave at all (only delete the group).
- **Deleting a group is permanent** and is allowed even while people still owe each other.
- **Idempotency keys only cover creating expenses and settlements**, not other POSTs. A retry is only treated as the same request if the values are the same as written: an amount of `100` and `100.00` count as different requests.
- **Single currency.** Amounts are stored with two decimal places (rupees and paise).
- **No pagination.** List endpoints return everything in the group.

## Notes

- JWT tokens expire after 12 hours.
- PostgreSQL data persists through a Docker volume.
- H2 is only used by the `dev` profile for quick local runs; the test suite uses PostgreSQL.
