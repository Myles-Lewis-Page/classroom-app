# Classroom Roster App

A full classroom management app for elementary teachers: roster, attendance,
behavior tracking, homework, group building, seating charts, field trip/event
tracking, math & literacy skill mastery, student profiles (allergies, IEP,
parent info, social dynamics), a substitute-teacher packet, and a Friday
weekly parent report.

## Stack

- **Next.js 16** (App Router, TypeScript) — frontend + API routes in one app
- **PostgreSQL** via **Prisma 6**
- **NextAuth** (credentials login — just the teacher)
- Deployed on **Railway**, hosted on **GitHub**

## Local setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in a local Postgres connection
   string and an `AUTH_SECRET` (generate with `openssl rand -base64 32`).
3. Run migrations and seed the database:
   ```
   npx prisma migrate dev --name init
   npm run seed
   ```
   This creates a demo teacher login:
   - Email: `teacher@example.com`
   - Password: `changeme123`

   **Change this password** (or delete/recreate the teacher row) before using
   this with real student data.
4. Start the dev server:
   ```
   npm run dev
   ```

## Deploying to Railway

1. Push this repo to GitHub.
2. In Railway: **New Project → Deploy from GitHub repo**, select this repo.
3. Add a **PostgreSQL** database service in the same Railway project.
4. In your web service's **Variables** tab, add:
   - `DATABASE_URL` — reference the Postgres service's connection string
     (Railway can auto-link this)
   - `AUTH_SECRET` — a random secret
   - `NEXTAUTH_URL` — your Railway-provided domain (e.g.
     `https://your-app.up.railway.app`)
5. Railway will run `npm run build` (which runs `prisma generate`,
   `prisma migrate deploy`, then `next build`) and `npm run start` on deploy.
6. After the first deploy, seed the production database once to create your
   teacher login and default subjects/skills. Two ways to do this:

   **A) From the Railway dashboard (no CLI needed):**
   - Go to your web service → **Variables** → add `SEED_ON_BOOT` = `true`
   - This triggers a redeploy. Watch the **Deploy Logs** — you should see
     "SEED_ON_BOOT is set — running seed script..." followed by "Seed complete."
   - **Important:** once you see that in the logs, delete the `SEED_ON_BOOT`
     variable (or set it to `false`) and let it redeploy again, so it doesn't
     re-seed (and error on duplicate data) every time the app restarts.

   **B) Via Railway CLI:**
   ```
   npm install -g @railway/cli
   railway login
   railway link
   railway run npm run seed
   ```

## Data model

See `prisma/schema.prisma` for the full schema. Key design notes:

- **Teacher → Classroom → Student** hierarchy: built multi-tenant-ready even
  though it's single-user today, so adding more teachers later doesn't
  require restructuring.
- **No student photos** — by design, to avoid the privacy/security overhead
  of storing images of minors.
- **Group Builder / Seating Chart** both respect a hard "conflict" rule:
  students marked as not working well together are never placed in the same
  group or seated adjacently without a warning.
- **Math & Literacy skills** are stored as flexible reference tables
  (`MathSkill`, `LiteracySkill`), so the teacher can add/rename skills any
  time without a schema change.

## Feature list

1. Dashboard — daily overview (absences, birthdays, homework flags, missing event slips)
2. Roster + Attendance (combined) — search, filter, tags, CSV import/export, print view
3. Behavior Log — custom daily schedule, per-subject rubric (red/yellow/green)
4. Homework Tracker — Complete / Incomplete / Needs Help
5. Group Builder — group size, homogeneous/heterogeneous sort, hard conflict avoidance
6. Seating Chart — persistent grid, conflict warnings
7. Event Tracker — field trips, slip/payment status, missing-list view
8. Math Skills — class-wide grid (multiplication, addition, subtraction, division)
9. Reading & Writing — same pattern as Math, skill list fully customizable
10. Student Profile — allergies/dietary (flagged), IEP/504, parent info, social
    dynamics, mastered skills, full history, quick-notes, praise notes
11. Sub Mode — printable packet (schedule, behavior expectations, allergies,
    IEP summary, seating, key notes) — no photos
12. Weekly Report Export — Friday parent emails (attendance, behavior,
    homework, event flags, notes, praise)
