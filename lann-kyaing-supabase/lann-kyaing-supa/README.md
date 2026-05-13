# Lann Kyaing — Supabase Web App
## Complete Setup Guide

---

## STEP 1 — Create Supabase project

1. Go to https://supabase.com
2. Click "Start your project" → sign up free
3. Click "New project"
4. Fill in:
   - Name: lann-kyaing
   - Database password: (save this somewhere safe)
   - Region: Southeast Asia (Singapore)
5. Click "Create new project" — wait ~2 minutes

---

## STEP 2 — Run the SQL setup

1. In Supabase → left menu → "SQL Editor"
2. Click "New query"
3. Open the file: supabase_setup.sql
4. Copy ALL the content → paste into SQL editor
5. Click "Run" (green button)
6. You should see: "Success. No rows returned"

Now click "Table Editor" in the left menu.
You should see these tables:
✅ users
✅ admin_config
✅ situation_types
✅ credit_packages
✅ time_window_options
✅ pins
✅ check_requests
✅ transactions

---

## STEP 3 — Create dummy user accounts

In Supabase → left menu → "Authentication" → "Users" tab → "Add user"

Create these 5 users one by one:

| Email                        | Password      | Role    |
|------------------------------|---------------|---------|
| aungkoko@lannkyaing.app      | Test@1234     | user    |
| thidawin@lannkyaing.app      | Test@1234     | checker |
| kyawzin@lannkyaing.app       | Test@1234     | user    |
| sumyatnoe@lannkyaing.app     | Test@1234     | checker |
| admin@lannkyaing.app         | Admin@LK2024! | admin   |

After creating each user:
- Supabase shows a UUID like: a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx
- Copy that UUID
- Go to Table Editor → users table
- Find the row with matching email
- Update the "uid" column with that UUID

---

## STEP 4 — Get your API keys

In Supabase → left menu → "Project Settings" → "API"

Copy these two values:
- Project URL  →  looks like: https://xyzxyzxyz.supabase.co
- anon public key  →  long string starting with: eyJhbGci...

---

## STEP 5 — Add keys to the app

Open the file: src/supabase.js

Replace:
  REPLACE_WITH_YOUR_PROJECT_URL  →  your Project URL
  REPLACE_WITH_YOUR_ANON_KEY     →  your anon public key

Save the file.

---

## STEP 6 — Install and run

Make sure Node.js is installed (https://nodejs.org → LTS version)

Open terminal in this folder and run:

  npm install

Then start the app:

  npm run dev

Open in browser: http://localhost:5173

---

## STEP 7 — Test on Android phone

1. Make sure phone and computer are on same WiFi
2. Your terminal shows something like:
     Network: http://192.168.1.xxx:5173
3. Open Chrome on Android → go to that address
4. Log in with: aungkoko@lannkyaing.app / Test@1234
5. You should see the dark map with bottom tabs

---

## STEP 8 — Add to Android home screen

In Android Chrome:
1. Tap the 3-dot menu (top right)
2. Tap "Add to Home screen"
3. Tap "Add"

Now it opens fullscreen like a real app!

---

## STEP 9 — Deploy online FREE (optional)

Install Netlify CLI:
  npm install -g netlify-cli

Build the app:
  npm run build

Deploy:
  netlify deploy --prod --dir=dist

You get a free URL like: https://lann-kyaing.netlify.app

---

## How to update data anytime

Go to Supabase → Table Editor → click any table → edit cells directly.

Examples:
- Change user balance: users table → find row → click balance_credits → type new value
- Change commission: admin_config table → click commission_rate → change to 0.08
- Add new situation type: situation_types table → Insert row
- Ban a user: users table → set is_active = false

---

## Dummy accounts summary

| Email                       | Password      | Role    | Balance |
|-----------------------------|---------------|---------|---------|
| aungkoko@lannkyaing.app     | Test@1234     | user    | 240 pts |
| thidawin@lannkyaing.app     | Test@1234     | checker | 890 pts |
| kyawzin@lannkyaing.app      | Test@1234     | user    | 50 pts  |
| sumyatnoe@lannkyaing.app    | Test@1234     | checker | 1200 pts|
| admin@lannkyaing.app        | Admin@LK2024! | admin   | —       |

---

## Contact for account creation
Telegram: @doublepz Yet

---

## Tech stack (all free)
- React + Vite (web app)
- Supabase (database + auth + realtime) — free tier
- Leaflet + OpenStreetMap/CARTO (map tiles) — free forever
- Netlify (hosting) — free tier
