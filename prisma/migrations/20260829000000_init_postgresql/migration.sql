-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('RAW', 'PACKING', 'FINISHED');

-- CreateEnum
CREATE TYPE "PartyKind" AS ENUM ('CUSTOMER', 'SUPPLIER', 'BOTH');

-- CreateEnum
CREATE TYPE "CustomerChannel" AS ENUM ('B2B', 'B2C');

-- CreateEnum
CREATE TYPE "ProductLane" AS ENUM ('NONE', 'POTATO_VEG', 'CHICKEN', 'PANEER_CHEESE');

-- CreateEnum
CREATE TYPE "SkuTier" AS ENUM ('NONE', 'HERO', 'CORE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PackType" AS ENUM ('NONE', 'HORECA', 'RETAIL');

-- CreateEnum
CREATE TYPE "BuyerCluster" AS ENUM ('NONE', 'QSR_CAFE', 'RESTAURANT_HOTEL', 'CATERER', 'DISTRIBUTOR');

-- CreateEnum
CREATE TYPE "PartyLifecycle" AS ENUM ('PROSPECT', 'CUSTOMER', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SalesOrderKind" AS ENUM ('SAMPLE', 'TRIAL', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "WasteCause" AS ENUM ('PRODUCTION', 'FREEZER', 'RETURN', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'ROOT_CAUSE', 'CHANGE', 'NEW_SAMPLE', 'TEST', 'STANDARDISED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ComplaintIssue" AS ENUM ('DRY', 'SIZE', 'COATING', 'WEIGHT', 'THAW', 'DELIVERY', 'TASTE', 'OTHER');

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockMoveType" AS ENUM ('PURCHASE', 'PRODUCTION_IN', 'PRODUCTION_OUT', 'SALE', 'WASTE', 'ADJUST');

-- CreateEnum
CREATE TYPE "BatchSource" AS ENUM ('PURCHASE', 'PRODUCTION', 'ADJUST');

-- CreateEnum
CREATE TYPE "PaymentDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'UPI', 'NEFT', 'CHEQUE', 'OTHER');

-- CreateEnum
CREATE TYPE "MfgCostSource" AS ENUM ('NONE', 'RECIPE', 'LAST_BATCH', 'MANUAL');

-- CreateEnum
CREATE TYPE "VegMark" AS ENUM ('NA', 'VEG', 'NON_VEG');

-- CreateEnum
CREATE TYPE "ProductAssetKind" AS ENUM ('PACK_SHOT', 'LABEL_ART', 'PROCESS', 'OTHER');

-- CreateEnum
CREATE TYPE "ContentLocale" AS ENUM ('en_IN', 'en_US', 'en_GB', 'hi', 'mr');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('SOP', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "gstin" TEXT NOT NULL,
    "fssai" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "bankName" TEXT NOT NULL DEFAULT '',
    "bankAccount" TEXT NOT NULL DEFAULT '',
    "ifsc" TEXT NOT NULL DEFAULT '',
    "financialYearStart" TEXT NOT NULL DEFAULT '04-01',
    "markupB2bPct" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "markupWholesalePct" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "markupDistributorPct" DOUBLE PRECISION NOT NULL DEFAULT 35,
    "markupMrpPct" DOUBLE PRECISION NOT NULL DEFAULT 50,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sequence" (
    "key" TEXT NOT NULL,
    "last" INTEGER NOT NULL,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "unit" TEXT NOT NULL,
    "hsn" TEXT NOT NULL DEFAULT '',
    "gstRate" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "shelfLifeDays" INTEGER NOT NULL DEFAULT 30,
    "reorderLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sellingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "purchasePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lane" "ProductLane" NOT NULL DEFAULT 'NONE',
    "tier" "SkuTier" NOT NULL DEFAULT 'NONE',
    "packType" "PackType" NOT NULL DEFAULT 'NONE',
    "packSize" TEXT NOT NULL DEFAULT '',
    "gateTaste" BOOLEAN NOT NULL DEFAULT false,
    "gateCost" BOOLEAN NOT NULL DEFAULT false,
    "gateMargin" BOOLEAN NOT NULL DEFAULT false,
    "gateProduction" BOOLEAN NOT NULL DEFAULT false,
    "gatePackaging" BOOLEAN NOT NULL DEFAULT false,
    "gateShelfLife" BOOLEAN NOT NULL DEFAULT false,
    "gateAcceptance" BOOLEAN NOT NULL DEFAULT false,
    "gateRepeat" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mfgCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rateB2b" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rateWholesale" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rateDistributor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rateMrp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overrideB2bPct" DOUBLE PRECISION,
    "overrideWholesalePct" DOUBLE PRECISION,
    "overrideDistributorPct" DOUBLE PRECISION,
    "overrideMrpPct" DOUBLE PRECISION,
    "mfgCostSource" "MfgCostSource" NOT NULL DEFAULT 'NONE',
    "mfgCostUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "finishedItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "outputQty" DOUBLE PRECISION NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeLine" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RecipeLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "PartyKind" NOT NULL,
    "channel" "CustomerChannel",
    "cluster" "BuyerCluster" NOT NULL DEFAULT 'NONE',
    "lifecycle" "PartyLifecycle" NOT NULL DEFAULT 'CUSTOMER',
    "gstin" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "billingAddress" TEXT NOT NULL DEFAULT '',
    "shippingAddress" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "stateCode" TEXT NOT NULL DEFAULT '',
    "pincode" TEXT NOT NULL DEFAULT '',
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "reorderCycleDays" INTEGER NOT NULL DEFAULT 30,
    "nextReorderDate" TIMESTAMP(3),
    "lastOrderAt" TIMESTAMP(3),
    "lostReason" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotNo" TEXT NOT NULL,
    "mfgDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "qtyOnHand" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" "BatchSource" NOT NULL,
    "sourceId" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMove" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "type" "StockMoveType" NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "wasteCause" "WasteCause",
    "refType" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMove_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceiptLine" (
    "id" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "lotNo" TEXT NOT NULL,
    "mfgDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "batchId" TEXT,

    CONSTRAINT "GoodsReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierBill" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "grnId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "isInterstate" BOOLEAN NOT NULL DEFAULT false,
    "taxable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierBillLine" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "hsn" TEXT NOT NULL DEFAULT '',
    "gstRate" DOUBLE PRECISION NOT NULL,
    "taxable" DOUBLE PRECISION NOT NULL,
    "cgst" DOUBLE PRECISION NOT NULL,
    "sgst" DOUBLE PRECISION NOT NULL,
    "igst" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SupplierBillLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "plannedQty" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionBatch" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "outputQty" DOUBLE PRECISION NOT NULL,
    "wastageQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rejectQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lotNo" TEXT NOT NULL,
    "mfgDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "batchId" TEXT,
    "operator" TEXT NOT NULL DEFAULT '',
    "actualWeight" DOUBLE PRECISION,
    "coatingOk" BOOLEAN NOT NULL DEFAULT true,
    "bmrNotes" TEXT NOT NULL DEFAULT '',
    "status" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "channel" "CustomerChannel" NOT NULL,
    "kind" "SalesOrderKind" NOT NULL DEFAULT 'COMMERCIAL',
    "date" TIMESTAMP(3) NOT NULL,
    "promisedDate" TIMESTAMP(3),
    "status" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT NOT NULL DEFAULT '',
    "feedbackUseCase" TEXT NOT NULL DEFAULT '',
    "feedbackTaste" TEXT NOT NULL DEFAULT '',
    "feedbackSize" TEXT NOT NULL DEFAULT '',
    "feedbackCoating" TEXT NOT NULL DEFAULT '',
    "feedbackKitchenWaste" TEXT NOT NULL DEFAULT '',
    "feedbackNotes" TEXT NOT NULL DEFAULT '',
    "feedbackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrderLine" (
    "id" TEXT NOT NULL,
    "soId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SalesOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "salesOrderId" TEXT,
    "customerId" TEXT NOT NULL,
    "channel" "CustomerChannel" NOT NULL,
    "kind" "SalesOrderKind" NOT NULL DEFAULT 'COMMERCIAL',
    "date" TIMESTAMP(3) NOT NULL,
    "promisedDate" TIMESTAMP(3),
    "status" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "placeOfSupply" TEXT NOT NULL DEFAULT '',
    "isInterstate" BOOLEAN NOT NULL DEFAULT false,
    "taxable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "batchId" TEXT,
    "qty" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "hsn" TEXT NOT NULL DEFAULT '',
    "gstRate" DOUBLE PRECISION NOT NULL,
    "taxable" DOUBLE PRECISION NOT NULL,
    "cgst" DOUBLE PRECISION NOT NULL,
    "sgst" DOUBLE PRECISION NOT NULL,
    "igst" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryChallan" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "vehicleNo" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "freezerOk" BOOLEAN NOT NULL DEFAULT false,
    "sealOk" BOOLEAN NOT NULL DEFAULT false,
    "dispatchedAt" TIMESTAMP(3),
    "customerFreezerNote" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "DeliveryChallan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "direction" "PaymentDirection" NOT NULL,
    "partyId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "reference" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "supplierBillId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "itemId" TEXT,
    "batchId" TEXT,
    "invoiceId" TEXT,
    "issue" "ComplaintIssue" NOT NULL,
    "description" TEXT NOT NULL,
    "rootCause" TEXT NOT NULL DEFAULT '',
    "correction" TEXT NOT NULL DEFAULT '',
    "resampleNotes" TEXT NOT NULL DEFAULT '',
    "sopNote" TEXT NOT NULL DEFAULT '',
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyReview" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "systemToImprove" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantDocument" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "tag" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "bodyMd" TEXT NOT NULL DEFAULT '',
    "flowchartMermaid" TEXT NOT NULL DEFAULT '',
    "fileName" TEXT NOT NULL DEFAULT '',
    "mimeType" TEXT NOT NULL DEFAULT '',
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "storageKey" TEXT NOT NULL DEFAULT '',
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemLabel" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "ingredientStatement" TEXT NOT NULL DEFAULT '',
    "allergens" TEXT NOT NULL DEFAULT '',
    "containsMayContain" TEXT NOT NULL DEFAULT '',
    "claims" TEXT NOT NULL DEFAULT '',
    "netQuantity" TEXT NOT NULL DEFAULT '',
    "vegNonVeg" "VegMark" NOT NULL DEFAULT 'NA',
    "servingSize" TEXT NOT NULL DEFAULT '',
    "servingsPerPack" TEXT NOT NULL DEFAULT '',
    "energyKcal100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "energyKj100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "protein100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carb100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sugars100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fat100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "satFat100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transFat100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fibre100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sodium100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "energyKcalServe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "energyKjServe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "proteinServe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbServe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sugarsServe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fatServe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "satFatServe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transFatServe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fibreServe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sodiumServe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabelIngredientLine" (
    "id" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "qtyPct" DOUBLE PRECISION,

    CONSTRAINT "LabelIngredientLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemCostAttachment" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemCostAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAsset" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "kind" "ProductAssetKind" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL DEFAULT '',
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintAttachment" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SopTranslation" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "locale" "ContentLocale" NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "bodyMd" TEXT NOT NULL DEFAULT '',
    "flowchartMermaid" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "SopTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeTranslation" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "locale" "ContentLocale" NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "ingredientNamesJson" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "RecipeTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "WebsiteSyncQueueItem" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ref" TEXT NOT NULL DEFAULT '',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteSyncQueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Item_sku_key" ON "Item"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_finishedItemId_key" ON "Recipe"("finishedItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_itemId_lotNo_key" ON "Batch"("itemId", "lotNo");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_number_key" ON "PurchaseOrder"("number");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceipt_number_key" ON "GoodsReceipt"("number");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierBill_number_key" ON "SupplierBill"("number");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_number_key" ON "WorkOrder"("number");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionBatch_number_key" ON "ProductionBatch"("number");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_number_key" ON "SalesOrder"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryChallan_number_key" ON "DeliveryChallan"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_number_key" ON "Payment"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_number_key" ON "Complaint"("number");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyReview_month_key" ON "MonthlyReview"("month");

-- CreateIndex
CREATE UNIQUE INDEX "PlantDocument_number_key" ON "PlantDocument"("number");

-- CreateIndex
CREATE INDEX "PlantDocument_category_idx" ON "PlantDocument"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ItemLabel_itemId_key" ON "ItemLabel"("itemId");

-- CreateIndex
CREATE INDEX "ProductAsset_itemId_idx" ON "ProductAsset"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "SopTranslation_documentId_locale_key" ON "SopTranslation"("documentId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeTranslation_recipeId_locale_key" ON "RecipeTranslation"("recipeId", "locale");

-- CreateIndex
CREATE INDEX "WebsiteSyncQueueItem_kind_ref_idx" ON "WebsiteSyncQueueItem"("kind", "ref");

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_finishedItemId_fkey" FOREIGN KEY ("finishedItemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeLine" ADD CONSTRAINT "RecipeLine_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeLine" ADD CONSTRAINT "RecipeLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMove" ADD CONSTRAINT "StockMove_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMove" ADD CONSTRAINT "StockMove_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GoodsReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBill" ADD CONSTRAINT "SupplierBill_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBill" ADD CONSTRAINT "SupplierBill_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GoodsReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBillLine" ADD CONSTRAINT "SupplierBillLine_billId_fkey" FOREIGN KEY ("billId") REFERENCES "SupplierBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBillLine" ADD CONSTRAINT "SupplierBillLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_soId_fkey" FOREIGN KEY ("soId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryChallan" ADD CONSTRAINT "DeliveryChallan_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_supplierBillId_fkey" FOREIGN KEY ("supplierBillId") REFERENCES "SupplierBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantDocument" ADD CONSTRAINT "PlantDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLabel" ADD CONSTRAINT "ItemLabel_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelIngredientLine" ADD CONSTRAINT "LabelIngredientLine_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "ItemLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCostAttachment" ADD CONSTRAINT "ItemCostAttachment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAsset" ADD CONSTRAINT "ProductAsset_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintAttachment" ADD CONSTRAINT "ComplaintAttachment_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopTranslation" ADD CONSTRAINT "SopTranslation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "PlantDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeTranslation" ADD CONSTRAINT "RecipeTranslation_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
