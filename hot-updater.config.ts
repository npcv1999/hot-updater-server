import { s3Storage } from "@hot-updater/aws";
import { bare } from "@hot-updater/bare";
import { standaloneRepository } from "@hot-updater/standalone";
import { defineConfig } from "hot-updater";

const serverBaseUrl = process.env.HOT_UPDATER_SERVER_URL ?? "http://localhost:3001/hot-updater";

export default defineConfig({
  updateStrategy: "appVersion",
  build: bare({ enableHermes: true }),
  storage: s3Storage({
    region: process.env.S3_REGION ?? "us-east-1",
    endpoint: process.env.S3_ENDPOINT || undefined,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    bucketName: process.env.S3_BUCKET_NAME!,
  }),
  database: standaloneRepository({
    baseUrl: serverBaseUrl,
    commonHeaders: {
      Authorization: `Bearer ${process.env.HOT_UPDATER_AUTH_TOKEN}`,
    }
  }),
});
