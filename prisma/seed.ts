import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const password = await hash("Yatharth@123", 10);

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

  await prisma.user.createMany({
    data: [
      {
        name: "Super Admin",
        email: "superadmin@yatharth.local",
        passwordHash: password,
        role: "SUPER_ADMIN",
      },
      {
        name: "Admin",
        email: "admin@yatharth.local",
        passwordHash: password,
        role: "ADMIN",
      },
      {
        name: "Staff",
        email: "staff@yatharth.local",
        passwordHash: password,
        role: "STAFF",
      },
    ],
  });

  await prisma.company.create({
    data: {
      id: "default",
      name: "YATHARTHA Foods & Beverages",
      legalName: "YATHARTHA Foods & Beverages",
      gstin: "27AABCY1234A1Z5",
      fssai: "11524999000012",
      address: "Shop No. 29, Harshal Heights, Opp. Gawade Petroleum, PCMC Link Road, Gawade Nagar, Chinchwad",
      city: "Pune",
      state: "Maharashtra",
      stateCode: "27",
      pincode: "411033",
      phone: "7028832038",
      email: "accounts@yatharthfoods.in",
      bankName: "HDFC Bank",
      bankAccount: "50200012345678",
      ifsc: "HDFC0000123",
      markupB2bPct: 20,
      markupWholesalePct: 25,
      markupDistributorPct: 35,
      markupMrpPct: 50,
    },
  });

  const rawItems = await Promise.all([
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
  ]);

  const finishedCatalog: Array<{
    sku: string;
    name: string;
    lane: "POTATO_VEG" | "CHICKEN" | "PANEER_CHEESE";
    usp: number;
    unitsPerPkt: number;
    rateB2b: number;
    vegNonVeg: "VEG" | "NON_VEG";
  }> = [
    { sku: "FG-ALOO-REG", name: "Regular - Aloo Burger Patty", lane: "POTATO_VEG", usp: 14, unitsPerPkt: 20, rateB2b: 280, vegNonVeg: "VEG" },
    { sku: "FG-ALOO-BIG", name: "Big - Aloo Burger Patty", lane: "POTATO_VEG", usp: 21, unitsPerPkt: 16, rateB2b: 336, vegNonVeg: "VEG" },
    { sku: "FG-ALOO-JUMBO", name: "Jumbo - Aloo Burger Patty", lane: "POTATO_VEG", usp: 27, unitsPerPkt: 12, rateB2b: 324, vegNonVeg: "VEG" },
    { sku: "FG-ALOO-CRSP-REG", name: "Regular - Crispy Aloo Burger Patty", lane: "POTATO_VEG", usp: 15, unitsPerPkt: 20, rateB2b: 300, vegNonVeg: "VEG" },
    { sku: "FG-ALOO-CRSP-JUMBO", name: "Jumbo - Crispy Aloo Burger Patty", lane: "POTATO_VEG", usp: 30, unitsPerPkt: 12, rateB2b: 360, vegNonVeg: "VEG" },
    { sku: "FG-VEG-REG", name: "Regular - Veg Burger Patty", lane: "POTATO_VEG", usp: 16, unitsPerPkt: 20, rateB2b: 320, vegNonVeg: "VEG" },
    { sku: "FG-VEG-BIG", name: "Big - Veg Burger Patty", lane: "POTATO_VEG", usp: 22, unitsPerPkt: 16, rateB2b: 352, vegNonVeg: "VEG" },
    { sku: "FG-VEG-JUMBO", name: "Jumbo - Veg Burger Patty", lane: "POTATO_VEG", usp: 30, unitsPerPkt: 12, rateB2b: 360, vegNonVeg: "VEG" },
    { sku: "FG-CORN-NUG", name: "Cheese Corn Nuggets", lane: "PANEER_CHEESE", usp: 10.6, unitsPerPkt: 55, rateB2b: 583, vegNonVeg: "VEG" },
    { sku: "FG-CHK-REG", name: "Regular - Chicken Burger Patty", lane: "CHICKEN", usp: 21, unitsPerPkt: 20, rateB2b: 420, vegNonVeg: "NON_VEG" },
    { sku: "FG-CHK-SUPER", name: "Super - Chicken Burger Patty", lane: "CHICKEN", usp: 28.5, unitsPerPkt: 16, rateB2b: 456, vegNonVeg: "NON_VEG" },
    { sku: "FG-CHK-JUMBO", name: "Jumbo - Chicken Burger Patty", lane: "CHICKEN", usp: 50, unitsPerPkt: 12, rateB2b: 600, vegNonVeg: "NON_VEG" },
    { sku: "FG-CHK-CRSP-REG", name: "Regular - Chicken Crispy Burger Patty", lane: "CHICKEN", usp: 22.5, unitsPerPkt: 20, rateB2b: 450, vegNonVeg: "NON_VEG" },
    { sku: "FG-CHK-CRSP-JUMBO", name: "Jumbo - Chicken Crispy Burger Patty", lane: "CHICKEN", usp: 52.5, unitsPerPkt: 12, rateB2b: 630, vegNonVeg: "NON_VEG" },
    { sku: "FG-CHK-CHZ-BALL", name: "Chicken Cheese Balls (Approx. 30-35 gm each)", lane: "CHICKEN", usp: 22, unitsPerPkt: 25, rateB2b: 550, vegNonVeg: "NON_VEG" },
    { sku: "FG-CHK-CHZ-NUG", name: "Chicken Cheese Nuggets (Approx. 15-16 gm each)", lane: "CHICKEN", usp: 12, unitsPerPkt: 55, rateB2b: 660, vegNonVeg: "NON_VEG" },
    { sku: "FG-CHK-NUG", name: "Chicken Nuggets (20 gm each)", lane: "CHICKEN", usp: 9.5, unitsPerPkt: 55, rateB2b: 522.5, vegNonVeg: "NON_VEG" },
  ];

  const finishedItems = await Promise.all(
    finishedCatalog.map((p) =>
      prisma.item.create({
        data: {
          sku: p.sku,
          name: p.name,
          type: "FINISHED",
          unit: "pkt",
          hsn: p.lane === "CHICKEN" ? "1602" : "2106",
          gstRate: 5,
          shelfLifeDays: p.lane === "CHICKEN" ? 60 : 90,
          reorderLevel: 20,
          sellingPrice: p.usp,
          purchasePrice: 0,
          lane: p.lane,
          tier: "HERO",
          packType: "HORECA",
          packSize: `${p.unitsPerPkt} pcs`,
          unitsPerPkt: p.unitsPerPkt,
          usp: p.usp,
          rateB2b: p.rateB2b,
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
    ),
  );

  const items = [...rawItems, ...finishedItems];

  const bySku = Object.fromEntries(items.map((i) => [i.sku, i]));

  await prisma.recipe.create({
    data: {
      finishedItemId: bySku["FG-ALOO-REG"].id,
      name: "Aloo patty — 50 packs",
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
      finishedItemId: bySku["FG-CHK-REG"].id,
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

  await prisma.itemLabel.createMany({
    data: finishedCatalog.map((p) => ({
      itemId: bySku[p.sku].id,
      ingredientStatement: p.vegNonVeg === "VEG" ? "Vegetables, bread crumbs, spices" : "Chicken, bread crumbs, spices",
      vegNonVeg: p.vegNonVeg,
      netQuantity: `${p.unitsPerPkt} pcs per packet`,
      claims: "Frozen — keep at -18°C",
    })),
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
  await openLot("FG-ALOO-REG", "OPN-ALOO-01", 80, add(-1), add(89));
  await openLot("FG-CHK-REG", "OPN-CHK-01", 60, add(-1), add(59));

  console.log("Seeded Yatharth Foods demo data.");
  console.log("Login: superadmin@yatharth.local / Yatharth@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
