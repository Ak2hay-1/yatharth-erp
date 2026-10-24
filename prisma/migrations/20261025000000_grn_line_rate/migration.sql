ALTER TABLE "GoodsReceiptLine" ADD COLUMN "rate" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "GoodsReceiptLine" AS gl
SET "rate" = pol."rate"
FROM "GoodsReceipt" AS gr
JOIN "PurchaseOrderLine" AS pol ON pol."poId" = gr."poId" AND pol."itemId" = gl."itemId"
WHERE gl."grnId" = gr."id";
