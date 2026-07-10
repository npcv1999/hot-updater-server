export const openapiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Hot Updater Server API",
    version: "0.1.0",
    description:
      "Local API documentation for the self-hosted Hot Updater server. Bundle management endpoints require a bearer token.",
  },
  servers: [{ url: "http://localhost:3001", description: "Local development" }],
  tags: [
    { name: "Health" },
    { name: "Diagnostics" },
    { name: "Update checks" },
    { name: "Bundles" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Check server health",
        responses: {
          "200": {
            description: "Server is healthy",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Health" },
              },
            },
          },
        },
      },
    },
    "/hot-updater/version": {
      get: {
        tags: ["Diagnostics"],
        summary: "Get Hot Updater server version",
        responses: {
          "200": {
            description: "Server version",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Version" },
              },
            },
          },
        },
      },
    },
    "/hot-updater/app-version/{platform}/{appVersion}/{channel}/{minBundleId}/{bundleId}": {
      get: {
        tags: ["Update checks"],
        summary: "Check for an app-version update",
        description:
          "Public React Native client endpoint. Append /{cohort} to test the rollout-cohort variant. Returns null when no compatible update is available.",
        parameters: [
          { $ref: "#/components/parameters/PlatformPath" },
          { $ref: "#/components/parameters/AppVersion" },
          { $ref: "#/components/parameters/ChannelPath" },
          { $ref: "#/components/parameters/MinBundleId" },
          { $ref: "#/components/parameters/BundleIdPath" },
        ],
        responses: { "200": { $ref: "#/components/responses/UpdateCheck" } },
      },
    },
    "/hot-updater/fingerprint/{platform}/{fingerprintHash}/{channel}/{minBundleId}/{bundleId}": {
      get: {
        tags: ["Update checks"],
        summary: "Check for a fingerprint update",
        description:
          "Public React Native client endpoint. Append /{cohort} to test the rollout-cohort variant.",
        parameters: [
          { $ref: "#/components/parameters/PlatformPath" },
          { $ref: "#/components/parameters/FingerprintHash" },
          { $ref: "#/components/parameters/ChannelPath" },
          { $ref: "#/components/parameters/MinBundleId" },
          { $ref: "#/components/parameters/BundleIdPath" },
        ],
        responses: { "200": { $ref: "#/components/responses/UpdateCheck" } },
      },
    },
    "/hot-updater/api/bundles": {
      get: {
        tags: ["Bundles"],
        summary: "List bundles",
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/Channel" },
          { $ref: "#/components/parameters/Platform" },
          { $ref: "#/components/parameters/Enabled" },
          { $ref: "#/components/parameters/Limit" },
          { $ref: "#/components/parameters/Page" },
          { $ref: "#/components/parameters/After" },
          { $ref: "#/components/parameters/Before" },
        ],
        responses: {
          "200": {
            description: "Paginated bundles",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PaginatedBundles" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Bundles"],
        summary: "Create one or more bundle records",
        description:
          "Usually called by the Hot Updater CLI after bundle artifacts have been uploaded to S3.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  { $ref: "#/components/schemas/Bundle" },
                  {
                    type: "array",
                    items: { $ref: "#/components/schemas/Bundle" },
                  },
                ],
              },
              example: {
                id: "0195d9cd-f1ef-7f01-9b67-5a6fd7d7b2c8",
                platform: "ios",
                shouldForceUpdate: false,
                enabled: true,
                fileHash: "sha256:example",
                storageUri:
                  "s3://your-bucket/your-app/0195d9cd-f1ef-7f01-9b67-5a6fd7d7b2c8/bundle.zip",
                gitCommitHash: "abc1234",
                message: "Test release",
                channel: "production",
                targetAppVersion: "1.0.0",
                fingerprintHash: null,
                metadata: {},
                rolloutCohortCount: 1000,
              },
            },
          },
        },
        responses: {
          "201": { $ref: "#/components/responses/Success" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/hot-updater/api/bundles/channels": {
      get: {
        tags: ["Bundles"],
        summary: "List channels",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Available channels",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Channels" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/hot-updater/api/bundles/{id}": {
      parameters: [{ $ref: "#/components/parameters/BundleId" }],
      get: {
        tags: ["Bundles"],
        summary: "Get a bundle by ID",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Bundle",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Bundle" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { description: "Bundle not found" },
        },
      },
      patch: {
        tags: ["Bundles"],
        summary: "Update bundle metadata or rollout",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BundlePatch" },
              example: { enabled: false },
            },
          },
        },
        responses: {
          "200": { $ref: "#/components/responses/Success" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { description: "Bundle not found" },
        },
      },
      delete: {
        tags: ["Bundles"],
        summary: "Delete a bundle",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { $ref: "#/components/responses/Success" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { description: "Bundle not found" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "Token" },
    },
    parameters: {
      BundleId: {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string", format: "uuid" },
      },
      PlatformPath: {
        name: "platform",
        in: "path",
        required: true,
        schema: { type: "string", enum: ["ios", "android"] },
      },
      AppVersion: {
        name: "appVersion",
        in: "path",
        required: true,
        schema: { type: "string", example: "1.0.0" },
      },
      FingerprintHash: {
        name: "fingerprintHash",
        in: "path",
        required: true,
        schema: { type: "string", example: "your-fingerprint-hash" },
      },
      ChannelPath: {
        name: "channel",
        in: "path",
        required: true,
        schema: { type: "string", example: "production" },
      },
      MinBundleId: {
        name: "minBundleId",
        in: "path",
        required: true,
        schema: { type: "string", format: "uuid" },
      },
      BundleIdPath: {
        name: "bundleId",
        in: "path",
        required: true,
        schema: { type: "string", format: "uuid" },
      },
      Channel: { name: "channel", in: "query", schema: { type: "string" } },
      Platform: {
        name: "platform",
        in: "query",
        schema: { type: "string", enum: ["ios", "android"] },
      },
      Enabled: { name: "enabled", in: "query", schema: { type: "boolean" } },
      Limit: {
        name: "limit",
        in: "query",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      },
      Page: { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
      After: { name: "after", in: "query", schema: { type: "string" } },
      Before: { name: "before", in: "query", schema: { type: "string" } },
    },
    responses: {
      Success: {
        description: "Operation completed",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Success" },
          },
        },
      },
      Unauthorized: {
        description: "Missing or invalid bearer token",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      UpdateCheck: {
        description: "Compatible update metadata, or null when the client is up to date.",
        content: {
          "application/json": {
            schema: { nullable: true, type: "object", additionalProperties: true },
          },
        },
      },
    },
    schemas: {
      Health: {
        type: "object",
        required: ["ok"],
        properties: { ok: { type: "boolean", example: true } },
      },
      Version: {
        type: "object",
        required: ["version"],
        properties: { version: { type: "string", example: "0.35.3" } },
      },
      Success: {
        type: "object",
        required: ["success"],
        properties: { success: { type: "boolean", example: true } },
      },
      Error: {
        type: "object",
        required: ["error"],
        properties: { error: { type: "string", example: "Unauthorized" } },
      },
      Bundle: {
        type: "object",
        required: [
          "id",
          "platform",
          "shouldForceUpdate",
          "enabled",
          "fileHash",
          "storageUri",
          "gitCommitHash",
          "message",
          "channel",
          "targetAppVersion",
          "fingerprintHash",
        ],
        properties: {
          id: { type: "string", format: "uuid" },
          platform: { type: "string", enum: ["ios", "android"] },
          shouldForceUpdate: { type: "boolean" },
          enabled: { type: "boolean" },
          fileHash: { type: "string" },
          storageUri: { type: "string", example: "s3://bucket/path/bundle.zip" },
          gitCommitHash: { type: "string", nullable: true },
          message: { type: "string", nullable: true },
          channel: { type: "string", default: "production" },
          targetAppVersion: { type: "string", nullable: true },
          fingerprintHash: { type: "string", nullable: true },
          metadata: { type: "object", additionalProperties: true },
          rolloutCohortCount: { type: "integer", minimum: 0, maximum: 1000, default: 1000 },
          targetCohorts: { type: "array", items: { type: "string" }, nullable: true },
          manifestStorageUri: { type: "string", nullable: true },
          manifestFileHash: { type: "string", nullable: true },
          assetBaseStorageUri: { type: "string", nullable: true },
        },
      },
      BundlePatch: {
        type: "object",
        description: "Any mutable Bundle field. The id field is optional but must match the path ID when supplied.",
        properties: {
          enabled: { type: "boolean" },
          shouldForceUpdate: { type: "boolean" },
          channel: { type: "string" },
          message: { type: "string", nullable: true },
          targetAppVersion: { type: "string", nullable: true },
          rolloutCohortCount: { type: "integer", minimum: 0, maximum: 1000 },
          targetCohorts: { type: "array", items: { type: "string" }, nullable: true },
        },
      },
      PaginatedBundles: {
        type: "object",
        required: ["data", "pagination"],
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/Bundle" } },
          pagination: {
            type: "object",
            required: ["total", "hasNextPage", "hasPreviousPage", "currentPage", "totalPages"],
            properties: {
              total: { type: "integer" },
              hasNextPage: { type: "boolean" },
              hasPreviousPage: { type: "boolean" },
              currentPage: { type: "integer" },
              totalPages: { type: "integer" },
              nextCursor: { type: "string", nullable: true },
              previousCursor: { type: "string", nullable: true },
            },
          },
        },
      },
      Channels: {
        type: "object",
        required: ["data"],
        properties: {
          data: {
            type: "object",
            required: ["channels"],
            properties: { channels: { type: "array", items: { type: "string" } } },
          },
        },
      },
    },
  },
} as const;
