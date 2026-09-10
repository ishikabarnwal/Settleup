# SettleUp Backend

A REST API for **splitting shared expenses and managing group balances**. Users can create groups, add expenses, track who owes whom, and record settlements.

## Requirements

- Java 17+
- Maven (Maven Wrapper included)
- Docker (only required for local PostgreSQL)

## Configuration

Sensitive values are provided through environment variables.

| Variable | Required | Default |
|---|---|---|
| `JWT_SECRET` | Yes* | — |
| `DB_URL` | No | `jdbc:postgresql://localhost:5432/settleup` |
| `DB_USERNAME` | No | `settleup` |
| `DB_PASSWORD` | No | `settleup` |

\* `JWT_SECRET` is required when running with PostgreSQL and must be at least 32 characters long.

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

Tests use H2 and do not require Docker or PostgreSQL.

## API Overview

All endpoints except `/health`, `/api/auth/register`, and `/api/auth/login` require:

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
| GET | `/api/groups/{groupId}` | Get group details |
| POST | `/api/groups/{groupId}/members` | Add a member |

### Expenses

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/groups/{groupId}/expenses` | Add an expense |
| GET | `/api/groups/{groupId}/expenses` | List expenses |
| GET | `/api/groups/{groupId}/expenses/{expenseId}` | Get expense details |

### Balances & Settlements

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/groups/{groupId}/balances` | View member balances |
| POST | `/api/groups/{groupId}/settlements` | Record a payment |
| GET | `/api/groups/{groupId}/settlements` | View payment history |
| GET | `/api/groups/{groupId}/settlements/suggested` | Get suggested payments |

### Health

`GET /health` — application health check.

## Expense Splitting

SettleUp supports two split types:

- **EQUAL** — divides the expense equally among participants.
- **EXACT** — uses the exact amount assigned to each participant.

All amounts are handled in **paise** to avoid rounding errors, and the shares always add up to the original expense.

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

## Project Structure

The backend is organised by feature:

```text
com.ishika.settleupbackend
├── config
├── exception
├── expense
├── group
├── security
├── settlement
└── user
```

## Error Handling

The API returns structured JSON errors with HTTP status, message, path, and validation errors when applicable.

## Notes

- JWT tokens expire after 12 hours.
- PostgreSQL data persists through a Docker volume.
- H2 is intended for quick local development and testing.
