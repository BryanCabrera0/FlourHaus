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
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_BASE_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`

## Owner Admin

- Login: `/admin/login`
- Dashboard: `/admin`
- Orders: `/admin/orders`
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
