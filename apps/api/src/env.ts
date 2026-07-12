const requiredEnvNames = [
  "DATABASE_URL",
  "HOT_UPDATER_AUTH_TOKEN",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_BUCKET_NAME",
] as const;

export function validateEnv() {
  const missing = requiredEnvNames.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

export const port = Number(process.env.PORT ?? 3001);

export const dashboardAllowedOrigins = (process.env.DASHBOARD_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const s3Config = {
  region: process.env.S3_REGION ?? "us-east-1",
  endpoint: process.env.S3_ENDPOINT || undefined,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  bucketName: process.env.S3_BUCKET_NAME!,
};
