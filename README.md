# ExpenseFlow

ExpenseFlow is a modern Next.js PWA for fast day-to-day expense and income tracking. It is local-first in guest mode, installable, responsive across phone/tablet/desktop, and includes the cloud-sync foundation for PostgreSQL with Prisma.

## Features

- Dashboard metrics: today, week, month, balance, income, savings, budget remaining, daily limit.
- Voice entry with browser Speech Recognition API, amount/category/type/merchant extraction, and low-confidence confirmation.
- Manual transaction form with category, subcategory, payment method, date, time, merchant, location, notes, receipt image, recurring flag, and tags.
- Search and filters by text, date range, and category.
- Recharts analytics for category spending and income vs expense trends.
- Upcoming recurring bills and AI-style monthly coaching insight.
- Offline guest mode using local storage plus service worker app shell caching.
- CSV export, JSON backup, and JSON restore.
- Prisma schema for users, transactions, categories, budgets, bills, merchants, payment methods, tags, receipts, notifications, settings, and voice logs.
- Google auth, email guest-style credentials auth, validated server action writes, export API, and push-subscribe stub.

## Tech Stack

- Next.js App Router, React, TypeScript, Tailwind CSS
- Shadcn-inspired local UI primitives
- React Query, React Hook Form-ready validation, Zod
- Prisma ORM with PostgreSQL
- NextAuth, Recharts, PapaParse
- PWA manifest and service worker

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. For cloud sync, set `DATABASE_URL`, `NEXTAUTH_SECRET`, and optional Google OAuth credentials.

4. Generate Prisma client and migrate:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
```

5. Start development:

```bash
npm run dev
```

The app works without a database in guest mode because transactions are stored locally in the browser.

## Vercel Deployment

1. Create a Neon or Supabase PostgreSQL database.
2. Add the variables from `.env.example` in Vercel project settings.
3. Set `NEXTAUTH_URL` to your production domain.
4. Run migrations from a trusted machine or CI with `npm run prisma:migrate`.
5. Deploy the project to Vercel.

## Production Notes

- Replace the push subscription stub with a Web Push provider and VAPID keys.
- Add OCR provider integration for receipt scanning.
- Add encrypted field storage if regulatory requirements demand at-rest application-level encryption beyond managed PostgreSQL encryption.
- Background Sync is scaffolded in the service worker; queue server writes from local storage when cloud sync is enabled.
