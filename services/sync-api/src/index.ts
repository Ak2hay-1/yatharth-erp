import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { registerSyncRoutes } from "./routes/sync.js";
import { registerPublicRoutes } from "./routes/public.js";

const prisma = new PrismaClient();

const app = Fastify({
  logger: true,
  bodyLimit: 10 * 1024 * 1024,
});

app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
  (req as { rawBody?: string }).rawBody = body as string;
  try {
    done(null, JSON.parse(body as string));
  } catch (err) {
    done(err as Error, undefined);
  }
});

const websiteOrigin = process.env.WEBSITE_ORIGIN ?? "http://localhost:3002";
await app.register(cors, {
  origin: [
    websiteOrigin,
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://yatharthafoods.in",
    "https://www.yatharthafoods.in",
  ],
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
});

await app.register(rateLimit, {
  max: 120,
  timeWindow: "1 minute",
});

await app.register(multipart, { limits: { fileSize: 8 * 1024 * 1024 } });

const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
await app.register(fastifyStatic, {
  root: uploadDir,
  prefix: "/uploads/",
  decorateReply: false,
});

registerSyncRoutes(app, prisma);
registerPublicRoutes(app, prisma);

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
  app.log.info(`Sync API listening on ${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  await app.close();
  process.exit(0);
});
