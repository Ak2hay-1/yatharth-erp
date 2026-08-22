/** Structured user manual — shared by Help page and printable PDF view. */

export type ManualBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "tip"; text: string }
  | { type: "callout"; title: string; text: string };

export type ManualSection = {
  id: string;
  title: string;
  blocks: ManualBlock[];
};

export const MANUAL_TITLE = "YATHARTHA Foods ERP — User Manual";
export const MANUAL_SUBTITLE =
  "A plain-language guide for plant office staff. Follow the steps in order when you are new.";

export const MANUAL_SECTIONS: ManualSection[] = [
  {
    id: "what-it-is",
    title: "What this software is",
    blocks: [
      {
        type: "p",
        text: "YATHARTHA Foods ERP is office software for a frozen / ready-foods manufacturing plant. It helps you buy materials, keep batch stock with expiry, produce finished goods, sell with GST invoices, collect payments, and track quality.",
      },
      {
        type: "ul",
        items: [
          "Items (raw, packing, finished) and recipes",
          "Purchase → goods receipt (GRN) → supplier bills",
          "Production with FEFO stock (oldest expiry used first)",
          "B2B orders, samples/trials, and counter sales",
          "Payments, complaints, SOPs, and reports",
        ],
      },
      {
        type: "callout",
        title: "Not in this version",
        text: "HR/payroll, lab QC hold/release, e-invoice IRN / e-way bill APIs, distributor login, consumer website, or barcode scanners.",
      },
    ],
  },
  {
    id: "getting-started",
    title: "1. Getting started",
    blocks: [
      {
        type: "p",
        text: "Open the ERP in your browser. Sign in with the email and password created for you by the Super Admin. There is no public registration.",
      },
      {
        type: "ol",
        items: [
          "Enter your email and password on the Sign in screen.",
          "You land on the Dashboard.",
          "Use Sign out at the bottom of the left sidebar when you finish.",
        ],
      },
      {
        type: "table",
        headers: ["Role", "What you can do"],
        rows: [
          [
            "Staff",
            "Purchase, GRN, stock, production, sales, quality. No finance, no Settings, no user creation.",
          ],
          [
            "Admin",
            "Everything Staff can do, plus bills, payments, reports, and editing items/parties/recipes. Cannot manage users or Settings.",
          ],
          [
            "Super Admin",
            "Full access including Settings (company, backup) and Users (create logins).",
          ],
        ],
      },
      {
        type: "tip",
        text: "Your name and role are shown at the bottom of the sidebar.",
      },
    ],
  },
  {
    id: "first-setup",
    title: "2. First-time setup (Super Admin)",
    blocks: [
      {
        type: "ol",
        items: [
          "Settings — enter company name, address, GSTIN, FSSAI, phone, and bank details (these print on invoices).",
          "Settings → Users — create Admin and Staff accounts; change default passwords.",
          "Masters → Items — add raw, packing, and finished SKUs.",
          "Masters → Parties — add suppliers and customers.",
          "Masters → Recipes — link each finished product to its ingredients.",
          "Optional: upload SOPs under Quality → SOPs.",
        ],
      },
    ],
  },
  {
    id: "menu",
    title: "3. The menu (sidebar)",
    blocks: [
      {
        type: "table",
        headers: ["Group", "Items", "Meaning"],
        rows: [
          ["Home", "Dashboard, Help", "Today’s picture and this manual"],
          ["Buy", "Purchase orders, Goods receipt, Supplier bills", "Order → receive → bill"],
          ["Make", "Stock, Batches, Movements, Production, Prod. batches", "What you have and what you made"],
          ["Sell", "Sales orders, Samples & trials, Counter sale, Invoices", "Orders and GST bills"],
          ["Money", "Payments, Reports", "Cash in/out and registers"],
          ["Quality", "Complaints, SOPs, Documents", "Feedback and plant files"],
          ["Masters", "Items, Parties, Recipes", "Setup lists"],
          ["Setup", "Settings", "Company and users (Super Admin)"],
        ],
      },
      {
        type: "p",
        text: "Use the search box at the top of the sidebar (Invoice, party, SKU) to find a customer, supplier, invoice number, or item code quickly.",
      },
    ],
  },
  {
    id: "glossary",
    title: "4. Important words",
    blocks: [
      {
        type: "table",
        headers: ["Word", "Meaning"],
        rows: [
          ["Item / SKU", "A product code — raw, packing, or finished"],
          ["Party", "A customer, supplier, or both"],
          ["PO", "Purchase order from a supplier"],
          ["GRN", "Goods receipt — stock comes in with lot and expiry"],
          ["Batch / lot", "One physical lot with mfg and expiry dates"],
          ["FEFO", "First Expiry, First Out — soonest-expiring stock is used first"],
          ["Work order", "Plan to produce from a recipe"],
          ["Invoice", "GST tax invoice to the customer"],
          ["Draft → Confirmed", "Draft can be edited; Confirmed usually updates stock and locks the document"],
        ],
      },
      {
        type: "tip",
        text: "Never overwrite stock by hand. Always use a document: GRN, production, sale, or Stock adjust.",
      },
    ],
  },
  {
    id: "buying",
    title: "5. Buying stock",
    blocks: [
      {
        type: "p",
        text: "Follow this path: Purchase order → Goods receipt (GRN) → Supplier bill → Pay supplier.",
      },
      {
        type: "ol",
        items: [
          "Buy → Purchase orders → New. Choose supplier, add lines, Save draft, then Confirm PO.",
          "From the confirmed PO, Create GRN. Enter qty received (partial OK), lot number, mfg date, and expiry.",
          "Confirm GRN (stock in) — batches appear in stock.",
          "Admin: Create supplier bill from the GRN, then later record payment under Money → Payments.",
        ],
      },
      {
        type: "tip",
        text: "Confirm the GRN only after you have checked the physical delivery and dates on the bags or cartons.",
      },
    ],
  },
  {
    id: "production",
    title: "6. Making products",
    blocks: [
      {
        type: "ol",
        items: [
          "Make → Production → New. Choose recipe and planned quantity.",
          "Open the work order — check ingredients needed vs stock (shortages are highlighted).",
          "Enter lot number, good output, wastage, QC reject, operator, piece weight, coating check, BMR notes, mfg/expiry.",
          "Complete production — raw materials are consumed by FEFO; finished lot is added to stock.",
          "Review yield and cost under Make → Prod. batches; see the ledger under Movements.",
        ],
      },
    ],
  },
  {
    id: "selling",
    title: "7. Selling (B2B & counter)",
    blocks: [
      {
        type: "p",
        text: "Samples & trials (new B2B buyers)",
      },
      {
        type: "ol",
        items: [
          "Create the party as a Prospect (Masters → Parties or from Samples).",
          "Create a sample / trial sales order; confirm and issue sample GST doc if needed.",
          "Capture trial feedback (taste, size, coating, kitchen wastage, use case).",
          "When they buy for real → Create commercial order.",
        ],
      },
      {
        type: "p",
        text: "B2B commercial order → invoice",
      },
      {
        type: "ol",
        items: [
          "Sell → Sales orders → New — customer, channel, lines, promised date.",
          "Confirm order (credit limit is checked).",
          "Create GST invoice → Confirm invoice (issues stock by FEFO).",
          "Print Tax invoice and/or Delivery challan; fill the cold-chain dispatch checklist.",
          "Record receipt when payment arrives.",
        ],
      },
      {
        type: "p",
        text: "Counter / phone sale (B2C): Sell → Counter sale → add lines → Bill & print invoice (F9). Stock is issued immediately.",
      },
    ],
  },
  {
    id: "money",
    title: "8. Money (payments & reports)",
    blocks: [
      {
        type: "p",
        text: "Available to Admin and Super Admin.",
      },
      {
        type: "ul",
        items: [
          "Payments → New — Receive from customer or Pay supplier; choose mode (Cash/UPI/NEFT/Cheque/Other); allocate to open invoices or bills.",
          "Reports — contribution, GST-style sales and purchase registers, yield, wastage by cause, stock expiring within 30 days, SKU discontinue hints.",
          "Each report section has Download CSV for Excel.",
        ],
      },
    ],
  },
  {
    id: "quality",
    title: "9. Quality",
    blocks: [
      {
        type: "ol",
        items: [
          "Complaints → New — customer, SKU, lot, issue type, description; optionally attach photos.",
          "Advance status: Reported → Root cause → Change → New sample → Customer test → Standardised → Closed.",
          "On a complaint, upload more files and use Download RCA pack (zip of summary + attachments).",
          "SOPs — write procedure text, Mermaid flowchart, optional file; switch Eng-IN/US/UK, Hindi, Marathi.",
          "Documents — upload plant files (PDF/images/Office, up to 25 MB).",
        ],
      },
    ],
  },
  {
    id: "stock",
    title: "10. Stock & inventory",
    blocks: [
      {
        type: "table",
        headers: ["Screen", "Use it for"],
        rows: [
          ["Stock", "Quantity on hand by item"],
          ["Batches", "Lot-wise quantity with expiry"],
          ["Movements", "Every in/out movement"],
          ["Adjust", "Corrections and wastage — tag cause (Production / Freezer / Return / Other)"],
        ],
      },
    ],
  },
  {
    id: "masters",
    title: "11. Masters",
    blocks: [
      {
        type: "ul",
        items: [
          "Items — SKU, name, unit, type, HSN, GST %, shelf life, prices, lane, tier, pack (Admin+ edits).",
          "Parties — customer/supplier, B2B/B2C, GSTIN, credit limit, lifecycle Prospect → Customer.",
          "Recipes — finished SKU + ingredients + output qty; scale preview; language tabs for name/notes.",
          "Product costing — manufacturing cost, USP, B2B / wholesale / distributor / MRP from markup %.",
          "Labelling — ingredient statement + nutrition panel; print preview for pack artwork.",
          "Product images — pack shots and record photos linked to SKUs.",
        ],
      },
      {
        type: "tip",
        text: "Staff can view items and parties but cannot create or edit them.",
      },
    ],
  },
  {
    id: "dashboard",
    title: "12. Dashboard",
    blocks: [
      {
        type: "p",
        text: "Open the Mentor operating dashboard every morning. It shows sales, contribution, yield, repeat orders, rejection, wastage, complaints, on-time delivery, low stock, near-expiry, and credit risk. Answer the monthly mentor questions and save what the plant will improve.",
      },
    ],
  },
  {
    id: "settings",
    title: "13. Settings & backup",
    blocks: [
      {
        type: "ul",
        items: [
          "Company details print on invoices — keep GSTIN and FSSAI correct.",
          "Default rate markups (B2B, wholesale, distributor, MRP %) for Product costing.",
          "Users — only Super Admin creates logins; can deactivate, change role, reset password.",
          "Backup & restore — download the database, or turn on automatic backup to a folder (USB / cloud) with a time and interval. Restore only when you intend to replace current data.",
        ],
      },
      {
        type: "tip",
        text: "Keep automatic backups on a USB drive or cloud folder. The app must be open at the scheduled time; a missed backup runs the next time you open it.",
      },
    ],
  },
  {
    id: "daily",
    title: "14. Typical daily checklist",
    blocks: [
      {
        type: "ol",
        items: [
          "Dashboard — low stock, expiry, KPIs.",
          "Confirm GRNs for materials that arrived.",
          "Complete production work orders for today.",
          "Process sales orders / counter bills; print invoices and challans.",
          "Log complaints the same day.",
          "Admin: record payments.",
          "Super Admin: set automatic backup in Settings, or take a backup after a busy day.",
        ],
      },
    ],
  },
  {
    id: "problems",
    title: "15. Common problems",
    blocks: [
      {
        type: "table",
        headers: ["Problem", "What to try"],
        rows: [
          ["Cannot see Payments / Reports / Bills", "You are Staff — ask Admin or get your role upgraded"],
          ["Cannot confirm invoice / order", "Check customer credit limit and available stock"],
          ["Stock looks wrong", "Audit Movements; correct with Adjust — do not invent numbers"],
          ["No login / wrong password", "Ask Super Admin (Settings → Users)"],
          ["Invoice header wrong / blank", "Super Admin must fill Settings company details"],
          ["Menu item missing", "Your role does not include that area"],
        ],
      },
    ],
  },
  {
    id: "pdf",
    title: "16. Save this manual as PDF (phone-friendly)",
    blocks: [
      {
        type: "ol",
        items: [
          "In the app, open Help and click Save as PDF — or open /print/help while signed in.",
          "In the browser print dialog choose Save as PDF / Microsoft Print to PDF.",
          "Send the file to your phone (WhatsApp, email, Drive, or USB).",
          "On GitHub, open docs/USER_MANUAL.md and use the browser Print → Save as PDF.",
        ],
      },
    ],
  },
];
