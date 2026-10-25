CREATE INDEX "Party_kind_idx" ON "Party"("kind");
CREATE INDEX "Batch_itemId_idx" ON "Batch"("itemId");
CREATE INDEX "StockMove_type_createdAt_idx" ON "StockMove"("type", "createdAt");
CREATE INDEX "ProductionBatch_mfgDate_idx" ON "ProductionBatch"("mfgDate");
CREATE INDEX "Invoice_status_date_idx" ON "Invoice"("status", "date");
CREATE INDEX "Invoice_customerId_status_idx" ON "Invoice"("customerId", "status");
