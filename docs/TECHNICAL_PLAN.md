# Motorcycle System — Technical Plan

A rider app for tracking motorcycle maintenance (engine oil, coolant, tyres, chain, brakes, etc.) and for finding motorcycle workshops near the rider's current location.

**One codebase, two targets:**

- 🌐 **Web app** — deployed on **Vercel**
- 🤖 **Android app** — the same web code wrapped with **Capacitor**, published on Google Play (iOS can be added later with the same code)

---

## 1. Goals

| # | Goal | Notes |
|---|------|-------|
| 1 | Track maintenance per motorcycle | Log every service, see what is due next |
| 2 | Know *when* something is due | By distance (km) **or** time, whichever comes first |
| 3 | Find nearby workshops | Google Maps, only after the user allows location access |
| 4 | Android app + website from one codebase | Capacitor wraps the web build |
| 5 | Reminders that work even when the app is closed | Native local notifications on Android, email on web |
| 6 | Cheap to run | Vercel + Supabase free tiers + Google Maps free monthly usage |

---

## 2. Why the stack changes because of Capacitor

Capacitor puts a **static web build** (HTML/JS/CSS) inside an Android WebView. The app's files live **on the phone**, not on Vercel. That has some effects:

| Concern | What it means for us |
|---------|----------------------|
| No server inside the app | Server-side rendering, Next.js Server Actions and Server Components **can't run in the APK**. The frontend must be a client-side app (SPA). |
| Different origin | Inside the app, the page origin is `https://localhost` (Android), not your Vercel domain. A relative `fetch('/api/...')` won't reach Vercel, so we need a full API base URL and CORS. |
| Auth redirects | OAuth / magic-link emails must come back to the **app**, not the website, so we need deep links. |
| Native features | Location permission, notifications, camera, opening the Maps app — use Capacitor plugins instead of browser-only APIs. |
| Play Store policy | Google may reject an app that only loads a remote website. Bundling the UI in the APK (and using native features) avoids that and also makes the app open offline. |

### Decision: Vite + React SPA (not Next.js)

| Option | Verdict |
|--------|---------|
| **Vite + React + TypeScript SPA** + Vercel Functions in `/api` | ✅ **Recommended.** One `dist/` folder is used by both Vercel and Capacitor. Small API lives next to it on Vercel. Simple. |
| Next.js with `output: 'export'` | Works, but you lose Server Actions, route handlers and middleware in the export, so you get Next.js complexity without its main benefits. |
| Next.js on Vercel + Capacitor `server.url` pointing to the live site | ❌ Avoid. App is blank without internet, and it risks Play Store rejection as a "website wrapper". |

Most data access does **not** need our own server: the app talks to **Supabase directly** with the user's login token, and Row-Level Security protects the data. Our Vercel API is only needed for things that need secrets (Google Places key, cron jobs).

---

## 3. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | **Vite + React + TypeScript** | Static build that Capacitor can bundle |
| Routing | **React Router** (or TanStack Router) | Client-side routing |
| Data fetching / cache | **TanStack Query** (+ persisted cache) | Caching, offline viewing, retries |
| Styling / UI | **Tailwind CSS + shadcn/ui** | Fast, mobile-friendly; respect Android safe areas |
| Native wrapper | **Capacitor** (latest stable) + Android platform | Turns the web build into an Android app |
| Database | **Supabase (Postgres)** | Free tier, SQL, Row-Level Security |
| Auth | **Supabase Auth** — email **OTP code** + Google sign-in | OTP codes work in apps without deep-link setup |
| File storage | **Supabase Storage** | Receipt and bike photos |
| Validation | **Zod** | Shared by forms and API |
| Forms | **React Hook Form** | Works with Zod |
| Backend API | **Vercel Functions** (`/api/*.ts` in the same repo) | Google Places proxy, cron reminders |
| Maps | **Google Maps JavaScript API** in the WebView + **Places API (New)** on the server | Same map code on web and Android |
| Map React wrapper | `@vis.gl/react-google-maps` | Google-maintained React bindings |
| Email | **Resend** | Reminder emails (web users) |
| Scheduled jobs | **Vercel Cron Jobs** | Daily "what's due" check |
| Testing | **Vitest** + **Playwright** | Logic tests + end-to-end on the web build |

### Capacitor plugins

| Plugin | Used for |
|--------|---------|
| `@capacitor/geolocation` | Location permission + current position (falls back to browser API on web) |
| `@capacitor/local-notifications` | "Engine oil due in 3 days" reminders scheduled on the phone, no server needed |
| `@capacitor/push-notifications` *(later)* | Server-sent push via Firebase Cloud Messaging |
| `@capacitor/camera` | Take a receipt / bike photo |
| `@capacitor/app` | Deep links (`appUrlOpen`), Android back button |
| `@capacitor/browser` | Open Google OAuth in a secure in-app browser tab |
| `@capacitor/preferences` | Small settings stored on the device |
| `@capacitor/share` | Share service history PDF / workshop location |
| `@capacitor/network` | Show "offline" banner |
| `@capacitor/splash-screen`, `@capacitor/status-bar` | App polish |

Wrap every native call in a small module (`src/native/*.ts`) that checks `Capacitor.isNativePlatform()` and falls back to the browser API, so the web version keeps working.

---

## 4. Architecture

```
┌──────────────── Android phone ────────────────┐      ┌──────────── Vercel ────────────┐
│  Capacitor app                                │      │  Static web app (same dist/)   │
│   • React SPA bundled in the APK              │      │  /api/workshops/nearby ────────┼──► Google Places API
│   • Native plugins: GPS, notifications, camera│─────►│  /api/cron/reminders  ─────────┼──► Resend email
│   • origin: https://localhost                 │ HTTPS│  /.well-known/assetlinks.json  │
└───────────────┬───────────────────────────────┘      └───────────────┬────────────────┘
                │ supabase-js (user JWT)                               │ service role
                ▼                                                      ▼
          ┌──────────── Supabase: Postgres + Auth + Storage (RLS on every table) ───────────┐
          └─────────────────────────────────────────────────────────────────────────────────┘

Browser users load the same SPA from Vercel and use the same Supabase + /api.
```

### Calling our API from the app

- Base URL from env: `VITE_API_BASE_URL=https://<your-app>.vercel.app`.
- Send the Supabase access token: `Authorization: Bearer <jwt>`; the function verifies it with Supabase.
- **CORS** on `/api/*`: allow `https://localhost` (Capacitor Android), `capacitor://localhost` (future iOS), your Vercel domains and `http://localhost:5173` (dev).

---

## 5. Data Model

```sql
-- users come from Supabase Auth (auth.users)

profiles (
  id uuid PK → auth.users.id,
  display_name text,
  distance_unit text default 'km',     -- 'km' | 'mi'
  currency text default 'MYR',
  reminder_email boolean default true,
  reminder_push boolean default true,
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

maintenance_types (              -- system defaults + user custom ones
  id uuid PK,
  user_id uuid null,            -- null = system default
  name text,                    -- "Engine Oil"
  default_interval_km int null,
  default_interval_days int null,
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
  google_place_id text null,
  notes text null,
  receipt_url text null,
  created_at timestamptz
)

odometer_readings (
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

devices (                        -- for server push later
  id uuid PK,
  user_id uuid,
  platform text,                -- 'android' | 'web'
  push_token text,
  updated_at timestamptz
)
```

**Row-Level Security:** every table is filtered by `user_id = auth.uid()` (or via `motorcycles.user_id`). This is essential because the app talks to Supabase directly. Only the public **anon key** ships in the APK; the **service role key** stays on Vercel.

### Default maintenance items (seed data — editable per bike)

| Item | Interval (km) | Interval (time) |
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

> These are generic. Use the owner's manual values for each bike.

---

## 6. Core Logic: "What's due?"

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

Pure function in `src/lib/maintenance/due.ts` with unit tests. It's used by the dashboard, by the **on-device notification scheduler**, and by the Vercel cron job (import the same file in `/api`).

---

## 7. Nearby Workshops (location permission + Google Maps)

### Permission flow (same UI on web and Android)

1. The user opens **Workshops**. Location is **not** asked on app start.
2. Explanation card: *"Allow location to find workshops near you"* + **Use my location** button.
3. On tap:
   - **Android:** `Geolocation.checkPermissions()` → if `prompt`, call `Geolocation.requestPermissions()` → Android's system dialog appears.
   - **Web:** `navigator.geolocation.getCurrentPosition()` triggers the browser prompt (HTTPS required — Vercel provides it).
4. Then `Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 })`.
5. Handle every case:
   - **Granted (precise or approximate)** → call `/api/workshops/nearby`. Android 12+ users may pick "Approximate" — that's fine for workshop search.
   - **Denied** → explain why and show a button to open app settings; offer **search by city/postcode**.
   - **GPS off / timeout** → ask to turn on location, retry, or manual search.

**Android setup** (`android/app/src/main/AndroidManifest.xml`):

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-feature android:name="android.hardware.location.gps" android:required="false" />
```

We only need **foreground** location — do **not** ask for background location (Google Play reviews it strictly).

### Map rendering

| Option | Verdict |
|--------|---------|
| **Google Maps JavaScript API inside the WebView** | ✅ **Start here.** Same code on web and Android. |
| `@capacitor/google-maps` (native map) | Smoother on low-end phones, but it's a separate API, needs a second key, and the map is drawn *behind* the WebView (layout gets more complicated). Consider later if performance is a problem. |

**API keys:**

- **Browser/WebView key** (Maps JavaScript API only): HTTP-referrer restricted to your Vercel domains **plus `https://localhost/*`** for the Android app.
- **Server key** (Places API (New) only): used only in `/api/workshops/nearby`, never shipped in the APK.
- (Only if you use the native maps plugin later: an **Android key** restricted to the package name + SHA-1 of the signing certificate — including the Play App Signing SHA-1.)

### `/api/workshops/nearby` (Vercel Function)

- Input `lat`, `lng`, `radius` (default 5 km), validated with Zod; requires the Supabase JWT.
- Places API (New) **Nearby Search** (`motorcycle_repair` / `car_repair`) or **Text Search** "motorcycle workshop"; rank by distance.
- **Field mask** with only what we show (`id, displayName, location, rating, userRatingCount, currentOpeningHours.openNow, nationalPhoneNumber, formattedAddress`) → cheaper.
- Rate limit per user (Upstash Redis). Round coordinates to ~100 m and cache a few minutes.

### Workshop actions

- **Directions:** open `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>&destination_place_id=<id>` — on Android this opens the Google Maps app.
- **Call:** `tel:` link opens the phone dialer.
- **Save to favorites**, **Log service here** (fills workshop name + `place_id` into a new log).

### Cost control

Budget alerts + per-day quota on Places API in Google Cloud Console, key restrictions, field masks, caching. Store only `place_id` long-term (Google ToS).

---

## 8. Authentication in the Android app

| Method | How it works in Capacitor |
|--------|---------------------------|
| **Email OTP code** (recommended first) | User types email → gets a 6-digit code → types it in the app. No redirect, no deep link needed. |
| **Google sign-in** | `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'com.fadzyll.motorcycle://auth/callback', skipBrowserRedirect: true } })` → open the URL with `@capacitor/browser` → app catches the redirect via `App.addListener('appUrlOpen')` → `supabase.auth.exchangeCodeForSession(code)` (PKCE). Add the custom scheme to Supabase "Redirect URLs" and an intent filter in `AndroidManifest.xml`. |
| **Magic link** (optional) | Needs **Android App Links**: host `/.well-known/assetlinks.json` on Vercel with the app's SHA-256 fingerprint, so `https://<your-app>.vercel.app/auth/callback` opens the app. |

The Supabase session is persisted in the WebView storage and auto-refreshed. Also handle the Android **back button** with `App.addListener('backButton')`.

---

## 9. Reminders

| Platform | Mechanism |
|----------|-----------|
| **Android** | `@capacitor/local-notifications`: whenever logs/odometer change, recompute due dates and **re-schedule** notifications on the phone (e.g. 7 days before and on the due date). Works offline and costs nothing. Android 13+ needs the **POST_NOTIFICATIONS** permission — ask when the user turns on reminders, not on first launch. |
| **Web** | Daily **Vercel Cron** → `/api/cron/reminders` (protected by `CRON_SECRET`) → email via Resend. |
| **Later** | Server push with `@capacitor/push-notifications` + Firebase Cloud Messaging (needs `google-services.json` and the `devices` table). Useful for things the phone can't know, e.g. a workshop messaging you. |

Known issue: some Android brands (Xiaomi, Oppo, Vivo, Huawei) kill scheduled notifications through battery optimisation. Add a short help tip for those users, and keep email as a backup.

---

## 10. Offline support

- The UI is bundled in the APK, so the app always opens.
- Persist TanStack Query cache (IndexedDB) → last-known bikes, logs and due status are visible offline.
- `@capacitor/network` shows an "offline" banner; disable saving (or queue writes) while offline. Simple first version: read-only offline.

---

## 11. Project Structure

```
api/                          Vercel Functions (Node)
  workshops/nearby.ts
  cron/reminders.ts
  _lib/cors.ts  _lib/auth.ts  _lib/places.ts
src/
  main.tsx  App.tsx  routes/
  pages/                      dashboard, bikes, workshops, settings, login
  components/ui/              shadcn components
  components/bikes/ maintenance/ workshops/
  lib/
    maintenance/due.ts        "what's due" logic (+ due.test.ts)
    supabase.ts               supabase-js client
    api.ts                    fetch wrapper using VITE_API_BASE_URL + JWT
    validation/               Zod schemas
  native/                     wrappers with web fallbacks
    location.ts  notifications.ts  camera.ts  deeplinks.ts
public/
  .well-known/assetlinks.json (only if using App Links)
android/                      generated by `npx cap add android` (commit it)
supabase/migrations/          SQL migrations + RLS + seed data
capacitor.config.ts
vercel.json
vite.config.ts
```

### `capacitor.config.ts`

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fadzyll.motorcycle',   // final package name — can't change after Play release
  appName: 'Motorcycle System',
  webDir: 'dist',
  // server: { url: 'http://192.168.x.x:5173', cleartext: true }, // dev live-reload only, never ship this
};

export default config;
```

---

## 12. Environment Variables

Vite only exposes variables starting with `VITE_` to the frontend — and **everything in the frontend ends up inside the APK**, so never put secrets there.

| Name | Used by | Ships in APK? |
|------|---------|---------------|
| `VITE_SUPABASE_URL` | frontend | yes (public) |
| `VITE_SUPABASE_ANON_KEY` | frontend | yes (protected by RLS) |
| `VITE_API_BASE_URL` | frontend | yes — `https://<your-app>.vercel.app` |
| `VITE_GOOGLE_MAPS_API_KEY` | frontend map | yes (referrer-restricted) |
| `VITE_GOOGLE_MAP_ID` | frontend map | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | `/api/cron` | **no** — Vercel only |
| `GOOGLE_PLACES_API_KEY` | `/api/workshops` | **no** — Vercel only |
| `RESEND_API_KEY` | `/api/cron` | **no** — Vercel only |
| `CRON_SECRET` | `/api/cron` | **no** — Vercel only |

For the Android build, put the `VITE_*` values in `.env.production` locally (or in CI secrets) before `npm run build`. Commit only `.env.example`.

---

## 13. Build & Deploy

### Web (Vercel)

1. Import the repo in Vercel → framework preset **Vite**, output `dist`. Files in `/api` become Functions automatically.
2. Add env vars (Preview + Production).
3. Add SPA fallback in `vercel.json` so deep URLs work:
   ```json
   {
     "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }],
     "crons": [{ "path": "/api/cron/reminders", "schedule": "0 1 * * *" }]
   }
   ```

### Android (Capacitor)

Requirements: **Node LTS**, **Android Studio** (bundled JDK), an Android phone with USB debugging or an emulator.

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Motorcycle System" com.fadzyll.motorcycle --web-dir dist
npx cap add android
npm run build && npx cap sync android     # run after every web change
npx cap run android                        # or: npx cap open android
```

- App icon + splash: `@capacitor/assets` generates all sizes from one image.
- Release: in Android Studio, **Build → Generate Signed Bundle (.aab)**. Keep the keystore file and passwords safe — you need them for every update (Play App Signing helps).
- Optional CI: GitHub Actions job that builds the web app, runs `cap sync`, and builds a debug APK on every PR.

### Google Play

- Google Play Console developer account (one-time fee).
- **Privacy policy URL** (host it on Vercel, e.g. `/privacy`) — required because we use location.
- **Data safety form**: approximate/precise location (used for the app's functionality, not shared, not stored), email (account), photos (optional).
- New personal developer accounts must run a **closed test with a group of testers for a set period** before going to production — plan time for this (check the current requirement in Play Console).
- Target the API level Google Play currently requires (Capacitor's latest version is kept up to date with this).

### Updates

- UI changes → web is updated instantly on Vercel; Android needs a new build to Play Store.
- Optional later: live updates (e.g. Capgo or Ionic Appflow) push web-layer updates without a Play release. Native/plugin changes still need a store release.

---

## 14. Roadmap

### Phase 0 — Setup (2–3 days)
- Vite + React + TS + Tailwind + shadcn/ui, ESLint/Prettier, Vitest
- Supabase project, auth (OTP), first migration, RLS
- Deploy to Vercel; one sample `/api/health` function with CORS
- `npx cap add android`, run the app on a real phone
- GitHub Actions: lint, typecheck, tests, build

### Phase 1 — MVP: maintenance tracking (1–2 weeks)
- Add/edit motorcycles, default items + per-bike intervals
- Log service (several items in one visit), update odometer
- Dashboard with OK / Due soon / Overdue; history + total cost
- Android back button + safe-area layout

### Phase 2 — Nearby workshops (1 week)
- `src/native/location.ts` with Capacitor + web fallback, full permission flow
- `/api/workshops/nearby` with Places API, field mask, rate limit
- Map + list, open now, call, directions, favorites, "log service here"

### Phase 3 — Reminders, camera & offline (1 week)
- Local notifications on Android, email cron for web
- Receipt photos with `@capacitor/camera`
- Persisted query cache + offline banner

### Phase 4 — Google Play release (1–2 weeks, mostly waiting)
- Icons, splash, privacy policy, data safety form, screenshots
- Signed AAB, internal test → closed test → production

### Phase 5 — Extras (see below)

---

## 15. Extra Features You Can Add

**Maintenance & ownership**
- 📸 **Receipt photos** (native camera); later OCR to auto-fill cost and date.
- ⛽ **Fuel log** — litres, price, odometer → km/L and monthly fuel cost.
- 💰 **Expense dashboard** — cost per month, per category, cost per km.
- 📄 **Document wallet** — road tax, insurance, licence expiry with reminders.
- 🔧 **Parts list** — oil grade, tyre size, part numbers for your bike.
- 🏍️ **Bike model presets** — choose your model, recommended intervals auto-fill.
- 🧾 **PDF service book** — share via `@capacitor/share`, helps resale value.
- 📲 **Home-screen widget** (native Android) — "Engine oil due in 450 km".

**Workshops & map**
- ⭐ Your own workshop notes and prices ("oil change here RM45").
- 🛞 Filter by service type — tyre shop, big bike specialist, authorised dealer.
- ⛽ Nearby petrol stations and parking on the same map.
- 🆘 **Emergency mode** — one button: share live location on WhatsApp, show the closest workshop and towing numbers.

**Riding**
- 🗺️ Trip log with GPS (foreground only), auto-adds km to the odometer.
- 🌧️ Weather check before a ride.
- ✅ Pre-ride checklist (T-CLOCS: tyres, controls, lights, oil, chassis, stand).
- 🔵 Bluetooth OBD / smart-bike integration (some newer bikes) — advanced, native plugin.

**Social / multi-user**
- 👨‍👩‍👦 Share a bike with a family member (read-only).
- 🔧 Workshop scans a QR code on your phone and logs the service into your history.

**AI (later)**
- 🤖 "Strange noise when braking — what could it be?" using the bike's history as context.
- 🧠 Upload the owner's manual PDF → auto-generate the maintenance schedule.

---

## 16. Non-Functional Requirements

- **Security:** RLS on every table, no secrets in `VITE_*` variables, JWT check + Zod validation + rate limit on `/api`, strict CORS list.
- **Privacy:** location used only for the search request and **not stored**; privacy policy page; "export my data" and "delete my account" (Google Play requires an account-deletion option for apps with accounts).
- **Performance:** load the Google Maps script only on the Workshops page; keep the bundle small for low-end Android phones; test on a real budget device.
- **Accessibility / UX:** big touch targets, readable in sunlight, dark mode, Android safe areas, back button behaviour.
- **Testing:** Vitest for `due.ts`, validation and the `native/` wrappers (mock Capacitor); Playwright with mocked geolocation for the web flow; manual test checklist on a real Android phone for permissions and notifications.
- **Monitoring:** Sentry (has a Capacitor SDK) for crashes on web and Android; Vercel Analytics for web.

---

## 17. Next Steps

1. Confirm: Vite + React SPA, Supabase, Google Maps JS in the WebView.
2. Choose the final **app ID** (e.g. `com.fadzyll.motorcycle`) — it can't change after the first Play Store release.
3. Scaffold Phase 0: web on Vercel + Android app running on your phone.
4. Build Phase 1 (maintenance tracking), then Phase 2 (workshop map).
