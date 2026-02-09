# Flour Haus

Flour Haus storefront and owner-admin app built with Next.js, Stripe, and Prisma.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Generate admin password hash:

```bash
npm run admin:hash -- "your-password"
```

4. Apply database migrations:

```bash
npx prisma migrate deploy
```

5. Start development server:

```bash
npm run dev
```

App runs at `http://localhost:3000`.

## Required Env Vars

- `DATABASE_URL`
- `STRIPE_SECRET_KEY` (or `STRIPE_PLATFORM_SECRET_KEY`)
- `STRIPE_WEBHOOK_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`

## Optional Env Vars

- `NEXT_PUBLIC_BASE_URL` canonical site URL used when building Stripe redirect URLs.
  - If omitted, the app falls back to the request origin / Vercel deployment URL.
- `BLOB_READ_WRITE_TOKEN` (recommended) for Vercel Blob image uploads.
  - If not set, admin image uploads fall back to local disk at `public/uploads/menu-images` (works only on writable Node runtimes; not reliable on Vercel).
- `RESEND_API_KEY` + `RESEND_FROM_EMAIL` for custom order notifications and admin replies.
- `CUSTOM_ORDER_REPLY_TO_EMAIL` optional Reply-To override for admin customer emails.

## Owner Admin

- Login: `/admin/login`
- Dashboard: `/admin`
- Orders: `/admin/orders`
- Custom orders: `/admin/custom-orders`
- Menu manager: `/admin/menu`
- Audit logs API: `/api/admin/audit`
- Stripe status API: `/api/admin/stripe/status`
- Stripe onboarding link API: `/api/admin/stripe/connect`
- Stripe dashboard login API: `/api/admin/stripe/login`

## Scripts

- `npm run dev` start dev server
- `npm run build` production build
- `npm run start` start production server
- `npm run lint` run ESLint
- `npm run admin:hash -- "password"` generate admin password hash
- `npm run clean` remove generated/cache artifacts (`.next`, `.vercel/output`, Prisma generated client, ts build cache)

## Folder Layout

- `app/` Next.js App Router pages, API routes, and UI components
- `lib/` shared server/client utilities and domain helpers
- `prisma/` schema, migrations, and seed script
- `scripts/` local utility scripts
