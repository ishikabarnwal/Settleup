# SettleUp Backend

A REST API for splitting shared expenses within a group and working out who owes whom.
Groups have members, members add expenses that get split between them, and the API keeps
track of everyone's balance and the payments made to square up.

## Requirements

- Java 17 or newer
- Maven (the wrapper `mvnw` / `mvnw.cmd` is included, so no separate install needed)
- Docker, only if you want to run against Postgres locally

## Configuration

Everything sensitive is read from environment variables. `application.properties` only holds
placeholders with local defaults, so nothing real is committed.

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `JWT_SECRET` | yes | none | Signing key for tokens. Must be at least 32 characters or the app refuses to start. |
| `DB_URL` | no | `jdbc:postgresql://localhost:5432/settleup` | JDBC URL. |
| `DB_USERNAME` | no | `settleup` | Database user. |
| `DB_PASSWORD` | no | `settleup` | Database password. Matches the default in `docker-compose.yml`. |

Copy `.env.example` to `.env` for your own values. `.env` is gitignored.

Tokens are valid for 12 hours (`app.jwt.expiration`) and are issued by `settleup`
(`app.jwt.issuer`). Change either in `application.properties` if you need to.

## Running locally with H2

The `dev` profile uses an in-memory H2 database, so you don't need Postgres to get started.
It ships with a throwaway signing key, so `JWT_SECRET` is optional here.

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

On Windows use `mvnw.cmd` instead of `./mvnw`.

The API comes up on http://localhost:8080. The database is wiped every restart.

## Running with Postgres

Start the database:

```bash
docker compose up -d
```

That brings up Postgres 17 on port 5432 with the database, user and password all set to
`settleup`, and keeps the data in a named volume between restarts.

Then run the app with a signing key:

```bash
export JWT_SECRET=some-long-random-string-at-least-32-chars
./mvnw spring-boot:run
```

The schema is created and updated by Hibernate (`spring.jpa.hibernate.ddl-auto=update`),
so there is no migration step to run.

To stop the database, `docker compose down`, or `docker compose down -v` to throw the data
away as well.

## Tests

```bash
./mvnw verify
```

Tests run against in-memory H2 and don't need Postgres or Docker.

## API

Every endpoint except `/health`, `/api/auth/register` and `/api/auth/login` needs a bearer
token:

```
Authorization: Bearer <token>
```

Both auth endpoints return a token, so register or log in first and reuse it.

### Auth

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account and get a token back. |
| POST | `/api/auth/login` | Sign in with email and password, returns a token. |

### Users

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/users/me` | The signed-in user's own profile. |

### Groups

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/groups` | Create a group. The creator is added as the first member. |
| GET | `/api/groups` | Every group the caller belongs to. |
| GET | `/api/groups/{groupId}` | Group details, including the member list. |
| POST | `/api/groups/{groupId}/members` | Add an existing user to the group by email. |

### Expenses

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/groups/{groupId}/expenses` | Add an expense and split it between members. |
| GET | `/api/groups/{groupId}/expenses` | All expenses in the group, newest first. |
| GET | `/api/groups/{groupId}/expenses/{expenseId}` | A single expense with its shares. |

### Balances and settlements

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/groups/{groupId}/balances` | Each member's net position in the group. |
| POST | `/api/groups/{groupId}/settlements` | Record a payment from one member to another. |
| GET | `/api/groups/{groupId}/settlements` | Payment history for the group. |
| GET | `/api/groups/{groupId}/settlements/suggested` | Shortest set of payments that clears the group. |

### Health

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Liveness check, no auth needed. |

## Splitting rules

An expense is either an `EQUAL` or an `EXACT` split.

`EQUAL` divides the total between the participants, defaulting to everyone in the group when
`participantIds` is left out. Amounts are divided in paise rather than as decimals, and when
the total doesn't divide cleanly the leftover paise are handed out one each to the lowest
user ids. Nobody ever pays more than a paisa above anyone else, and the shares always add
back up to the original amount.

`EXACT` takes a share per person in `shares` and rejects the request if they don't add up to
the total.

The payer and everyone in the split have to be members of the group.

A member's net balance is what they paid for expenses, minus their share of every expense,
plus settlements they have paid, minus settlements they have received. A positive net means
the group owes them; a negative net means they owe the group. The nets across a group always
add up to zero.

`/settlements/suggested` turns those balances into a short list of payments by repeatedly
matching the largest debtor against the largest creditor. That settles at least one person
per payment, so it never needs more than one payment fewer than there are people. It is not
guaranteed to be the theoretical minimum for every possible set of balances, but it is
optimal unless some subgroup happens to cancel out on its own.

## Example

```bash
# register and keep the token
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ishika","email":"ishika@example.com","password":"secret123"}' \
  | sed -E 's/.*"token":"([^"]+)".*/\1/')

# create a group
curl -s -X POST http://localhost:8080/api/groups \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Goa Trip"}'

# add an expense split evenly across the group
curl -s -X POST http://localhost:8080/api/groups/1/expenses \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"description":"Hotel","amount":3000.00,"paidBy":1,"splitType":"EQUAL"}'

# see where everyone stands
curl -s http://localhost:8080/api/groups/1/balances -H "Authorization: Bearer $TOKEN"
```

## Errors

Errors come back as JSON rather than a stack trace:

```json
{
  "timestamp": "2026-01-01T12:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "path": "/api/auth/register",
  "fieldErrors": {
    "email": "email must be a valid address"
  }
}
```

`fieldErrors` is only present when request validation fails.

## Layout

Code is grouped by feature rather than by layer:

```
com.ishika.settleupbackend
├── config       security wiring and JWT beans
├── exception    error types and the global handler
├── expense      expenses, shares and the splitting maths
├── group        groups and membership
├── security     tokens, login and registration
├── settlement   balances, payments and the settlement planner
└── user         the user entity and lookups
```
