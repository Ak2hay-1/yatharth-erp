import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { notifyContactInquiry } from "../notify.js";

const contactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  phone: z.string().max(30).optional().default(""),
  message: z.string().min(1).max(5000),
});

export function registerPublicRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get("/health", async () => ({ ok: true }));

  app.get("/v1/public/company", async (_request, reply) => {
    const company = await prisma.syncedCompany.findUnique({ where: { id: "default" } });
    if (!company) return reply.code(404).send({ error: "Not synced yet" });
    return company;
  });

  app.get("/v1/public/products", async (request) => {
    const category = String((request.query as { category?: string }).category ?? "").toLowerCase();
    const where =
      category === "veg" || category === "non-veg"
        ? { isActive: true, category }
        : { isActive: true };

    const products = await prisma.syncedProduct.findMany({
      where,
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: {
        assets: { orderBy: { sortOrder: "asc" } },
      },
    });

    return { products };
  });

  app.get("/v1/public/products/:sku", async (request, reply) => {
    const sku = (request.params as { sku: string }).sku;
    const product = await prisma.syncedProduct.findUnique({
      where: { sku },
      include: { assets: { orderBy: { sortOrder: "asc" } } },
    });
    if (!product || !product.isActive) return reply.code(404).send({ error: "Not found" });
    return product;
  });

  app.get("/v1/public/price-list", async () => {
    const products = await prisma.syncedProduct.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: {
        sku: true,
        name: true,
        category: true,
        usp: true,
        unitsPerPkt: true,
        rateB2b: true,
        packSize: true,
      },
    });

    const veg = products.filter((p: { category: string }) => p.category === "veg");
    const nonVeg = products.filter((p: { category: string }) => p.category === "non-veg");
    return { veg, nonVeg, updatedAt: new Date().toISOString() };
  });

  app.post("/v1/public/contact", async (request, reply) => {
    const parsed = contactSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    await prisma.contactInquiry.create({ data: parsed.data });
    void notifyContactInquiry(parsed.data);
    return { ok: true };
  });
}
