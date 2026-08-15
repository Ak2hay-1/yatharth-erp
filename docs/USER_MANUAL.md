# YATHARTHA Foods ERP — User Manual

**For plant office staff** · Easy guide for new users  
**Version:** matches the current app · **Last updated:** August 2026

---

## How to use this manual

| You want to… | Go to |
|---|---|
| Sign in and learn the screen | [Getting started](#1-getting-started) |
| See what each menu does | [The menu (sidebar)](#2-the-menu-sidebar) |
| Buy raw materials | [Buying stock](#4-buying-stock-purchase--grn--bills) |
| Make finished goods | [Production](#5-making-products-production) |
| Sell to hotels / shops / counter | [Selling](#6-selling-b2b--b2c) |
| Take or make payments | [Money](#7-money-payments--reports) |
| Handle quality issues | [Quality](#8-quality-complaints--documents) |
| Save a PDF on your phone | [Save as PDF](#15-save-this-manual-as-pdf) |

**In the app:** open **Help** in the left sidebar (under Home).  
**On GitHub:** this file lives at `yatharth-erp/docs/USER_MANUAL.md`.  
**On phone:** open Help → **Save as PDF**, or open the print page and use your browser’s Print → Save as PDF.

---

## What this software is

**YATHARTHA Foods ERP** is office software for a frozen / ready-foods manufacturing plant. It helps you:

1. Keep a list of **items** (raw, packing, finished) and **recipes**
2. **Buy** materials, receive them with **lot & expiry**, and pay suppliers
3. **Produce** finished batches (using oldest stock first — FEFO)
4. **Sell** to B2B customers and at the counter (with GST invoices)
5. Track **payments**, **complaints**, and **reports**

It is meant for **one office PC** (or a small team sharing the same system). There is **no public sign-up** — your Super Admin creates your login.

### What this version does *not* include

HR/payroll, lab QC hold/release, government e-invoice (IRN) / e-way bill APIs, distributor login, consumer website, or barcode scanners.

---

## 1. Getting started

### 1.1 Sign in

1. Open the ERP in your browser (usually `http://localhost:3000` on the office PC).
2. Enter the **email** and **password** given to you by the Super Admin.
3. Click **Sign in**.

If you do not have a login, ask your **Super Admin** — you cannot create your own account.

After signing in you land on the **Dashboard**.

### 1.2 Sign out

At the bottom of the left sidebar, click **Sign out**.

### 1.3 Your role (what you can see)

| Role | What you can do |
|---|---|
| **Staff** | Day-to-day work: purchase, GRN, stock, production, sales, quality. **No** finance (bills, payments, reports), **no** recipes edit in menu, **no** Settings. |
| **Admin** | Everything Staff can do, **plus** supplier bills, payments, reports, and creating/editing masters (items, parties, recipes). **Cannot** manage users or company Settings. |
| **Super Admin** | Full access, including **Settings** (company details, backup) and **Users** (create logins). |

Your name and role appear at the bottom of the sidebar.

### 1.4 First-time setup (Super Admin only)

Do this once when the plant starts using the system:

1. **Settings** → fill **company** trade name, legal name, address, **GSTIN**, **FSSAI**, phone, bank details (these print on invoices).
2. **Settings → Users** → create Admin and Staff accounts. Change default passwords.
3. **Masters → Items** → add raw, packing, and finished SKUs.
4. **Masters → Parties** → add suppliers and customers.
5. **Masters → Recipes** → link each finished product to its ingredients.
6. **Masters → Product costing** / **Labelling** as needed for rates and pack copy.
7. Optional: upload SOPs under **Quality → SOPs**.

---

## 2. The menu (sidebar)

The left sidebar is grouped like a plant day:

| Group | Menu items | Plain meaning |
|---|---|---|
| **Home** | Dashboard, Help | Today’s picture + this manual |
| **Buy** | Purchase orders, Goods receipt, Supplier bills | Order → receive → bill |
| **Make** | Stock, Batches, Movements, Production, Prod. batches | What you have and what you made |
| **Sell** | Sales orders, Samples & trials, Counter sale, Invoices | Orders and GST bills |
| **Money** | Payments, Reports | Cash in/out and registers |
| **Quality** | Complaints, SOPs, Documents | Feedback and plant files |
| **Masters** | Items, Parties, Recipes, Product costing, Labelling, Product images | Master lists (setup data) |
| **Setup** | Settings | Company + users (Super Admin) |

### Search

At the top of the sidebar, type in **Invoice, party, SKU** and press Enter. Use this to jump to a customer, supplier, invoice number, or item code quickly.

---

## 3. Important words (glossary)

| Word | Meaning |
|---|---|
| **Item / SKU** | A product code — raw material, packing, or finished goods |
| **Party** | A customer, a supplier, or both |
| **PO** | Purchase order — what you ordered from a supplier |
| **GRN** | Goods receipt note — when material arrives and goes into stock |
| **Batch / lot** | One physical lot with manufacturing and **expiry** date |
| **FEFO** | First Expiry, First Out — the system issues stock that expires soonest first |
| **Work order** | A plan to produce a finished product from a recipe |
| **BMR** | Batch manufacturing record fields filled when you produce |
| **Invoice** | GST tax invoice to the customer |
| **Challan** | Delivery challan for dispatch |
| **Draft → Confirmed** | Draft = still editable; Confirmed = locked and usually updates stock |

**Golden rule:** Never “overwrite” stock by hand. Always use a document (GRN, production, sale, or **Stock adjust**).

---

## 4. Buying stock (Purchase → GRN → Bills)

### Step A — Create a purchase order

1. Go to **Buy → Purchase orders →** New (or open an existing draft).
2. Choose the **supplier** and add **lines** (item + quantity).
3. **Save draft**, then **Confirm PO** when the order is final.

### Step B — Receive goods (GRN)

1. From the confirmed PO, **Create GRN** (or **Buy → Goods receipt → New**).
2. Enter **quantity received** (partial receipts are OK).
3. For each line enter **lot number**, **manufacturing date**, and **expiry date**.
4. Click **Confirm GRN (stock in)**.  
   → Stock and batches are created.

### Step C — Supplier bill (Admin / Super Admin)

1. From the confirmed GRN, **Create supplier bill**.
2. Review GST amounts on **Buy → Supplier bills**.
3. Later, pay from **Money → Payments** (Pay supplier).

**Tip:** Always confirm the GRN only after you have checked the physical delivery and dates on the bags/cartons.

---

## 5. Making products (Production)

### Step A — Work order

1. Go to **Make → Production →** New.
2. Choose the **recipe** and **planned quantity**.
3. Open the work order — the screen shows ingredients needed vs stock on hand (shortages are highlighted).

### Step B — Produce the batch

1. Enter **lot number**, **good output**, **wastage**, **QC reject**, operator, piece weight, coating check, BMR notes, mfg/expiry.
2. Click **Complete production**.  
   → Raw materials are consumed by **FEFO**.  
   → Finished goods lot is added to stock.

### Step C — Review

- **Make → Prod. batches** — see yield and cost for each run.
- **Make → Movements** — full stock ledger.

---

## 6. Selling (B2B & B2C)

### 6.1 Samples & trials (new B2B customers)

Use this path when winning a new hotel / restaurant / institutional buyer:

1. Create the party as a **Prospect** under **Masters → Parties** (or from Samples).
2. **Sell → Samples & trials** or create a **sample / trial** sales order.
3. Confirm and issue a sample GST document if needed.
4. Capture **trial feedback** (taste, size, coating, kitchen wastage, use case).
5. When they buy for real → **Create commercial order**.

### 6.2 B2B commercial order → invoice

1. **Sell → Sales orders →** New — choose customer, channel, lines, promised date.
2. Save draft → **Confirm order** (credit limit is checked).
3. **Create GST invoice** → review lines → **Confirm invoice** (issues stock by FEFO).
4. Print **Tax invoice** and/or **Delivery challan**.
5. Fill the **cold-chain dispatch checklist** (vehicle, freezer OK, seals, customer freezer note).
6. Record payment when money comes in.

**Repeat last order:** from a party or invoice screen you can start a new order from a previous one.

### 6.3 Counter / phone sale (B2C)

1. **Sell → Counter sale**.
2. Choose customer, add lines (stock hints show availability).
3. **Bill & print invoice (F9)** — creates a confirmed GST invoice immediately and issues stock.

### 6.4 Invoices list

**Sell → Invoices** shows all GST invoices. Open one to print, dispatch, or receive payment.

---

## 7. Money (Payments & Reports)

*(Admin and Super Admin)*

### Payments

1. **Money → Payments →** New.
2. Choose **Receive** (customer) or **Pay supplier**.
3. Enter amount and mode: Cash / UPI / NEFT / Cheque / Other.
4. **Allocate** the amount to open invoices or supplier bills.

### Reports

**Money → Reports** includes:

- Contribution / sales view
- GST-style **sales register** and **purchase register**
- Production **yield**
- **Wastage** by cause
- Stock **expiring within 30 days**
- Flags that help decide which SKUs to discontinue
- **Download CSV** on each section for Excel

---

## 8. Quality (Complaints & documents)

### Complaints loop

1. **Quality → Complaints →** New — customer, SKU, lot, issue type, description; optionally attach photos.
2. Move the case through:  
   **Reported → Root cause → Change → New sample → Customer test → Standardised → Closed**
3. Fill root cause, correction, resample notes, and link to SOP/BMR/QC notes as needed.
4. Upload more images/documents on the complaint, then **Download RCA pack** (zip of summary + files).

### SOPs and documents

- **Quality → SOPs** — write procedure text, add a Mermaid flowchart, optionally attach a file (up to 25 MB). Switch language: Eng-IN / Eng-US / Eng-UK / Hindi / Marathi.
- **Quality → Documents** — other plant files (FSSAI, training, policy, etc.).

---

## 9. Stock & inventory

| Screen | Use it for |
|---|---|
| **Stock** | How much of each item is on hand |
| **Batches** | Lot-wise qty with expiry (FEFO view) |
| **Movements** | Every in/out: purchase, production, sale, waste, adjust |
| **Adjust** | Corrections and wastage (tag cause: Production / Freezer / Return / Other) |

Negative adjust issues stock by FEFO. Always tag the **cause** so reports stay meaningful.

---

## 10. Masters (setup data)

| Master | Who edits | What to enter |
|---|---|---|
| **Items** | Admin+ | SKU, name, unit, type (raw/packing/finished), HSN, GST %, shelf life, prices, lane, tier, pack |
| **Parties** | Admin+ | Name, customer/supplier/both, B2B/B2C, GSTIN, credit limit, payment terms, lifecycle (Prospect → Customer) |
| **Recipes** | Admin+ | Finished SKU + ingredient lines + output qty; language tabs for translated names/notes |
| **Product costing** | Admin+ (Finance can view) | Manufacturing cost, USP, B2B / wholesale / distributor / MRP from markup % |
| **Labelling** | Admin+ | Ingredient statement + nutrition panel; print preview for pack artwork |
| **Product images** | Ops | Pack shots and record photos linked to SKUs |

Staff can **view** items and parties but cannot create/edit them.

---

## 11. Dashboard (daily picture)

The **Mentor operating dashboard** shows:

- Sales, contribution %, production yield, repeat-order rate
- Rejection %, wastage %, complaints %, on-time delivery
- Low stock and near-expiry warnings
- Credit risk hints
- Monthly mentor questions — save what the plant will improve this month

Open it every morning before planning purchases and production.

---

## 12. Settings & backup (Super Admin)

1. **Settings** — company GSTIN, FSSAI, address, bank (appear on printed invoices).
2. **Default rate markups** — B2B, wholesale, distributor, MRP % used by Product costing.
3. **Settings → Users** — create Admin / Staff / Super Admin; deactivate, change role, or reset password.
4. **Backup & restore** — download a copy of the SQLite database (`.db`) regularly; restore only when you intend to replace current data.

**Tip:** Keep backups on a USB drive or cloud folder after each busy day.

---

## 13. Typical daily checklist

1. Open **Dashboard** — check low stock, expiry, KPIs.
2. Confirm any pending **GRNs** for materials that arrived.
3. Complete **production** work orders planned for today.
4. Process **sales orders** / **counter** bills; print invoices & challans.
5. Log any **complaints** the same day.
6. (Admin) Record **payments** received or paid.
7. (Super Admin, periodically) Take a **backup**.

---

## 14. Common problems & fixes

| Problem | What to try |
|---|---|
| Cannot see Payments / Reports / Bills | You are **Staff** — ask Admin, or get your role upgraded |
| Cannot confirm invoice / order | Check **credit limit** on the customer; check stock |
| Stock looks wrong | Use **Movements** to audit; correct with **Adjust**, not by editing numbers |
| No login / wrong password | Ask **Super Admin** (Settings → Users) |
| Invoice print blank / wrong header | Super Admin must fill **Settings** company details |
| Menu item missing | Your role does not include that area — see [Your role](#13-your-role-what-you-can-see) |

---

## 15. Save this manual as PDF

### From the app (best for phone)

1. Sign in → sidebar **Help**.
2. Click **Save as PDF** (opens the print view).
3. In the browser dialog choose **Save as PDF** / **Microsoft Print to PDF**.
4. Send the file to your phone (WhatsApp, email, Drive, USB).

### Direct print URL

While signed in, open: `/print/help`  
Then use the browser **Print** button.

### From GitHub

Open `docs/USER_MANUAL.md` on GitHub → use your browser’s print / reader mode → Save as PDF.

---

## 16. Quick role cheat-sheet

| Task | Staff | Admin | Super Admin |
|---|:---:|:---:|:---:|
| Purchase, GRN, production, sales | ✓ | ✓ | ✓ |
| View items & parties | ✓ | ✓ | ✓ |
| Create/edit items, parties, recipes | | ✓ | ✓ |
| Supplier bills, payments, reports | | ✓ | ✓ |
| Company settings, users, backup | | | ✓ |

---

## Need more help?

- Ask your plant **Admin** or **Super Admin**.
- Keep this PDF on your phone for the first few weeks.
- For software setup (Node, database seed), see the developer `README.md` — that is for IT, not daily operators.

---

*YATHARTHA Foods & Beverages · Plant office ERP*
