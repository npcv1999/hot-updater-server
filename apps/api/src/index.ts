import "dotenv/config";

import { toNodeHandler } from "@hot-updater/server/node";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import swaggerUi from "swagger-ui-express";

import { dashboardAllowedOrigins, validateEnv, port } from "./env.js";
import { hotUpdater } from "./hotUpdater.js";
import { openapiDocument } from "./openapi.js";
import { prisma } from "./prisma.js";

validateEnv();

const app = express();
const handler = toNodeHandler(hotUpdater);

app.use(cors({
  origin(origin, callback) {
    if (!origin || dashboardAllowedOrigins.includes("*") || dashboardAllowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  allowedHeaders: ["Authorization", "Content-Type", "Accept"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
}));

app.use(express.json({ limit: "1mb" }));

function hotUpdaterAuth(req: Request, res: Response, next: NextFunction) {
  const expected = `Bearer ${process.env.HOT_UPDATER_AUTH_TOKEN}`;

  if (req.get("Authorization") !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/openapi.json", (_req, res) => {
  res.json(openapiDocument);
});

app.get("/dashboard/api/bundles", hotUpdaterAuth, async (req, res) => {
  try {
    const platform = req.query.platform === "ios" || req.query.platform === "android"
      ? req.query.platform
      : undefined;
    const channel = typeof req.query.channel === "string" && req.query.channel.length > 0
      ? req.query.channel
      : undefined;
    const bundles = await prisma.bundles.findMany({
      where: { ...(platform && { platform }), ...(channel && { channel }) },
      include: { _count: { select: { patches: true } } },
      orderBy: { id: "desc" },
      take: 100,
    });
    const extras = await prisma.bundleExtra.findMany({
      where: { bundleId: { in: bundles.map((bundle) => bundle.id) } },
    });
    const versions = new Map(extras.map((extra) => [extra.bundleId, extra.version]));

    res.json({
      data: bundles.map((bundle) => ({
        id: bundle.id,
        platform: bundle.platform,
        shouldForceUpdate: bundle.should_force_update,
        enabled: bundle.enabled,
        channel: bundle.channel,
        targetAppVersion: bundle.target_app_version,
        rolloutCohortCount: bundle.rollout_cohort_count,
        patchesCount: bundle._count.patches,
        version: versions.get(bundle.id) ?? null,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(openapiDocument, { swaggerOptions: { persistAuthorization: true } }),
);

app.use("/hot-updater/api", hotUpdaterAuth);
app.all(/^\/hot-updater(?:\/.*)?$/, handler);

const server = app.listen(port, () => {
  console.log(`Hot Updater server running at http://localhost:${port}/hot-updater`);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
