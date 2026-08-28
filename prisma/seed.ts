import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedDatabase() {
  const ownerPassword = await hash("Yatharth@Owner1", 10);

  await prisma.websiteSyncQueueItem.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.user.deleteMany();
  await prisma.monthlyReview.deleteMany();
  await prisma.complaintAttachment.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.paymentAllocation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.deliveryChallan.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.salesOrderLine.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.productionBatch.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.supplierBillLine.deleteMany();
  await prisma.supplierBill.deleteMany();
  await prisma.goodsReceiptLine.deleteMany();
  await prisma.goodsReceipt.deleteMany();
  await prisma.purchaseOrderLine.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.stockMove.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.recipeTranslation.deleteMany();
  await prisma.recipeLine.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.labelIngredientLine.deleteMany();
  await prisma.itemLabel.deleteMany();
  await prisma.itemCostAttachment.deleteMany();
  await prisma.productAsset.deleteMany();
  await prisma.sopTranslation.deleteMany();
  await prisma.plantDocument.deleteMany();
  await prisma.item.deleteMany();
  await prisma.party.deleteMany();
  await prisma.sequence.deleteMany();
  await prisma.company.deleteMany();

  await prisma.user.create({
    data: {
      name: "Owner",
      email: "admin@yatharthafoods.in",
      passwordHash: ownerPassword,
      role: "SUPER_ADMIN",
    },
  });

  await prisma.company.create({
    data: {
      id: "default",
      name: "YATHARTHA Foods & Beverages",
      legalName: "YATHARTHA Foods & Beverages",
      gstin: "",
      fssai: "21526037002727",
      address: "Shop No. 29, Harshal Heights",
      city: "Pune",
      state: "Maharashtra",
      stateCode: "27",
      pincode: "411033",
      phone: "7028832038",
      email: "admin@yatharthafoods.in",
      bankName: "",
      bankAccount: "",
      ifsc: "",
      markupB2bPct: 20,
      markupWholesalePct: 25,
      markupDistributorPct: 35,
      markupMrpPct: 50,
    },
  });

  const items = await Promise.all([
    prisma.item.create({
      data: {
        sku: "RM-POTATO",
        name: "Potato",
        type: "RAW",
        unit: "kg",
        hsn: "0701",
        gstRate: 0,
        shelfLifeDays: 20,
        reorderLevel: 200,
        purchasePrice: 18,
      },
    }),
    prisma.item.create({
      data: {
        sku: "RM-CHICKEN",
        name: "Chicken boneless",
        type: "RAW",
        unit: "kg",
        hsn: "0207",
        gstRate: 5,
        shelfLifeDays: 5,
        reorderLevel: 50,
        purchasePrice: 220,
      },
    }),
    prisma.item.create({
      data: {
        sku: "RM-ONION",
        name: "Onion",
        type: "RAW",
        unit: "kg",
        hsn: "0703",
        gstRate: 0,
        shelfLifeDays: 25,
        reorderLevel: 80,
        purchasePrice: 22,
      },
    }),
    prisma.item.create({
      data: {
        sku: "RM-OIL",
        name: "Refined oil",
        type: "RAW",
        unit: "L",
        hsn: "1507",
        gstRate: 5,
        shelfLifeDays: 180,
        reorderLevel: 40,
        purchasePrice: 130,
      },
    }),
    prisma.item.create({
      data: {
        sku: "RM-MASALA",
        name: "Kitchen spice mix",
        type: "RAW",
        unit: "kg",
        hsn: "0910",
        gstRate: 5,
        shelfLifeDays: 180,
        reorderLevel: 10,
        purchasePrice: 280,
      },
    }),
    prisma.item.create({
      data: {
        sku: "RM-BREADCRUMB",
        name: "Bread crumbs",
        type: "RAW",
        unit: "kg",
        hsn: "1905",
        gstRate: 5,
        shelfLifeDays: 90,
        reorderLevel: 20,
        purchasePrice: 65,
      },
    }),
    prisma.item.create({
      data: {
        sku: "PK-POUCH-500",
        name: "Pouch 500g",
        type: "PACKING",
        unit: "pcs",
        hsn: "3923",
        gstRate: 18,
        shelfLifeDays: 730,
        reorderLevel: 500,
        purchasePrice: 2.5,
      },
    }),
    prisma.item.create({
      data: {
        sku: "PK-CARTON",
        name: "Outer carton",
        type: "PACKING",
        unit: "pcs",
        hsn: "4819",
        gstRate: 12,
        shelfLifeDays: 730,
        reorderLevel: 100,
        purchasePrice: 18,
      },
    }),
    prisma.item.create({
      data: {
        sku: "FG-VEG-PATTY",
        name: "Veg Burger Patties — Regular (20/pkt)",
        type: "FINISHED",
        unit: "pack",
        hsn: "2106",
        gstRate: 5,
        shelfLifeDays: 90,
        reorderLevel: 40,
        sellingPrice: 320,
        purchasePrice: 0,
        lane: "POTATO_VEG",
        tier: "HERO",
        packType: "HORECA",
        packSize: "20 pcs",
        gateTaste: true,
        gateCost: true,
        gateMargin: true,
        gateProduction: true,
        gatePackaging: true,
        gateShelfLife: true,
        gateAcceptance: true,
        gateRepeat: true,
      },
    }),
    prisma.item.create({
      data: {
        sku: "FG-ALOO-BURGER",
        name: "Aloo Burger Patties — Regular (20/pkt)",
        type: "FINISHED",
        unit: "pack",
        hsn: "2106",
        gstRate: 5,
        shelfLifeDays: 90,
        reorderLevel: 40,
        sellingPrice: 280,
        purchasePrice: 0,
        lane: "POTATO_VEG",
        tier: "HERO",
        packType: "HORECA",
        packSize: "20 pcs",
      },
    }),
    prisma.item.create({
      data: {
        sku: "FG-CRISPY-ALOO",
        name: "Crispy Aloo Patties — Regular (20/pkt)",
        type: "FINISHED",
        unit: "pack",
        hsn: "2106",
        gstRate: 5,
        shelfLifeDays: 90,
        reorderLevel: 40,
        sellingPrice: 300,
        purchasePrice: 0,
        lane: "POTATO_VEG",
        tier: "CORE",
        packType: "HORECA",
        packSize: "20 pcs",
      },
    }),
    prisma.item.create({
      data: {
        sku: "FG-CHEESE-CORN",
        name: "Cheese Corn Nuggets (55/pkt)",
        type: "FINISHED",
        unit: "pack",
        hsn: "2106",
        gstRate: 5,
        shelfLifeDays: 90,
        reorderLevel: 30,
        sellingPrice: 583,
        purchasePrice: 0,
        lane: "POTATO_VEG",
        tier: "CORE",
        packType: "HORECA",
        packSize: "55 pcs",
      },
    }),
    prisma.item.create({
      data: {
        sku: "FG-CHK-PATTY",
        name: "Chicken Burger Patties — Regular (20/pkt)",
        type: "FINISHED",
        unit: "pack",
        hsn: "1602",
        gstRate: 5,
        shelfLifeDays: 60,
        reorderLevel: 30,
        sellingPrice: 420,
        purchasePrice: 0,
        lane: "CHICKEN",
        tier: "HERO",
        packType: "HORECA",
        packSize: "20 pcs",
        gateTaste: true,
        gateCost: true,
        gateMargin: true,
        gateProduction: true,
        gatePackaging: true,
        gateShelfLife: true,
        gateAcceptance: true,
        gateRepeat: false,
      },
    }),
    prisma.item.create({
      data: {
        sku: "FG-CRISPY-CHK",
        name: "Crispy Chicken Burger Patties — Regular (20/pkt)",
        type: "FINISHED",
        unit: "pack",
        hsn: "1602",
        gstRate: 5,
        shelfLifeDays: 60,
        reorderLevel: 25,
        sellingPrice: 450,
        purchasePrice: 0,
        lane: "CHICKEN",
        tier: "HERO",
        packType: "HORECA",
        packSize: "20 pcs",
      },
    }),
    prisma.item.create({
      data: {
        sku: "FG-CHK-BALLS",
        name: "Chicken Cheese Balls (25/pkt)",
        type: "FINISHED",
        unit: "pack",
        hsn: "1602",
        gstRate: 5,
        shelfLifeDays: 60,
        reorderLevel: 25,
        sellingPrice: 550,
        purchasePrice: 0,
        lane: "CHICKEN",
        tier: "CORE",
        packType: "HORECA",
        packSize: "25 pcs",
      },
    }),
    prisma.item.create({
      data: {
        sku: "FG-CHK-CHEESE-NUG",
        name: "Chicken Cheese Nuggets (55/pkt)",
        type: "FINISHED",
        unit: "pack",
        hsn: "1602",
        gstRate: 5,
        shelfLifeDays: 60,
        reorderLevel: 25,
        sellingPrice: 660,
        purchasePrice: 0,
        lane: "CHICKEN",
        tier: "CORE",
        packType: "HORECA",
        packSize: "55 pcs",
      },
    }),
    prisma.item.create({
      data: {
        sku: "FG-PAV-BHAJI",
        name: "Ready pav bhaji mix 500g",
        type: "FINISHED",
        unit: "pcs",
        hsn: "2106",
        gstRate: 5,
        shelfLifeDays: 45,
        reorderLevel: 50,
        sellingPrice: 95,
        purchasePrice: 0,
        lane: "POTATO_VEG",
        tier: "CORE",
        packType: "RETAIL",
        packSize: "500 g",
      },
    }),
    prisma.item.create({
      data: {
        sku: "FG-BTR-CHK",
        name: "Ready butter chicken gravy 1kg",
        type: "FINISHED",
        unit: "pcs",
        hsn: "2106",
        gstRate: 5,
        shelfLifeDays: 30,
        reorderLevel: 25,
        sellingPrice: 220,
        purchasePrice: 0,
        lane: "CHICKEN",
        tier: "CORE",
        packType: "HORECA",
        packSize: "1 kg",
      },
    }),
  ]);

  const bySku = Object.fromEntries(items.map((i) => [i.sku, i]));

  // Flyer reference photos → Product Media (replace with pack shots later)
  const { copyFileSync, existsSync, mkdirSync, statSync } = await import("fs");
  const path = await import("path");
  const docsRoot = path.join(process.cwd(), "uploads", "documents");
  mkdirSync(docsRoot, { recursive: true });
  const refDir = path.join(process.cwd(), "media", "product-refs");
  const photoSkus = [
    "FG-ALOO-BURGER",
    "FG-CRISPY-ALOO",
    "FG-VEG-PATTY",
    "FG-CHEESE-CORN",
    "FG-CHK-PATTY",
    "FG-CRISPY-CHK",
    "FG-CHK-BALLS",
    "FG-CHK-CHEESE-NUG",
  ] as const;
  for (const sku of photoSkus) {
    const src = path.join(refDir, `${sku}.jpg`);
    if (!existsSync(src) || !bySku[sku]) continue;
    const storageKey = `seed-${sku.toLowerCase()}.jpg`;
    const dest = path.join(docsRoot, storageKey);
    copyFileSync(src, dest);
    const sizeBytes = statSync(dest).size;
    await prisma.productAsset.create({
      data: {
        itemId: bySku[sku].id,
        kind: "PACK_SHOT",
        title: "Catalog flyer reference",
        fileName: `${sku}.jpg`,
        mimeType: "image/jpeg",
        sizeBytes,
        storageKey,
        notes: "Cropped from price-list flyer — replace with pack shot when available.",
      },
    });
  }

  await prisma.recipe.create({
    data: {
      finishedItemId: bySku["FG-VEG-PATTY"].id,
      name: "Veg patty — 50 packs",
      outputQty: 50,
      notes: "Standard fryer batch",
      lines: {
        create: [
          { itemId: bySku["RM-POTATO"].id, qty: 18 },
          { itemId: bySku["RM-ONION"].id, qty: 2 },
          { itemId: bySku["RM-BREADCRUMB"].id, qty: 3 },
          { itemId: bySku["RM-MASALA"].id, qty: 0.4 },
          { itemId: bySku["RM-OIL"].id, qty: 2 },
          { itemId: bySku["PK-POUCH-500"].id, qty: 50 },
        ],
      },
    },
  });

  await prisma.recipe.create({
    data: {
      finishedItemId: bySku["FG-CHK-PATTY"].id,
      name: "Chicken patty — 40 packs",
      outputQty: 40,
      lines: {
        create: [
          { itemId: bySku["RM-CHICKEN"].id, qty: 16 },
          { itemId: bySku["RM-ONION"].id, qty: 1.5 },
          { itemId: bySku["RM-BREADCRUMB"].id, qty: 2.5 },
          { itemId: bySku["RM-MASALA"].id, qty: 0.5 },
          { itemId: bySku["RM-OIL"].id, qty: 1.8 },
          { itemId: bySku["PK-POUCH-500"].id, qty: 40 },
        ],
      },
    },
  });

  await prisma.recipe.create({
    data: {
      finishedItemId: bySku["FG-PAV-BHAJI"].id,
      name: "Pav bhaji mix — 40 pouches",
      outputQty: 40,
      lines: {
        create: [
          { itemId: bySku["RM-POTATO"].id, qty: 12 },
          { itemId: bySku["RM-ONION"].id, qty: 4 },
          { itemId: bySku["RM-MASALA"].id, qty: 0.6 },
          { itemId: bySku["RM-OIL"].id, qty: 1.2 },
          { itemId: bySku["PK-POUCH-500"].id, qty: 40 },
        ],
      },
    },
  });

  // Veg patty sample mfg cost from recipe BOM / outputQty
  const vegMfg =
    (18 * 18 + 2 * 22 + 3 * 65 + 0.4 * 280 + 2 * 130 + 50 * 2.5) / 50;
  const vegRates = {
    mfgCost: Math.round(vegMfg * 100) / 100,
    usp: Math.round(vegMfg * 1.2 * 100) / 100,
    rateB2b: Math.round(vegMfg * 1.2 * 100) / 100,
    rateWholesale: Math.round(vegMfg * 1.25 * 100) / 100,
    rateDistributor: Math.round(vegMfg * 1.35 * 100) / 100,
    rateMrp: Math.round(vegMfg * 1.5 * 100) / 100,
    mfgCostSource: "RECIPE" as const,
    mfgCostUpdatedAt: new Date(),
  };
  await prisma.item.update({
    where: { id: bySku["FG-VEG-PATTY"].id },
    data: { ...vegRates, sellingPrice: vegRates.usp },
  });

  await prisma.itemLabel.create({
    data: {
      itemId: bySku["FG-VEG-PATTY"].id,
      ingredientStatement: "Potato, bread crumbs, onion, refined oil, spices",
      allergens: "Contains: wheat (gluten)",
      containsMayContain: "May contain traces of milk, soy",
      claims: "No added preservatives",
      netQuantity: "800 g (10 × 80 g)",
      vegNonVeg: "VEG",
      servingSize: "80 g",
      servingsPerPack: "10",
      energyKcal100: 180,
      energyKj100: 753,
      protein100: 4.2,
      carb100: 22,
      sugars100: 1.5,
      fat100: 8,
      satFat100: 2.1,
      transFat100: 0,
      fibre100: 2.8,
      sodium100: 420,
      energyKcalServe: 144,
      energyKjServe: 602,
      proteinServe: 3.4,
      carbServe: 17.6,
      sugarsServe: 1.2,
      fatServe: 6.4,
      satFatServe: 1.7,
      transFatServe: 0,
      fibreServe: 2.2,
      sodiumServe: 336,
      ingredientLines: {
        create: [
          { name: "Potato", sortOrder: 0, qtyPct: 55 },
          { name: "Bread crumbs", sortOrder: 1, qtyPct: 12 },
          { name: "Onion", sortOrder: 2, qtyPct: 8 },
          { name: "Refined oil", sortOrder: 3, qtyPct: 7 },
          { name: "Spices", sortOrder: 4, qtyPct: 2 },
        ],
      },
    },
  });

  await prisma.party.createMany({
    data: [
      {
        name: "Walk-in customer",
        kind: "CUSTOMER",
        channel: "B2C",
        lifecycle: "CUSTOMER",
        city: "Pune",
        state: "Maharashtra",
        stateCode: "27",
        billingAddress: "Counter sale",
      },
      {
        name: "Sahyadri Frozen Distributors",
        kind: "CUSTOMER",
        channel: "B2B",
        cluster: "DISTRIBUTOR",
        lifecycle: "CUSTOMER",
        gstin: "27AABCS9999B1Z1",
        phone: "9822000001",
        city: "Pune",
        state: "Maharashtra",
        stateCode: "27",
        billingAddress: "Hadapsar Industrial Estate, Pune",
        shippingAddress: "Hadapsar Industrial Estate, Pune",
        creditLimit: 200000,
        reorderCycleDays: 14,
      },
      {
        name: "Cafe Mocha PCMC",
        kind: "CUSTOMER",
        channel: "B2B",
        cluster: "QSR_CAFE",
        lifecycle: "PROSPECT",
        phone: "9890001122",
        city: "Pimpri",
        state: "Maharashtra",
        stateCode: "27",
        billingAddress: "Nigdi, PCMC",
        creditLimit: 25000,
      },
      {
        name: "Hotel Blue Nile",
        kind: "CUSTOMER",
        channel: "B2B",
        cluster: "RESTAURANT_HOTEL",
        lifecycle: "PROSPECT",
        phone: "9822112233",
        city: "Pune",
        state: "Maharashtra",
        stateCode: "27",
        billingAddress: "FC Road, Pune",
        creditLimit: 50000,
      },
      {
        name: "Ahmedabad Modern Trade",
        kind: "CUSTOMER",
        channel: "B2B",
        cluster: "DISTRIBUTOR",
        lifecycle: "CUSTOMER",
        gstin: "24AABCA1111C1Z8",
        phone: "9876500002",
        city: "Ahmedabad",
        state: "Gujarat",
        stateCode: "24",
        billingAddress: "Narol, Ahmedabad",
        creditLimit: 150000,
      },
      {
        name: "Green Valley Farms",
        kind: "SUPPLIER",
        gstin: "27AABCG2222D1Z3",
        phone: "020-25500000",
        city: "Pune",
        state: "Maharashtra",
        stateCode: "27",
        billingAddress: "Khed, Pune",
      },
      {
        name: "Deccan Poultry",
        kind: "SUPPLIER",
        gstin: "27AABCD3333E1Z6",
        city: "Pune",
        state: "Maharashtra",
        stateCode: "27",
        billingAddress: "Shirur, Pune",
      },
    ],
  });

  const today = new Date();
  const add = (days: number) => new Date(today.getTime() + days * 86400000);

  async function openLot(
    sku: string,
    lot: string,
    qty: number,
    mfg: Date,
    expiry: Date,
  ) {
    const item = bySku[sku];
    const batch = await prisma.batch.create({
      data: {
        itemId: item.id,
        lotNo: lot,
        mfgDate: mfg,
        expiryDate: expiry,
        qtyOnHand: qty,
        source: "ADJUST",
        sourceId: "opening",
      },
    });
    await prisma.stockMove.create({
      data: {
        itemId: item.id,
        batchId: batch.id,
        type: "ADJUST",
        qty,
        refType: "OPENING",
        refId: "seed",
        notes: "Opening stock",
      },
    });
  }

  await openLot("RM-POTATO", "OPN-POT-01", 800, add(-2), add(18));
  await openLot("RM-CHICKEN", "OPN-CHK-01", 120, today, add(4));
  await openLot("RM-ONION", "OPN-ONI-01", 250, add(-3), add(22));
  await openLot("RM-OIL", "OPN-OIL-01", 80, add(-10), add(160));
  await openLot("RM-MASALA", "OPN-MAS-01", 25, add(-20), add(160));
  await openLot("RM-BREADCRUMB", "OPN-BRD-01", 60, add(-5), add(80));
  await openLot("PK-POUCH-500", "OPN-PCH-01", 2000, add(-30), add(700));
  await openLot("PK-CARTON", "OPN-CTN-01", 400, add(-30), add(700));
  await openLot("FG-VEG-PATTY", "OPN-VEG-01", 80, add(-1), add(89));
  await openLot("FG-PAV-BHAJI", "OPN-PAV-01", 60, add(-2), add(40));

  console.log("Seeded Yatharth Foods production template.");
  console.log("Login: admin@yatharthafoods.in / Yatharth@Owner1 (change after first login)");
}

async function main() {
  await seedDatabase();
}

const isSeedCli = process.argv.some((arg) =>
  arg.replace(/\\/g, "/").includes("prisma/seed"),
);

if (isSeedCli) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
