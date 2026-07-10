import { s3Storage } from "@hot-updater/aws";
import { createHotUpdater } from "@hot-updater/server";
import { prismaAdapter } from "@hot-updater/server/adapters/prisma";

import { s3Config } from "./env.js";
import { prisma } from "./prisma.js";

export const hotUpdater = createHotUpdater({
  database: prismaAdapter({ prisma, provider: "postgresql" }),
  storages: [s3Storage(s3Config)],
  basePath: "/hot-updater",
  routes: {
    updateCheck: true,
    bundles: true,
  },
});
