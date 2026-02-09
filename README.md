This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
