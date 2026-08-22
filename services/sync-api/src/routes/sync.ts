import { createHash } from "crypto";
import { z } from "zod";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { PrismaClient } from "@prisma/client";
import { requireSyncAuth } from "../auth.js";
import { triggerRevalidate } from "../revalidate.js";

const productSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(["veg", "non-veg"]),
  lane: z.string().optional().default(""),
  tier: z.string().optional().default(""),
  packSize: z.string().optional().default(""),
  unitsPerPkt: z.number().int().positive().default(1),
  usp: z.number().nonnegative(),
  rateB2b: z.number().nonnegative(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  erpUpdatedAt: z.string().datetime().optional(),
});

const productsPayload = z.object({
  products: z.array(productSchema),
});

const companyPayload = z.object({
  name: z.string().min(1),
  legalName: z.string().optional().default(""),
  address: z.string().optional().default(""),
  city: z.string().optional().default(""),
  state: z.string().optional().default(""),
  pincode: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  gstin: z.string().optional().default(""),
  fssai: z.string().optional().default(""),
});

export function registerSyncRoutes(app: FastifyInstance, prisma: PrismaClient) {
  const authHook = async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSyncAuth(request, reply);
  };

  app.post("/v1/sync/products", { preHandler: authHook }, async (request, reply) => {
    const machineId = String(request.headers["x-yatharth-machine-id"] ?? "");
    const parsed = productsPayload.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const hash = createHash("sha256").update(JSON.stringify(parsed.data)).digest("hex");
    try {
      for (const p of parsed.data.products) {
        await prisma.syncedProduct.upsert({
          where: { sku: p.sku },
          update: {
            name: p.name,
            category: p.category,
            lane: p.lane,
            tier: p.tier,
            packSize: p.packSize,
            unitsPerPkt: p.unitsPerPkt,
            usp: p.usp,
            rateB2b: p.rateB2b,
            isActive: p.isActive,
            sortOrder: p.sortOrder,
            erpUpdatedAt: p.erpUpdatedAt ? new Date(p.erpUpdatedAt) : new Date(),
          },
          create: {
            sku: p.sku,
            name: p.name,
            category: p.category,
            lane: p.lane,
            tier: p.tier,
            packSize: p.packSize,
            unitsPerPkt: p.unitsPerPkt,
            usp: p.usp,
            rateB2b: p.rateB2b,
            isActive: p.isActive,
            sortOrder: p.sortOrder,
            erpUpdatedAt: p.erpUpdatedAt ? new Date(p.erpUpdatedAt) : new Date(),
          },
        });
      }

      await prisma.syncEvent.create({
        data: {
          machineId,
          kind: "products",
          payloadHash: hash.slice(0, 16),
          itemCount: parsed.data.products.length,
          ok: true,
        },
      });

      void triggerRevalidate();
      return { ok: true, count: parsed.data.products.length };
    } catch (err) {
      await prisma.syncEvent.create({
        data: {
          machineId,
          kind: "products",
          payloadHash: hash.slice(0, 16),
          itemCount: parsed.data.products.length,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        },
      });
      throw err;
    }
  });

  app.post("/v1/sync/company", { preHandler: authHook }, async (request, reply) => {
    const machineId = String(request.headers["x-yatharth-machine-id"] ?? "");
    const parsed = companyPayload.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const hash = createHash("sha256").update(JSON.stringify(parsed.data)).digest("hex");
    await prisma.syncedCompany.upsert({
      where: { id: "default" },
      update: parsed.data,
      create: { id: "default", ...parsed.data },
    });

    await prisma.syncEvent.create({
      data: { machineId, kind: "company", payloadHash: hash.slice(0, 16), ok: true },
    });

    void triggerRevalidate();
    return { ok: true };
  });

  app.post("/v1/sync/assets/:sku", { preHandler: authHook }, async (request, reply) => {
    const machineId = String(request.headers["x-yatharth-machine-id"] ?? "");
    const sku = (request.params as { sku: string }).sku;
    const product = await prisma.syncedProduct.findUnique({ where: { sku } });
    if (!product) return reply.code(404).send({ error: "Product not found" });

    const data = await request.file();
    if (!data) return reply.code(400).send({ error: "File required" });

    const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";
    const fs = await import("fs/promises");
    const path = await import("path");
    await fs.mkdir(uploadDir, { recursive: true });

    const ext = path.extname(data.filename) || ".bin";
    const storedName = `${sku}-${Date.now()}${ext}`;
    const dest = path.join(uploadDir, storedName);
    const buf = await data.toBuffer();
    await fs.writeFile(dest, buf);

    const fieldText = (field: unknown): string => {
      if (!field) return "";
      if (Array.isArray(field)) return fieldText(field[0]);
      if (typeof field === "object" && field !== null && "value" in field) {
        return String((field as { value: unknown }).value ?? "");
      }
      return "";
    };
    const kind = fieldText(data.fields?.kind) || "OTHER";
    const title = fieldText(data.fields?.title);
    const publicUrl = `/uploads/${storedName}`;

    await prisma.syncedAsset.create({
      data: {
        productId: product.id,
        sku,
        kind,
        title,
        fileName: data.filename,
        mimeType: data.mimetype,
        publicUrl,
      },
    });

    await prisma.syncEvent.create({
      data: { machineId, kind: "asset", payloadHash: sku, itemCount: 1, ok: true },
    });

    void triggerRevalidate();
    return { ok: true, publicUrl };
  });

  app.get("/v1/sync/status", { preHandler: authHook }, async () => {
    const last = await prisma.syncEvent.findFirst({ orderBy: { createdAt: "desc" } });
    const productCount = await prisma.syncedProduct.count({ where: { isActive: true } });
    const company = await prisma.syncedCompany.findUnique({ where: { id: "default" } });
    return {
      ok: true,
      productCount,
      companySynced: Boolean(company),
      lastEvent: last
        ? { kind: last.kind, at: last.createdAt.toISOString(), ok: last.ok, error: last.error }
        : null,
    };
  });
}
