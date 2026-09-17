# LB Maths Tuition — Platform

Student portal and lesson management system for LB Maths Tuition. Students use it to join their online lessons via Microsoft Teams, and tutors/admins use it to schedule sessions and manage student rosters.

## What it does

- **Student lobby**: Students log in with a 4-digit PIN or a direct magic link. Shows upcoming and live lessons with a countdown timer, tutor delay notices, and a direct Teams launch button.
- **Admin dashboard**: Full lesson scheduling with conflict detection, tutor assignments, student/tutor directories with search and filtering, and activity logs.
- **Tutor dashboard**: View assigned students, upcoming timetable, update Teams meeting links, and post delay alerts (+5m / +10m) if running behind.
- **Accessibility & Focus**: High contrast toggle, OpenDyslexic font mode, audio alerts for lesson start/delays (with mute), and reduced motion support.

## Tech stack

- **Framework**: Next.js (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, Lucide icons
- **Database**: Turso (libSQL edge database) with Prisma ORM
- **Auth**: Signed HMAC session cookies, bcrypt password hashing for tutors/admin, PIN and key authentication for students

## Getting started

### Prerequisites

- Node.js 20+
- A Turso database instance (or local SQLite for dev)

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   ```env
   TURSO_DATABASE_URL="libsql://your-db.turso.io"
   TURSO_AUTH_TOKEN="your-turso-auth-token"
   SESSION_SECRET="your-secret-key"
   ```

3. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```

4. If initialising Turso tables and indexes:
   ```bash
   npm run db:setup-turso
   ```

5. Start the dev server:
   ```bash
   npm run dev
   ```

The app will run at [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — Start the Next.js development server
- `npm run build` — Run prisma generate and build production bundle
- `npm run start` — Start production server
- `npm run db:setup-turso` — Create database tables and performance indexes on Turso

## Deployment

Configured for Firebase App Hosting / Google Cloud Run via `apphosting.yaml` with Next.js standalone output.
