import { s3Storage } from "@hot-updater/aws";
import { createHotUpdater } from "@hot-updater/server";
import { prismaAdapter } from "@hot-updater/server/adapters/prisma";

import { s3Config } from "./env.js";
import { prisma } from "./prisma.js";

const baseAdapter = prismaAdapter({ prisma, provider: "postgresql" });

// Sticky force (bật bằng env STICKY_FORCE_UPDATE=true): nếu client bỏ lỡ một bản
// force nằm giữa bundle hiện tại và bản update sắp trả về, ép bản update đó thành
// force để user cũ vẫn bị buộc cập nhật. Tắt thì trả nguyên response mặc định.
const stickyForceEnabled = process.env.STICKY_FORCE_UPDATE === "true";

const stickyForceAdapter: typeof baseAdapter = Object.assign(
  (...fnArgs: Parameters<typeof baseAdapter>) => {
    const plugin = baseAdapter(...fnArgs);
    const getUpdateInfo = plugin.getUpdateInfo?.bind(plugin);
    if (!getUpdateInfo) return plugin;

    // ponytail: plugin object bị freeze bởi createHotUpdater — spread ra object mới, không mutate
    return {
      ...plugin,
      getUpdateInfo: (async (args: Parameters<typeof getUpdateInfo>[0], context: Parameters<typeof getUpdateInfo>[1]) => {
        const info = await getUpdateInfo(args, context);
        if (info?.status !== "UPDATE" || info.shouldForceUpdate) return info;

        const missedForce = await prisma.bundles.count({
          where: {
            enabled: true,
            should_force_update: true,
            platform: args.platform,
            channel: args.channel ?? "production",
            id: { gt: args.bundleId, lte: info.id },
          },
        });
        // ponytail: không lọc target_app_version — đủ khi chỉ chạy một dòng app version; thêm semver filter nếu phát hành nhiều version song song
        return missedForce > 0 ? { ...info, shouldForceUpdate: true } : info;
      }) as typeof getUpdateInfo,
    };
  },
  baseAdapter,
);

export const hotUpdater = createHotUpdater({
  database: stickyForceEnabled ? stickyForceAdapter : baseAdapter,
  storages: [s3Storage(s3Config)],
  basePath: "/hot-updater",
  routes: {
    updateCheck: true,
    bundles: true,
  },
});
