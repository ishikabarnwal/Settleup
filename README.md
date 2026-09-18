# SettleUp Frontend

The web app for **SettleUp**, a shared expense tracker: create groups, add expenses split equally, by exact amounts or by percentage, see who owes whom, and settle up in as few payments as possible.

It talks to [settleup-backend](https://github.com/ishikabarnwal/settleup-backend), a Spring Boot REST API.

## Stack

- React 19 + TypeScript, built with Vite
- Tailwind CSS 4, with the brand palette defined once as theme tokens
- React Router for pages, TanStack Query for server data
- React Hook Form + Zod for forms, with the same limits the backend enforces
- Vitest for unit tests, Playwright for end-to-end tests against the real API

## Getting started

You need Node 20+ and the backend running locally (see its README; by default it serves on `http://localhost:8080`).

```bash
npm install
npm run dev
```

The app runs on http://localhost:5173.

## Pointing it at a backend

| Variable | Default | What it does |
|---|---|---|
| `VITE_API_URL` | empty | Base URL of the backend. Leave empty in development. Set it for a build that talks to a deployed backend, e.g. `https://settleup-api.example.com`. |
| `VITE_DEV_PROXY_TARGET` | `http://127.0.0.1:8080` | Only used by `npm run dev` when `VITE_API_URL` is empty. |

Copy `.env.example` to `.env.local` to change them.

**Local development.** With `VITE_API_URL` empty the app calls `/api/...` on its own origin and the Vite dev server forwards those requests to `VITE_DEV_PROXY_TARGET`. The browser never makes a cross-origin request, so no CORS setup is needed.

**Deployed backend.** Build with the backend's URL baked in:

```bash
VITE_API_URL=https://settleup-api.example.com npm run build
```

The browser then calls the backend directly, so the backend has to allow this site's origin. Set `CORS_ALLOWED_ORIGINS` on the backend to include it (e.g. `https://settleup.example.com`). Vite reads `VITE_` variables at build time, so changing the URL means rebuilding.

## Scripts

| Command | |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Lint with oxlint |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) |

## Tests

Unit tests cover the money maths and the add-expense rules. The form previews each person's share before saving, using a copy of the backend's splitting rules, and the tests use the same cases as the backend's own tests so the two can't drift apart.

End-to-end tests drive the real app in Chromium, at desktop and phone sizes, against a real backend. They build the app and run it with `vite preview` on port 4173, so they test what actually ships. Start the backend first, then:

```bash
npx playwright install chromium   # once
npm run test:e2e
```

Each test registers its own throwaway users, so they don't depend on existing data. Besides the happy paths they check things like a save whose response is lost being retried without creating a duplicate (the `Idempotency-Key` at work), and that no page ends up wider than a phone screen.

## How sign-in is stored

The backend returns a JWT in the response body for use in an `Authorization` header. The token is kept in `localStorage` so a refresh doesn't sign you out. The safer option, an httpOnly cookie that scripts can't read, can only be set by the server, so it isn't available to a frontend on its own. To limit the exposure: nothing is rendered as raw HTML, there are no third-party scripts, tokens expire after 12 hours, and the app signs you out when the token expires or the backend rejects it. The full reasoning is in `src/lib/session.ts`.

## Project layout

```text
src
├── components     shared pieces: app shell, logo, and ui/ (buttons, fields, dialogs...)
├── features       one folder per area: auth, groups, expenses, settlements
├── lib            API client, session, money maths, form helpers
└── index.css      Tailwind setup and the palette
e2e                Playwright tests
```

## Design

The palette lives in `src/index.css` as Tailwind theme tokens, so components use classes like `bg-ink` or `text-rose` rather than raw hex values:

| Token | Colour | Used for |
|---|---|---|
| `ink` | `#1D1A39` | Navigation bar, headings |
| `plum` | `#451952` | Start of the button gradient, focus rings |
| `wine` | `#662549` | Middle of the gradients |
| `rose` | `#AE445A` | Links, errors, "owes" amounts |
| `apricot` | `#F39F5A` | End of the hero gradient, decorative only |
| `blush` | `#E8BCB9` | Soft highlights and tints |

The full gradient is kept for the sign-in hero and a thin line under the nav; buttons use its darker end so white text stays readable. Everything else is neutral, so the palette reads as an accent. Apricot and blush are too light for text on white, so they're only used as backgrounds or decoration.
