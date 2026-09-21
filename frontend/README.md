# SettleUp Frontend

The web app for **SettleUp**, a shared expense tracker: create groups, add expenses split equally, by exact amounts or by percentage, see who owes whom, and settle up in as few payments as possible.

It talks to the Spring Boot REST API in [`../backend`](../backend), the other half of this monorepo. All commands below are run from this `frontend/` folder.

**Live app:** https://thesettleup.vercel.app, talking to the API at https://settleup-api-89kg.onrender.com.

## Stack

- React 19 + TypeScript, built with Vite
- Tailwind CSS 4, with the brand palette defined once as theme tokens
- React Router for pages, TanStack Query for server data
- React Hook Form + Zod for forms, with the same limits the backend enforces
- Vitest for unit tests, Playwright for end-to-end tests against the real API

## Getting started

You need Node 20+ and the backend running locally (see [`../backend/README.md`](../backend/README.md); by default it serves on `http://localhost:8080`).

```bash
npm install
npm run dev
```

The app runs on http://localhost:5173. The live version is at https://thesettleup.vercel.app.

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

**Vercel.** The live site, https://thesettleup.vercel.app, is hosted on Vercel and built with `VITE_API_URL=https://settleup-api-89kg.onrender.com`. The setup is in the [top-level README](../README.md#deployment). `vercel.json` sends every path that isn't a real file to `index.html`, so reloading a page like `/groups/12` loads the app instead of Vercel's 404.

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

## Behaviour worth knowing

- **A home page for visitors.** Signed-out visitors to `/` see what SettleUp is, with links to sign up or log in. Signed-in users get their dashboard at `/` instead and never see the landing page.
- **Works on phones.** Dialogs become bottom sheets with their buttons pinned below a scrolling body, and no page is ever wider than the screen (there's a test for it).
- **Loading, empty and error states** everywhere data is shown: skeletons while loading, a friendly message and a *Try again* button when a request fails, and a toast if a background refresh fails while older data is still on screen.
- **Undo-proof actions ask first.** Deleting an expense or a payment, removing a member and deleting a group all go through a confirmation. Removing members and deleting the group are only offered to the group's owner, matching the backend. If the backend refuses (say, removing someone who still owes money), its reason is shown in the dialog.
- **Safe to retry.** Adding an expense or recording a payment sends an `Idempotency-Key`, and the form keeps the same key until the request succeeds, so a double click or a retry after a dropped connection never creates a duplicate.
- **Keyboard friendly.** A skip link past the navigation, arrow keys for the group tabs and the split type, native dialogs that trap focus and close on Escape, and labelled fields for screen readers.
- **Doesn't fall over.** If something throws while rendering, an error screen offers a reload instead of leaving a blank page.

## How sign-in is stored

The backend returns a JWT in the response body for use in an `Authorization` header. The token is kept in `localStorage` so a refresh doesn't sign you out. The safer option, an httpOnly cookie that scripts can't read, can only be set by the server, so it isn't available to a frontend on its own. To limit the exposure: nothing is rendered as raw HTML, there are no third-party scripts, tokens expire after 12 hours, and the app signs you out when the token expires or the backend rejects it. The full reasoning is in `src/lib/session.ts`.

## Project layout

```text
src
├── components     shared pieces: app shell, logo, and ui/ (buttons, fields, dialogs...)
├── features       one folder per area: landing, auth, groups, expenses, settlements
├── lib            API client, session, money maths, form helpers
└── index.css      Tailwind setup and the palette
e2e                Playwright tests
```

## Design

Everything visual comes from tokens in `src/index.css`, so components use classes like `bg-surface`, `text-plum`, `rounded-card` or `shadow-card` rather than raw values.

**Colour roles**

| Token | Colour | Role |
|---|---|---|
| `plum` | `#451952` | Primary. The main action on light backgrounds, links, focus rings. |
| `apricot` | `#F39F5A` | Secondary. The main action on dark backgrounds, and small highlights. Plum barely shows on ink (1.2:1); apricot does (7.9:1). |
| `ink` | `#1D1A39` | Base for every dark area: nav, hero, footer. |
| `canvas` / `surface` / `sunken` | tints of `#E8BCB9` | Page background, cards and inputs, tracks. There is no pure white anywhere. |
| `rose`, green | | Money direction: rose for "owes", green for "gets back". |

The greys are the stone scale re-tinted towards blush, so every neutral in the app is on-palette. Muted text stays at 4.7:1 or better on every light background.

**Shape and depth.** One radius per kind of thing: controls (buttons, inputs, tabs) 12px, cards 20px, panels and dialogs 28px, and pills only for the nav, avatars and small chips. Cards get soft shadows instead of outlines.

**Spacing.** Paddings and gaps stay on a 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px scale, and every page shares the same width and side margins (`page-container`).

**Gradients.** Only one is left: a restrained glow in the landing page hero.

**Navigation.** One floating nav for the whole app: a frosted ink pill inside the page margins rather than a bar across the top. On the landing page its section links fold into a menu on phones.

**Landing page.** An inset ink hero with small info cards floating around a product card (each one describes that card, so the numbers are real), then a "How it works" flow: four numbered steps joined by connectors that run across on wide screens and down on phones, with one worked example carried through every step.

**Motion** is small and optional: the hero cards drift and a dot travels along each connector, and both stop for anyone who has asked their system for reduced motion.
