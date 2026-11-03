# Motorcycle System — Technical Plan

A web app for riders to track motorcycle maintenance (engine oil, coolant, tyres, chain, brakes, etc.) and to find motorcycle workshops near their current location. Deployed on Vercel.

---

## 1. Goals

| # | Goal | Notes |
|---|------|-------|
| 1 | Track maintenance per motorcycle | Log every service, see what is due next |
| 2 | Know *when* something is due | By distance (km) **or** time, whichever comes first |
| 3 | Find nearby workshops | Google Maps, only after the user allows location access |
| 4 | Works well on a phone | Riders use it at the workshop or on the road |
| 5 | Cheap to run | Fits in Vercel + Supabase free tiers + Google Maps free monthly usage |

---

## 2. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js (App Router) + TypeScript** | First-class on Vercel; frontend and API in one repo |
| Styling / UI | **Tailwind CSS + shadcn/ui** | Fast to build, mobile-friendly |
| Database | **Supabase (Postgres)** | Free tier, SQL, row-level security |
| Auth | **Supabase Auth** (email magic link + Google sign-in) | Built in, no separate auth service |
| File storage | **Supabase Storage** | Receipt and bike photos |
| ORM / queries | **Drizzle ORM** (or the Supabase JS client) | Type-safe queries and migrations |
| Validation | **Zod** | Shared validation for forms and API |
| Forms | **React Hook Form** | Works with Zod |
| Maps | **Google Maps JavaScript API** + **Places API (New)** | Map display and nearby workshop search |
| Map React wrapper | `@vis.gl/react-google-maps` | Google-maintained React bindings |
| Email reminders | **Resend** | Simple API, free tier |
| Scheduled jobs | **Vercel Cron Jobs** | Daily "what's due" check |
| Hosting | **Vercel** | Preview deploy for every branch/PR |

> Other options: Neon + Auth.js instead of Supabase, or Leaflet + OpenStreetMap/Overpass instead of Google Maps (free, but less workshop data). Supabase + Google is the simplest way to start.

---

## 3. Architecture

```
            ┌───────────────────────────── Vercel ─────────────────────────────┐
 Browser    │  Next.js App                                                     │
 (phone) ──►│   • Pages / React Server Components                              │
            │   • Server Actions (CRUD for bikes, logs)                        │
            │   • Route Handlers  /api/workshops/nearby  ──────► Google Places │
            │   • Cron:  /api/cron/reminders (daily)  ─────────► Resend email  │
            └──────────────┬───────────────────────────────────────────────────┘
                           │
                           ▼
                 Supabase (Postgres + Auth + Storage)
```

- The **Maps JS key** runs in the browser, so it is restricted by HTTP referrer (your Vercel domains).
- The **Places API key** stays on the server (in a Route Handler), so it is never exposed and can be rate-limited.

---

## 4. Data Model

```sql
-- users come from Supabase Auth (auth.users)

profiles (
  id uuid PK → auth.users.id,
  display_name text,
  distance_unit text default 'km',     -- 'km' | 'mi'
  currency text default 'MYR',
  reminder_email boolean default true,
  created_at timestamptz
)

motorcycles (
  id uuid PK,
  user_id uuid → profiles.id,
  nickname text,                -- "My Yamaha"
  make text, model text, year int,
  engine_cc int,
  plate_number text,
  vin text null,
  current_odometer int,         -- km
  purchase_date date null,
  photo_url text null,
  created_at timestamptz
)

maintenance_types (              -- global defaults + user custom ones
  id uuid PK,
  user_id uuid null,            -- null = system default
  name text,                    -- "Engine Oil"
  default_interval_km int null, -- 3000
  default_interval_days int null, -- 180
  icon text
)

maintenance_schedules (          -- per-bike override of the interval
  id uuid PK,
  motorcycle_id uuid,
  maintenance_type_id uuid,
  interval_km int null,
  interval_days int null,
  active boolean default true
)

maintenance_logs (
  id uuid PK,
  motorcycle_id uuid,
  maintenance_type_id uuid,
  performed_at date,
  odometer int,
  cost numeric(10,2) null,
  workshop_name text null,
  google_place_id text null,    -- link to a workshop found on the map
  notes text null,
  receipt_url text null,
  created_at timestamptz
)

odometer_readings (              -- history for estimating km/day
  id uuid PK,
  motorcycle_id uuid,
  odometer int,
  recorded_at timestamptz
)

favorite_workshops (
  id uuid PK,
  user_id uuid,
  google_place_id text,         -- store only the place_id (Google ToS)
  label text null,
  created_at timestamptz
)
```

**Row-Level Security:** every table is filtered by `user_id = auth.uid()` (or through `motorcycles.user_id`), so users can only see their own data.

### Default maintenance items (seed data — user can change)

| Item | Default interval (km) | Default interval (time) |
|------|-----|------|
| Engine oil | 3,000 | 6 months |
| Oil filter | 6,000 | 12 months |
| Coolant | 20,000 | 24 months |
| Front tyre / Rear tyre | 15,000 (or check tread) | 36 months |
| Tyre pressure check | — | 2 weeks |
| Chain clean & lube | 500–1,000 | 1 month |
| Chain & sprocket set | 20,000 | — |
| Brake pads (front / rear) | 10,000 | 12 months |
| Brake fluid | — | 24 months |
| Spark plug | 10,000 | 12 months |
| Air filter | 10,000 | 12 months |
| Battery | — | 24 months |
| CVT belt (scooters) | 20,000 | 24 months |
| Road tax / insurance renewal | — | 12 months |

> These are generic. The real values should come from the bike's owner's manual, so every interval is editable per bike.

---

## 5. Core Logic: "What's due?"

For each active schedule on a bike:

```
last         = latest maintenance_log for that type (or purchase date / odometer 0)
due_km       = last.odometer + interval_km
due_date     = last.performed_at + interval_days
km_per_day   = estimated from odometer_readings (last 30–90 days)

km_left      = due_km - current_odometer
days_left    = due_date - today
days_left_km = km_left / km_per_day         -- turns km into an estimated date

status =
  OVERDUE   if km_left <= 0 or days_left <= 0
  DUE_SOON  if km_left <= 10% of interval_km or days_left <= 14
  OK        otherwise
```

Put this in a pure function (`lib/maintenance/due.ts`) with unit tests. The dashboard, the reminder cron job and the bike detail page all use it.

---

## 6. Nearby Workshops (Google Maps + Location Permission)

### Flow

1. The user opens **Workshops**. Location is **not** requested on page load.
2. Show an explanation card: *"Allow location to find workshops near you"* with a **Use my location** button.
3. On click, call `navigator.geolocation.getCurrentPosition()` — this is what makes the browser show its permission prompt.
4. Handle every case:
   - **Granted** → send lat/lng to `/api/workshops/nearby` → show map + list.
   - **Denied** → explain how to turn it back on in browser settings, and offer a **search by city/postcode** box instead.
   - **Timeout / unavailable** → retry button + manual search.
5. Use `navigator.permissions.query({ name: 'geolocation' })` to know if permission was already given, so returning users skip step 2.

> Geolocation only works on **HTTPS**. Vercel gives you HTTPS on every deployment. `localhost` also works for development.

### Server Route `/api/workshops/nearby`

- Input: `lat`, `lng`, `radius` (default 5 km), validated with Zod.
- Calls **Places API (New) – Nearby Search** with type `motorcycle_repair` / `car_repair`, or **Text Search** with `"motorcycle workshop"`; ranking by distance.
- Use a **field mask** to ask only for what you need (`id, displayName, location, rating, userRatingCount, currentOpeningHours.openNow, nationalPhoneNumber, formattedAddress`). Fewer fields = cheaper.
- Rate-limit per user/IP (e.g. Upstash Redis) so the bill cannot run away.
- Round coordinates (~100 m) and cache the response for a few minutes.

### UI

- Map with markers + list sorted by distance; filter "Open now", minimum rating.
- Each workshop: **Call**, **Directions** (opens Google Maps app with `https://www.google.com/maps/dir/?api=1&destination_place_id=...`), **Save to favorites**, **Log service here** (fills `workshop_name` + `google_place_id` in a new maintenance log).

### Cost control

- Google Maps Platform gives a free monthly usage amount per API; after that you pay per request.
- In Google Cloud Console: set **budget alerts**, **per-day quotas** on Places API, and **key restrictions** (referrer for the browser key, API restriction for the server key).
- Google's terms say you may store `place_id` long-term but not copy other place details into your database — fetch fresh details when needed.

---

## 7. Pages / Routes

```
/                       Landing page (public)
/login                  Sign in (magic link / Google)
/dashboard              All bikes, overdue + due-soon items at the top
/bikes/new              Add motorcycle
/bikes/[id]             Bike detail: status of every item, quick "update odometer"
/bikes/[id]/log/new     Log a service (pick one or more items done at once)
/bikes/[id]/history     Timeline of all services + total cost
/bikes/[id]/schedule    Edit intervals for this bike
/workshops              Map + nearby list (asks for location)
/workshops/favorites    Saved workshops
/settings               Units, currency, reminders, export data, delete account

/api/workshops/nearby   GET  → Google Places (server-side)
/api/cron/reminders     GET  → called by Vercel Cron, protected with CRON_SECRET
```

---

## 8. Project Structure

```
app/
  (marketing)/page.tsx
  (app)/dashboard/page.tsx
  (app)/bikes/[id]/...
  (app)/workshops/page.tsx
  api/workshops/nearby/route.ts
  api/cron/reminders/route.ts
components/
  ui/                   shadcn components
  bikes/  maintenance/  workshops/
lib/
  db/schema.ts          Drizzle schema
  db/queries.ts
  maintenance/due.ts    "what's due" logic (+ due.test.ts)
  google/places.ts      Places API client (server only)
  supabase/server.ts  supabase/client.ts
  validation/           Zod schemas
supabase/migrations/    SQL migrations + RLS policies + seed data
vercel.json             cron config
```

---

## 9. Environment Variables (Vercel → Project → Settings → Environment Variables)

| Name | Where used | Public? |
|------|-----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | yes (protected by RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | cron job only | **no** |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | map in browser (referrer-restricted) | yes |
| `NEXT_PUBLIC_GOOGLE_MAP_ID` | map styling / advanced markers | yes |
| `GOOGLE_PLACES_API_KEY` | `/api/workshops/nearby` | **no** |
| `RESEND_API_KEY` | reminder emails | **no** |
| `CRON_SECRET` | protects `/api/cron/*` | **no** |

Never commit `.env.local`; add `.env.example` with empty values instead.

---

## 10. Deployment on Vercel

1. Import the GitHub repo in Vercel (framework: Next.js is auto-detected).
2. Create a Supabase project, run migrations from `supabase/migrations`.
3. Add the environment variables above (separately for Preview and Production).
4. In Supabase Auth settings, add your Vercel domain(s) as redirect URLs.
5. In Google Cloud: enable *Maps JavaScript API* and *Places API (New)*, create the two keys, add restrictions and a budget alert.
6. Add `vercel.json`:
   ```json
   { "crons": [{ "path": "/api/cron/reminders", "schedule": "0 1 * * *" }] }
   ```
   (Hobby plan allows daily crons — enough for reminders.)
7. Every push to a branch gets a Preview URL; merging to `main` deploys Production.

---

## 11. Roadmap

### Phase 0 — Setup (1–2 days)
- Next.js + TypeScript + Tailwind + shadcn/ui, ESLint/Prettier
- Supabase project, auth, first migration, RLS
- Deploy empty app to Vercel; GitHub Actions for lint + typecheck + tests

### Phase 1 — MVP: Maintenance tracking (1–2 weeks)
- Add/edit motorcycles
- Default maintenance items + per-bike intervals
- Log service (multiple items in one visit), update odometer
- Dashboard with OK / Due soon / Overdue
- Service history + total cost

### Phase 2 — Nearby workshops (1 week)
- Location permission flow + manual search fallback
- `/api/workshops/nearby` with Places API, field mask, rate limit
- Map + list, open now, call, directions, favorites
- "Log service here" link from workshop to maintenance log

### Phase 3 — Reminders & PWA (1 week)
- Daily cron → email when items become due soon / overdue
- PWA (installable on phone home screen, offline view of last data)
- Web push notifications (optional, in addition to email)

### Phase 4 — Extras (pick what you like, see below)

---

## 12. Extra Features You Can Add

**Maintenance & ownership**
- 📸 **Receipt photos** attached to each service log; later OCR to auto-fill cost and date.
- ⛽ **Fuel log** — litres, price, odometer → fuel consumption (km/L) and monthly fuel cost.
- 💰 **Expense dashboard** — charts of cost per month, per category, cost per km.
- 📄 **Document wallet** — road tax, insurance, licence expiry dates with reminders.
- 🔧 **Parts list** — save part numbers / oil grade / tyre size for your bike so you know what to buy.
- 📈 **Smart odometer estimate** — predict mileage from your riding history so reminders work even if you forget to update the odometer.
- 🧾 **Export / PDF service book** — useful when selling the bike (shows full history = higher resale value).
- 🏍️ **Bike model presets** — pick "Honda RS150R" / "Yamaha Y15ZR" etc. and auto-fill recommended intervals.

**Workshops & map**
- ⭐ **Your own workshop reviews** and price notes ("oil change here costs RM45").
- 🛞 **Filter by service type** — tyre shop, big bike specialist, authorised dealer.
- ⛽ **Nearby petrol stations** and **parking** using the same map.
- 🆘 **Emergency / breakdown mode** — one button: share live location to a contact via WhatsApp, show closest workshop + towing numbers.

**Riding**
- 🗺️ **Trip log** — record rides with GPS, auto-add km to the odometer.
- 🌧️ **Weather check** before a ride (OpenWeather API).
- ✅ **Pre-ride checklist** (T-CLOCS: tyres, controls, lights, oil, chassis, stand).

**Social / multi-user**
- 👨‍👩‍👦 **Share a bike** with family member or mechanic (read-only link).
- 🔧 **Workshop portal** — mechanics can log the service directly into the customer's bike history via QR code.

**AI (later)**
- 🤖 **Ask about your bike** — "Strange noise when braking, what could it be?" using the bike's history as context.
- 🧠 **Read manual intervals** — upload the owner's manual PDF and auto-generate the maintenance schedule.

---

## 13. Non-Functional Requirements

- **Security:** RLS on all tables, secrets only on the server, Zod validation on every input, rate limit on public APIs.
- **Privacy:** location is used only for the search request and is **not stored**; say this in a short privacy notice. Provide "export my data" and "delete my account".
- **Performance:** Server Components for data pages, lazy-load the map script only on `/workshops`.
- **Accessibility:** large touch targets, good contrast (readable in sunlight), dark mode.
- **Testing:** Vitest for `due.ts` and validation; Playwright for main flows (add bike → log service → dashboard shows OK); mock geolocation in Playwright to test the permission flow.
- **Monitoring:** Vercel Analytics + Sentry (free tier) for errors.

---

## 14. Next Steps

1. Agree on the stack (Supabase vs Neon, Google Maps vs OpenStreetMap).
2. Scaffold Phase 0 and deploy to Vercel.
3. Build Phase 1 (maintenance tracking) — the core value of the app.
4. Add Phase 2 (workshop map) once the Google Cloud keys are ready.
