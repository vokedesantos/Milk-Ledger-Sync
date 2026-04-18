# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Milk Collection System

A mobile-first Progressive Web App (PWA) for dairy farmers and milk vendors.

### Features
- **Sign-up / Login** with session-based auth (crypto/scrypt hashing, express-session)
- **Farmer side**: record milk purchases with auto-calculated totals + SMS option
- **Customer side**: record milk sales with auto-calculated totals + SMS option
- **Dashboard**: totals, net balance, recent activity
- **Records**: filterable list with PDF export (jsPDF + jspdf-autotable)
- **Offline-first**: IndexedDB (idb) storage, auto-sync when back online
- **PWA**: installable, service worker, web manifest

### Routes
- `GET/POST /api/auth/register` — user registration
- `GET/POST /api/auth/login` — user login
- `POST /api/auth/logout` — logout
- `GET /api/auth/me` — current user
- `GET/POST /api/records` — list/create records
- `GET/DELETE /api/records/:id` — get/delete a record
- `POST /api/sync` — sync offline records to server
- `GET /api/dashboard/stats` — dashboard totals
- `GET /api/dashboard/recent` — recent activity

### DB Tables
- `users` — id, username, password_hash, created_at
- `records` — id, user_id, type (farmer|customer), person_name, date, amount_litres, price_per_litre, total_price, local_id, synced, created_at

### Frontend Stack
- React + Vite + Wouter routing
- TailwindCSS (warm greens/ambers theme)
- IndexedDB via `idb` library
- PDF export via `jspdf` + `jspdf-autotable`
- SMS via `sms:` URI scheme
- PWA: `public/manifest.json` + `public/sw.js`
