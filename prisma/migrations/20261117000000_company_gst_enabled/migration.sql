-- AlterTable
ALTER TABLE "Company" ADD COLUMN "gstEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN "websiteDescription" TEXT NOT NULL DEFAULT '';
