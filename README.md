# Yatharth Foods ERP

Office software for the manufacturing plant: items and recipes, purchase, batch stock with expiry (FEFO), production, B2B and B2C sales, GST invoices, payments, and reports.

**User manual (for new staff):** [docs/USER_MANUAL.md](docs/USER_MANUAL.md) · In the app: **Help** in the sidebar · Print/PDF: `/print/help`

## Run it

You need [Node.js 20+](https://nodejs.org/). From this folder:

```bash
cd yatharth-erp
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in (browser is fine for debugging).

### Desktop app (Electron)

Use the **Yatharth Foods ERP** desktop shortcut, or from this folder:

```bash
npm run electron:dev      # development (starts Next.js with --dev)
npm run electron:start    # production build, then Electron window
```

Electron starts the local Next.js server, opens a real app window (brand icon, no browser chrome), and **stops the server when you close the window**.

### Windows installer (Setup.exe)

Build a full installable package (no Node.js needed on office PCs):

```bash
npm run db:setup          # once — seeds prisma/dev.db used as the template DB
npm run dist:win          # Next standalone + electron-builder NSIS
```

The installer lands in `dist-installer/` as **`Yatharth Foods ERP-Setup-0.1.2.exe`**. Run it to install under Program Files with Start Menu and Desktop shortcuts. App data (SQLite, uploads, backups) is stored under `%AppData%\Yatharth Foods ERP` so it survives reinstalls. After install, the app asks for the Yatharth product key once per PC.

If an older build fails with a timeout on port `3847`, install this newer Setup.exe over it (the Next server must live in `resources/next-server`, not `resources/app`).

Unsigned builds may show a Windows SmartScreen warning until a code-signing certificate is added.

| Role | Email | Password |
|---|---|---|
| Super Admin | superadmin@yatharth.local | Yatharth@123 |
| Admin | admin@yatharth.local | Yatharth@123 |
| Staff | staff@yatharth.local | Yatharth@123 |

There is **no public registration**. Only a Super Admin can create accounts (Settings → Users). Change the seeded passwords after first login. Put your real GSTIN, FSSAI and bank details under **Settings**.

The database is a local SQLite file (`prisma/dev.db`) so it runs on a single office PC without installing PostgreSQL. The data model is relational and can be moved to PostgreSQL later.

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

## Not in this version

HR/payroll, lab QC hold/release, e-invoice IRN / e-way bill APIs, distributor login, barcode scanners.

**Added in this version:** Website sync to VM backend + Vercel marketing site (`website/`, `services/sync-api/`). See [docs/DEPLOY.md](docs/DEPLOY.md).
