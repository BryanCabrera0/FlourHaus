# Flour Haus

Pastel bakery storefront + owner admin dashboard.

## What This App Does

- Customers: browse menu, add to cart, schedule pickup/delivery, pay with embedded Stripe checkout.
- Owner: manage menu + featured items, scheduling, orders, custom orders, and Stripe settings.

## Quick Start (Local Dev)

1. Install dependencies:

```bash
npm install
```

2. Create an env file:

```bash
cp .env.example .env
```

3. Generate the admin password hash:

```bash
npm run admin:hash -- "your-password"
```

4. Run migrations:

```bash
npx prisma migrate deploy
```

5. Start the dev server:

```bash
npm run dev
```

App: `http://localhost:3000`  
Admin: `http://localhost:3000/admin/login`

## Environment Variables

Required:
- `DATABASE_URL`
- `STRIPE_SECRET_KEY` (or `STRIPE_PLATFORM_SECRET_KEY`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`

Optional:
- `NEXT_PUBLIC_BASE_URL` canonical site URL used when building Stripe links (falls back to request origin).
- `BLOB_READ_WRITE_TOKEN` recommended for Vercel Blob image uploads (required on Vercel if you want images to persist).
- `RESEND_API_KEY` email notifications (custom orders)
- `RESEND_FROM_EMAIL` email notifications (custom orders)
- `CUSTOM_ORDER_REPLY_TO_EMAIL` optional Reply-To override for admin emails

## Business Rules (Current)

- Cookies are sold only in packs of 4 / 8 / 12 (pack prices are set in Admin → Menu).
- Customers must schedule pickup/delivery (lead-time rules are configurable in Admin → Scheduling).
- Delivery is limited to 5 miles from 4261 SW 162nd Ct, Miami, FL 33185.

## Owner Admin Pages

- `/admin/login`
- `/admin`
- `/admin/orders`
- `/admin/custom-orders`
- `/admin/menu`
- `/admin/scheduling`

## Useful Commands

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run admin:hash -- "password"`
- `npm run clean`

## Folder Layout

- `app/` Next.js App Router pages, API routes, and UI components
- `lib/` shared utilities and domain helpers
- `prisma/` Prisma schema + migrations
- `scripts/` local utility scripts
