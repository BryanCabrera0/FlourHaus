Flour Haus storefront and owner admin app built with Next.js.

## Owner Admin Setup

1. Copy `.env.example` to `.env` and set your real values.
2. Generate a secure admin password hash:

```bash
npm run admin:hash -- "your-password"
```

3. Set these admin env vars:
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD_HASH`
   - `ADMIN_SESSION_SECRET`
4. Apply Prisma migrations:

```bash
npx prisma migrate deploy
```

5. Start app and sign in at `/admin/login`.

### Admin Features Included

- Protected admin auth/session (`/admin/login`, signed HttpOnly cookie, middleware protection)
- Dashboard (`/admin`)
- Orders management (`/admin/orders`) with status updates
- Menu management (`/admin/menu`) with create/update/archive/delete/sort
- Admin audit logs (`AdminAuditLog` table and `/api/admin/audit`)
- Stripe webhook idempotency by unique `stripeSessionId`

## Deploy on Vercel

`vercel.json` is configured to use:

```bash
npm run vercel-build
```

This runs `prisma generate`, `prisma migrate deploy`, then `next build`.

1. Import the GitHub repo into Vercel.
2. Add these environment variables in Vercel (Preview + Production as needed):
   - `DATABASE_URL`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD_HASH`
   - `ADMIN_SESSION_SECRET`
   - `NEXT_PUBLIC_BASE_URL` (optional; auto-detected from request origin if unset)
3. Deploy.
4. In Stripe, set webhook endpoint to:
   - `https://<your-domain>/api/webhook`
   - events: `checkout.session.completed`
5. If your database already had tables before Prisma migrations, baseline it once:

```bash
npx prisma db execute --file prisma/migrations/20260209000100_admin_owner_features/migration.sql
npx prisma migrate resolve --applied 20260209000100_admin_owner_features
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
