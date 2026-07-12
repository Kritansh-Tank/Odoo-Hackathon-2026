<div align="center">

# 🚌 TransitOps

### Smart Transport Operations Platform

**A full-stack fleet management system built for the Odoo Hackathon 2026**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)
[![Groq](https://img.shields.io/badge/AI-Groq-F55036)](https://groq.com)

</div>

---

## Overview

TransitOps digitizes and streamlines transport fleet operations — from vehicle registration and driver management to AI-assisted trip dispatch, maintenance tracking, and financial analytics. Built as a solo hackathon project in 8 hours, it delivers a production-quality platform with real-time updates, role-based access control, and AI integrations.

---

## ✨ Features

### Core Modules

| Module | Description |
|--------|-------------|
| **Dashboard** | KPI overview, fleet utilization donut chart, recent trips, license expiry alerts |
| **Vehicle Registry** | Full CRUD with search, filter, sort; document management; status history |
| **Driver Management** | Safety scores, license expiry tracking, automated email reminders |
| **Trip Dispatching** | 4-step wizard with AI risk assessment before dispatch; full status lifecycle |
| **Maintenance** | Work order management with automatic vehicle status transitions |
| **Fuel & Expenses** | Fuel efficiency tracking, expense categorization, cost summaries |
| **Reports & Analytics** | Charts, CSV and PDF exports with date/type/region filters |
| **Notifications** | Real-time in-app notifications via Supabase Realtime |
| **Settings** | RBAC user management, system config, dark/light mode |

### AI Features (Powered by Groq)

- **🤖 AI Dispatch Advisor** — Analyzes driver safety score, vehicle condition, cargo weight, and distance before dispatch. Returns a risk level (Low / Medium / High) with recommendations.
- **🔧 Maintenance Summary Generator** — Auto-generates a professional maintenance completion report when a work order is closed.
- **📧 License Expiry Reminders** — Drafts personalized email reminders for drivers with expiring licenses, sent via Resend.

### Business Rules Enforced

1. Registration numbers must be unique
2. Retired / In Shop vehicles excluded from dispatch pool
3. Expired license / Suspended drivers excluded from dispatch pool
4. Driver or vehicle already On Trip cannot be re-assigned
5. Cargo weight exceeding vehicle capacity is blocked
6. Dispatching a trip sets vehicle + driver → **On Trip**
7. Completing a trip sets vehicle + driver → **Available**
8. Cancelling a dispatched trip sets vehicle + driver → **Available**
9. Creating maintenance sets vehicle → **In Shop**
10. Closing maintenance sets vehicle → **Available**

### 💎 Premium UX & Security Enhancements

- **🎨 Interactive Landing Page** (`/` root): Features dynamic HSL styling, glowing ambient backdrops, an interactive accordion showcasing the 5 RBAC roles and their privileges, and links for instant launch.
- **⚡ Quick Demo Login Selector**: Built a click-to-fill button grid on the `/login` page to easily authenticate as any of the 5 pre-seeded role accounts with a single click.
- **🔒 Page & Query-Level RBAC Guards**: Integrates route validators (`isRouteAllowed`) that prevent direct URL bar bypass by rendering a custom "Access Restricted" warning screen. Operates alongside query-level profile filtering (e.g. Drivers only fetch and aggregate their own logged fuel logs and trips).
- **📱 Mobile-Native Navigation**: Sidebar hides automatically on mobile devices and is replaced by a sticky top header with brand details, tagline, and chevron dropdown to maximize content screen space.
- **🌌 Escaped Modals Context**: Utilizes React Portals (`ModalPortal.tsx`) to render modals outside the dashboard layout stacking context directly into `document.body` for perfect overlays.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Server Actions) |
| **Styling** | Tailwind CSS v4 (CSS-first, no config file) |
| **UI / Icons** | Lucide React, Framer Motion |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (email + password) |
| **AI** | Groq Cloud API (`groq-sdk`) |
| **Email** | Resend |
| **PDF Export** | `@react-pdf/renderer` |
| **State** | Zustand (global) + TanStack React Query (server) |
| **Forms** | React Hook Form + Zod |
| **Toasts** | Sonner |
| **Language** | TypeScript 5 |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key
- A [Resend](https://resend.com) API key (for email reminders)

### 1. Clone the repository

```bash
git clone https://github.com/Kritansh-Tank/Odoo-Hackathon-2026.git
cd Odoo-Hackathon-2026/transitops
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the `transitops/` root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Groq AI
GROQ_API_KEY=your-groq-api-key

# Resend (email)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### 4. Set up the database

Run the SQL migrations in your Supabase SQL editor (in this order):

```bash
# 1. Schema migration file:
supabase/migrations/20260712000001_initial_schema.sql

# 2. Seed data & role accounts file:
supabase/migrations/20260712000002_seed_and_admin.sql
```

This creates all database tables, enums, RLS policies, seed resources, and the 5 demo role users.

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the login page.

### 👤 Demo Credentials & RBAC

The seed database migration automatically provisions **all 5 role accounts** for demonstration:

| Role | Email | Password |
|------|-------|----------|
| **Admin (Owner)** | `admin@transitops.com` | `Admin@123` |
| **Fleet Manager** | `manager@transitops.com` | `Manager@123` |
| **Safety Officer** | `safety@transitops.com` | `Safety@123` |
| **Financial Analyst** | `finance@transitops.com` | `Finance@123` |
| **Driver** | `driver@transitops.com` | `Driver@123` |

### 📊 Role Permissions Matrix

The following table represents what each user role is authorized to access and perform across the platform:

| Feature / Action | Admin (Owner) | Fleet Manager | Safety Officer | Financial Analyst | Driver |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **User Role Promotion** | ✅ Full Access | ❌ Restricted | ❌ Restricted | ❌ Restricted | ❌ Restricted |
| **System Settings** | ✅ Full Access | ❌ Restricted | ❌ Restricted | ❌ Restricted | ❌ Restricted |
| **Reports & PDF Export** | ✅ View & Export | ✅ View & Export | ❌ Restricted | ✅ View & Export | ❌ Restricted |
| **Trips & AI Dispatch** | ✅ Full Control | ✅ Full Control | ❌ Restricted | ❌ Restricted | 👁️ View Assigned |
| **Vehicle Registry** | ✅ Full Control | ✅ Full Control | ❌ Restricted | ❌ Restricted | ❌ Restricted |
| **Driver Management** | ✅ Full Control | ✅ Full Control | 📝 Update Safety/Renew | ❌ Restricted | ❌ Restricted |
| **Maintenance Logs** | ✅ Full Control | ✅ Full Control | ❌ Restricted | ❌ Restricted | ❌ Restricted |
| **Fuel & Expense Logs** | ✅ Full Control | ✅ Full Control | ❌ Restricted | 📝 Audit & Log | 📝 Log Own |
| **In-App Notifications** | ✅ Receive All | ✅ Receive All | ✅ Receive All | ✅ Receive All | ✅ Receive All |

> **Note:** Administrators can navigate to **Settings → Users** to promote or demote any registered user's role on the fly.

---

## 📁 Project Structure

```
transitops/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx           # Sidebar + Topbar shell
│   │   ├── dashboard/           # Main KPI dashboard
│   │   ├── vehicles/            # Vehicle registry + [id] detail
│   │   ├── drivers/             # Driver profiles + [id] detail
│   │   ├── trips/               # Trip management + [id] detail
│   │   ├── maintenance/         # Maintenance log management
│   │   ├── fuel-expenses/       # Fuel & expense tracking
│   │   ├── reports/             # Analytics
│   │   ├── notifications/       # Notification center
│   │   └── settings/            # RBAC + system settings
│   ├── api/
│   │   ├── ai/
│   │   │   ├── dispatch-advisor/    # Groq trip risk assessment
│   │   │   ├── maintenance-summary/ # Groq work order summary
│   │   │   └── license-reminder/    # Groq + Resend email
│   │   └── trips/[id]/
│   │       ├── dispatch/
│   │       ├── complete/
│   │       └── cancel/
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts         # Supabase auth exchange handler
│   ├── login/                   # Auth page
│   └── globals.css              # Tailwind v4 design tokens
├── components/
│   ├── dashboard/               # KPICard, FleetGauge (2D SVG donut)
│   ├── drivers/                 # DriverFormModal
│   ├── layout/                  # Sidebar, Topbar
│   ├── trips/                   # TripFormWizard, CompleteTripModal
│   ├── ui/                      # ModalPortal (React Portal helper)
│   └── vehicles/                # VehicleFormModal
├── lib/
│   ├── supabase/                # client.ts, server.ts
│   ├── business-rules.ts        # All 10 dispatch/status rules
│   ├── groq.ts                  # Groq prompts + client
│   ├── email.ts                 # Resend email client
│   └── utils.ts                 # Shared helpers
├── store/
│   └── useAppStore.ts           # Zustand: theme, sidebar, settings
├── types/
│   └── index.ts                 # TypeScript interfaces
├── supabase/
│   └── migrations/
│       ├── 20260712000001_initial_schema.sql  # Database schema tables & enums
│       └── 20260712000002_seed_and_admin.sql    # Seed data & demo accounts
├── vercel.json                  # Vercel deployment settings & timeouts
├── .vercelignore                # Vercel bundle exclusions
├── next.config.ts               # Next.js bundler settings
└── .env.example                 # Environment configuration template
```

---

## 🎨 Design System

TransitOps uses a custom dark-first design system with a full light mode override:

| Token | Dark | Light |
|-------|------|-------|
| Background | `#08080f` | `#f4f5f7` |
| Card | `#0e0e1a` | `#ffffff` |
| Primary Accent | `#f59e0b` (amber) | `#f59e0b` |
| Text Primary | `#f0f0ff` | `#0f1117` |
| Border | `#1e2035` | `#e2e4e9` |
| Danger | `#ef4444` | `#dc2626` |
| Success | `#22c55e` | `#16a34a` |

---

## 🔐 Role-Based Access Control

| Role | Permissions |
|------|------------|
| **Admin** | Full access — user management, all CRUD, settings |
| **Fleet Manager** | Vehicles, drivers, trips, maintenance |
| **Driver** | Own trips, own fuel logs |
| **Safety Officer** | Read all, write driver safety scores |
| **Financial Analyst** | Read all, write expenses and fuel logs |

---

## 📊 Key Screens

- **Dashboard** — Real-time KPI cards, 2D fleet utilization donut chart, expiry alerts
- **Trip Wizard** — 4-step flow: Route → Assign → AI Review → Dispatch
- **AI Risk Card** — Color-coded risk level with Groq-generated recommendations
- **Reports** — Vehicle ROI, fuel efficiency, operational cost charts with CSV/PDF export

---

## 🧪 Running a Build

```bash
npm run build
```

All TypeScript checks pass. No build errors.

---

## 🚀 Deploy to Vercel

### One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Kritansh-Tank/Odoo-Hackathon-2026)

### Manual deployment steps

1. **Push** your code to GitHub (already done).

2. **Import** the repo on [vercel.com/new](https://vercel.com/new):
   - Set **Root Directory** to `transitops`
   - Framework will be auto-detected as **Next.js**

3. **Add Environment Variables** in the Vercel dashboard (Settings → Environment Variables). Copy every key from [`.env.example`](.env.example):

   | Variable | Where to find it |
   |----------|-----------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
   | `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) |
   | `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys) |
   | `RESEND_FROM_EMAIL` | Your verified sender address |
   | `NEXT_PUBLIC_APP_URL` | Your Vercel URL e.g. `https://transitops.vercel.app` |

4. **Update Supabase Auth callback URL**:
   - Supabase dashboard → Authentication → URL Configuration
   - Add `https://your-deployment.vercel.app/auth/callback` to **Redirect URLs**

5. **Deploy** — Vercel will run `npm run build` automatically.

> **Region:** `vercel.json` targets `bom1` (Mumbai) for lowest latency in India. Change the `regions` field if deploying elsewhere.

> **AI route timeouts:** Groq API calls are given 30 s; the PDF export route gets 60 s. These are set in `vercel.json`.

---

## 📄 License

MIT License - See [LICENSE](./LICENSE.md) file for details

---

<div align="center">
Built for <strong>Odoo Hackathon 2026</strong> · Made with ❤️ by <a href="https://github.com/Kritansh-Tank">Kritansh Tank</a>
</div>
