# Everstride — Project Context

> **You are in the `open-wearables` fork — the data backend for Everstride.**
> This is a fork of the open-source Open Wearables platform, used as Everstride's wearable
> data layer (OAuth, sync, storage, API). This file is a self-contained overview of the whole
> Everstride system. Upstream docs are in `README.md` / `AGENTS.md`. Full founder-level docs
> live in a private Obsidian vault (not in git).

## What Everstride is

A coach-first athlete intelligence platform for endurance coaches. It aggregates wearable data — **recovery** (WHOOP: HRV, sleep, resting HR, recovery score) and **activities** (Strava: rides/runs/workouts) — via this backend into a single coaching dashboard. Coaches see their whole team's readiness and training at a glance.

## The three repos and how they connect

| Repo | What it is | Stack | Live URL |
|------|-----------|-------|----------|
| **Everstride-notion** | Coach frontend + dashboard | Next.js 14, TypeScript, Tailwind, Supabase | `app.everstride.fit` |
| **open-wearables** (this) | Data backend: wearable OAuth, sync, storage, API | FastAPI/Python, Celery + Redis, Postgres | `backend-production-412a.up.railway.app` |
| **seasonal-planner** | Periodized season-plan tool | Flask/Python + HTML/JS, Supabase | `planner.everstride.fit` |

The OW frontend (athlete pairing) is served at `connect.everstride.fit`.

**Data flow:** Athlete connects a wearable at `connect.everstride.fit/users/<id>/pair` → this backend runs the OAuth, stores tokens, and syncs data → the Everstride frontend reads it from this backend's API and renders the coach dashboard.

## This repo — Everstride-specific notes

- It's a **fork**; push with `git push paul main` (the Everstride remote is named `paul`).
- **Sync** = Celery `beat` (scheduler) + `worker` + `Redis` (broker). All three must run or nobody syncs. Interval is `sync_interval_seconds` (currently 10h). Only connections with status `ACTIVE` are synced. Worker concurrency is 4.
- **OAuth `redirect_uri`** is validated against `oauth_allowed_redirect_hosts` (in `app/config.py`) — an allowlist to prevent open redirects.
- **Strava** is fully wired (OAuth, activity import, webhooks). Webhook path is `/api/v1/strava/webhooks/webhook` (NOT `/api/v1/strava/webhook` as the public docs say). Workouts are exposed at `GET /api/v1/users/{id}/events/workouts`.
- Admin seed (`admin@admin.com` / default password) is created if `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars are unset — they ARE set in production.
- API auth: `X-Open-Wearables-API-Key` header (single global key).

## Security model (important)

The Everstride frontend and planner use the Supabase **service-role** client, which bypasses row-level security, so they verify ownership in application code. On this backend: keep `CORS_ALLOW_ALL=false` in prod, keep the redirect allowlist, and never commit real secrets (config is env-var driven).

## Infrastructure / operations

- Hosted on **Railway**. The backend still runs on the Railway URL (`backend-production-412a.up.railway.app`); a custom `api.everstride.fit` was attempted but is unfinished (wrong target port + no TLS cert).
- If sync stops for everyone, check Redis first (a Redis outage once caused a month of no sync). Railway's ~500 logs/sec limit is usually a symptom of a retry storm, not a separate issue.

## Current open action items (as of 2026-07-03)

1. **Set `PLANNER_SHARED_SECRET`** (same value) on both the Everstride and planner Railway services and redeploy → activates the seasonal-planner API auth.
2. Verify Strava end-to-end in production.
3. Optional: reduce cost (delete Flower service; move Redis→Upstash / Postgres→Neon); finish `api.everstride.fit` (target port 8000 + TLS) if a clean backend domain is wanted.
