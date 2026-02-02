This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Environment Variables

This application uses Firebase configuration via environment variables. There are two Firebase projects:

- **Production** (`benchmarkcoach-prod`) — used by the production Vercel deployment
- **Staging** (original Firebase project) — used for local development and the staging branch

### Environment Files

| File | Purpose | Committed to git? |
|------|---------|-------------------|
| `.env.production` | Production Firebase config values | Yes |
| `.env.staging` | Staging Firebase config values | Yes |
| `.env.example` | Template with empty values | Yes |
| `.env.local` | Your local overrides (create this) | No |

### Local Development (Staging)

Copy the staging config to `.env.local`:

```bash
cp .env.staging .env.local
```

### Vercel Deployment

Environment variables are configured per-environment in the Vercel dashboard:

- **Production** (main branch): Set the `NEXT_PUBLIC_FIREBASE_*` variables to the values in `.env.production`
- **Preview** (staging branch): Set the `NEXT_PUBLIC_FIREBASE_*` variables to the values in `.env.staging`

### Required Variables

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
```

## Deploy on Vercel

### Prerequisites

1. Push your code to a GitHub repository
2. Have a Vercel account (sign up at [vercel.com](https://vercel.com))

### Deployment Steps

1. **Connect Repository to Vercel:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your GitHub repository
   - Select the repository and click "Import"

2. **Configure Environment Variables:**
   - In the project settings, go to "Environment Variables"
   - For **Production** environment: add values from `.env.production` (benchmarkcoach-prod)
   - For **Preview** environment: add values from `.env.staging` (staging Firebase project)
   - This ensures the main branch deploys against production and preview/staging branches deploy against staging

3. **Configure Build Settings:**
   - Framework Preset: Next.js (auto-detected)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

4. **Deploy:**
   - Click "Deploy"
   - Vercel will automatically build and deploy your application
   - Each push to your main branch will trigger a new deployment

### Post-Deployment

- Your app will be available at `https://your-project.vercel.app`
- You can configure a custom domain in the Vercel project settings
- Monitor deployments and logs in the Vercel dashboard

For more details, see the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).
