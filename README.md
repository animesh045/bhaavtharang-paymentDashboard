# Meta Vibronics - Premium Booking Funnel & Admin Portal

A complete, production-ready appointment scheduling and payment checkout website. This funnel enables clients to book 60-minute bio-resonance consultations, complete payments securely via Razorpay Checkout, and automatically schedules Zoom meetings and Google Calendar events.

---

## Key Features

1. **Premium Conversion Funnel**: Sleek dark-themed design with smooth CSS gradients, glassmorphism elements, and fully responsive layouts.
2. **Interactive Time Slots**: Dynamic appointment selector checking Google Calendar free/busy schedules to prevent double bookings.
3. **Razorpay Checkout Integration**: Multi-stage payment flow featuring instant client-side verification combined with a secure, idempotent backend Webhook receiver.
4. **Zoom Server-to-Server OAuth**: Automatic meeting creation (60-minute schedule) with cached access tokens.
5. **Google Calendar Sync**: Inserts events directly into the owner's Google Calendar using a Service Account.
6. **Automated Confirmation Emails**: Responsive HTML emails sent to clients via Resend SDK.
7. **Protected Owner Panel**: Real-time admin dashboard providing analytics (total bookings, revenue, upcoming slots) with features to manually verify payments, reschedule, reassign Zoom meetings, or export CSV logs.

---

## Folder Structure

```text
├── prisma/
│   └── schema.prisma          # Database schema (SQLite / PostgreSQL-ready)
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── login/         # Admin login screen
│   │   │   └── page.tsx       # Interactive owner panel
│   │   ├── api/
│   │   │   ├── admin/         # Admin login, logout, and bookings APIs
│   │   │   ├── availability/  # Calendar free/busy slots finder
│   │   │   ├── pay/           # Razorpay Order creation and verify APIs
│   │   │   └── webhook/       # Idempotent webhook listener
│   │   ├── success/           # Booking confirmation screen
│   │   ├── globals.css        # Tailwind v4 globals & custom animations
│   │   ├── layout.tsx         # Root layout with SEO metadata
│   │   └── page.tsx           # Interactive landing page & form
│   └── lib/
│       ├── calendar.ts        # Google Calendar API wrapper (Service Account)
│       ├── email.ts           # Resend email notification client
│       ├── prisma.ts          # Singleton Prisma database connector
│       ├── razorpay.ts        # Razorpay payments utility
│       └── zoom.ts            # Zoom Server-to-Server OAuth client
├── .env.example               # Template environmental variables
└── package.json               # Next.js configurations & dependencies
```

---

## Setup & Local Installation

### Prerequisites
- Node.js (v18.x or later)
- npm or yarn

### 1. Clone & Install Dependencies
```bash
# Install NPM packages
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory and copy the contents from `.env.example`:
```bash
cp .env.example .env
```
Provide your API keys inside `.env`. The codebase includes automatic mock fallbacks for Zoom, Google Calendar, and Resend so you can test the entire payment redirect locally without setting up credentials initially.

### 3. Initialize SQLite Database
Sync the Prisma schema and create your local SQLite dev database file:
```bash
npx prisma db push
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environmental Credentials Configuration

| Environment Variable | Description / How to Obtain |
| :--- | :--- |
| `DATABASE_URL` | SQLite path: `"file:./dev.db"`. For production, change provider to `postgresql` in `schema.prisma`. |
| `RAZORPAY_KEY_ID` | API Key from your Razorpay Dashboard (Settings -> API Keys). |
| `RAZORPAY_KEY_SECRET` | API Secret key from your Razorpay Dashboard. |
| `RAZORPAY_WEBHOOK_SECRET` | Secret you input when configuring the Razorpay webhook endpoint (`/api/webhook/razorpay`). |
| `ZOOM_ACCOUNT_ID` | Account ID from the Zoom App Marketplace (Server-to-Server OAuth App). |
| `ZOOM_CLIENT_ID` | Client ID from the Server-to-Server OAuth credentials. |
| `ZOOM_CLIENT_SECRET` | Client Secret from the Server-to-Server OAuth credentials. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service Account client email from Google Cloud Console. |
| `GOOGLE_PRIVATE_KEY` | Private key string. Make sure to wrap it in quotes and replace literal newlines with `\n`. |
| `GOOGLE_CALENDAR_ID` | The target Gmail address or calendar ID. Share this calendar with the Service Account email. |
| `RESEND_API_KEY` | API Key from your Resend Dashboard. |
| `EMAIL_FROM` | Sender address verified on Resend (Defaults to: `Meta Vibronics <onboarding@resend.dev>`). |
| `ADMIN_PASSWORD` | Secure password for administrative dashboard authentication. |

---

## Production Deployment (Vercel-Ready)

This application is ready to deploy on **Vercel** with full serverless function execution.

### Production Recommendations
1. **Database Migration**: SQLite is write-locked on read-only serverless filesystems. For production deployment, migrate the database connection to a hosted PostgreSQL, MySQL, or Neon DB:
   - Edit `prisma/schema.prisma` datasource:
     ```prisma
     datasource db {
       provider = "postgresql"
       url      = env("DATABASE_URL")
     }
     ```
   - Update `DATABASE_URL` in your Vercel Environment Variables.
2. **Environment Variables**: Add all environment variables listed in `.env.example` directly within the Vercel Project Settings.
3. **Webhooks Setup**: Configure a webhook inside your Razorpay Dashboard:
   - Target URL: `https://your-domain.com/api/webhook/razorpay`
   - Active Events: `payment.captured` and `order.paid`
   - Set the webhook secret to match `RAZORPAY_WEBHOOK_SECRET`.
