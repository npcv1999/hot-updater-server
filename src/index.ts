import "dotenv/config";

import { toNodeHandler } from "@hot-updater/server/node";
import express, { type NextFunction, type Request, type Response } from "express";
import swaggerUi from "swagger-ui-express";

import { validateEnv, port } from "./env.js";
import { hotUpdater } from "./hotUpdater.js";
import { openapiDocument } from "./openapi.js";
import { prisma } from "./prisma.js";

validateEnv();

const app = express();
const handler = toNodeHandler(hotUpdater);

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
