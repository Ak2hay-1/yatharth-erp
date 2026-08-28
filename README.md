# Yatharth Foods ERP

Office software for the manufacturing plant: items and recipes, purchase, batch stock with expiry (FEFO), production, B2B and B2C sales, GST invoices, payments, and reports.

**Production URL:** [https://erp.yatharthafoods.in](https://erp.yatharthafoods.in)

**User manual (for new staff):** [docs/USER_MANUAL.md](docs/USER_MANUAL.md) · In the app: **Help** in the sidebar · Print/PDF: `/print/help`

## Run locally

You need [Node.js 20+](https://nodejs.org/) and PostgreSQL. Easiest: Docker for the database.

```bash
cd yatharth-erp
npm install
cp .env.example .env
npm run db:up              # starts Postgres via docker-compose.db.yml
npm run db:setup           # migrate + seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

| Role | Email | Password |
|---|---|---|
| Owner (Super Admin) | admin@yatharthafoods.in | Yatharth@Owner1 |

There is **no public registration**. Only the owner (Super Admin) can create accounts (Settings → Users). Change the seeded password after first login. Put your real GSTIN and bank details under **Settings**. FSSAI is seeded as `21526037002727`.

Without `BLOB_READ_WRITE_TOKEN`, uploads are stored locally under `uploads/documents/` (fine for dev). Production on Vercel uses [Vercel Blob](https://vercel.com/docs/storage/vercel-blob).

## Neon database (production)

Linked to **Yathartha foods** (`solitary-pine-12141341`) in org **rkyves** (`org-plain-sound-63905032`), branch `production`.

```bash
npx neon@latest auth              # once per machine
npx neon@latest link --org-id org-plain-sound-63905032 --project-id solitary-pine-12141341 -y
npm run neon:env                  # refresh DATABASE_URL in .env
npx prisma migrate deploy         # apply migrations (uses DATABASE_URL_UNPOOLED via directUrl)
npx prisma db seed                # optional fresh seed
```

- **Pooled** `DATABASE_URL` — app queries (Vercel/serverless)
- **Direct** `DATABASE_URL_UNPOOLED` — Prisma migrations (`directUrl` in schema)
- File uploads use **Vercel Blob**, not Neon Object Storage
- Agent skills: `.agents/skills/neon*` · MCP: Neon server in Cursor settings

Policy file: [neon.ts](neon.ts)

## Deploy to Vercel

See [docs/DEPLOY.md](docs/DEPLOY.md) and [docs/GO_LIVE_CHECKLIST.md](docs/GO_LIVE_CHECKLIST.md).

Summary: separate Vercel project (repo root `.`), Neon PostgreSQL, Vercel Blob, domain `erp.yatharthafoods.in`.

## Daily flow

1. **Items / recipes** — finished SKUs with lane/tier/pack and SKU gates; recipes for each batch.
2. **Purchase order → GRN** — receive raw materials with lot, mfg and expiry. Confirm GRN to put stock in.
3. **Supplier bill** — GST purchase bill from the GRN.
4. **Work order → Produce** — BMR fields, reject qty, batch unit cost; FEFO consume; finished lot.
5. **Samples & trials** — prospect → sample/trial order → structured feedback → commercial order.
6. **Sales order (B2B)** or **Counter sale (B2C)** — credit limit enforced on commercial confirm; GST invoice; cold-chain dispatch checklist.
7. **Complaints** — closed feedback loop with photo attachments and RCA pack download.
8. **Labelling / Product costing / Product images** — pack copy, USP & channel rates, marketing photos.
9. **Payments** — allocate receipts to invoices and payments to supplier bills.
10. **Dashboard / Reports** — mentor KPIs, CSV export, monthly questions, discontinue list.

Print any confirmed invoice or challan from the invoice screen.

## Roles

- **Super Admin** — full access, company settings, and manual user creation (Admin / Staff / Super Admin).
- **Admin** — day-to-day ops plus finance (bills, payments, reports, masters). Cannot create users.
- **Staff** — day-to-day ops only (purchase, GRN, production, sales, stock). No finance, settings, or account creation.

**Website (separate):** marketing site in `website/` + VM sync API in `services/sync-api/`. Launch steps: [docs/GO_LIVE_CHECKLIST.md](docs/GO_LIVE_CHECKLIST.md).

## Desktop app (paused)

The Windows Electron installer (`electron/`, `npm run desktop:win`) is **on pause** while the ERP runs on Vercel. Source remains in the repo for a possible future return to offline desktop.

## Not in this version

HR/payroll, lab QC hold/release, e-invoice IRN / e-way bill APIs, distributor login, barcode scanners.
