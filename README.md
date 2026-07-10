# Hot Updater Server

Self-hosted Hot Updater backend using:

- Express
- Prisma
- PostgreSQL
- AWS S3-compatible storage

## Run Locally

### 1. Create the environment file

Copy the example file and replace the S3 values with the IAM access key and bucket you created. Do not commit `.env`.

```sh
cp .env.example .env
```

For AWS S3, keep `S3_ENDPOINT` empty. `PORT=3001` is the default because port `3000` is commonly used by another local service.

```env
PORT=3001
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hot_updater?schema=public"
HOT_UPDATER_AUTH_TOKEN="use-a-long-random-token"
HOT_UPDATER_SERVER_URL="http://localhost:3001/hot-updater"

S3_REGION="us-east-1"
S3_ENDPOINT=
S3_ACCESS_KEY_ID="AKIA..."
S3_SECRET_ACCESS_KEY="..."
S3_BUCKET_NAME="your-bucket-name"
```

### 2. Start PostgreSQL

```sh
docker compose up -d
```

### 3. Install dependencies and create the database schema

```sh
npm install
npm run prisma:migrate -- --name init
```

Run the migration only the first time, or after updating the Prisma schema.

### 4. Start the server

```sh
npm run dev
```

The server runs at `http://localhost:3001/hot-updater`.

Verify it in a browser or terminal:

```sh
curl http://localhost:3001/health
```

Expected response:

```json
{"ok":true}
```

Open Swagger UI at `http://localhost:3001/docs`. Click **Authorize**, then enter the value of `HOT_UPDATER_AUTH_TOKEN` to test bundle management endpoints.

Stop the server with `Ctrl + C`. Stop PostgreSQL with:

```sh
docker compose down
```

## Docker Production

The production Compose file runs PostgreSQL, applies Prisma migrations, then starts the API. PostgreSQL is not exposed outside Docker; publish only the API port through a reverse proxy with HTTPS.

```sh
cp .env.production.example .env.production
```

Set real AWS S3 credentials, a strong `HOT_UPDATER_AUTH_TOKEN`, a strong `POSTGRES_PASSWORD`, and your public HTTPS URL in `HOT_UPDATER_SERVER_URL`.

```sh
docker compose -f docker-compose.production.yml --env-file .env.production up -d --build
docker compose -f docker-compose.production.yml --env-file .env.production logs -f hot-updater
```

The API is available on port `3001` of the server. Use a reverse proxy such as Caddy, Nginx, or your hosting provider to serve it as `https://updates.example.com`.

To stop the production stack without deleting its database volume:

```sh
docker compose -f docker-compose.production.yml --env-file .env.production down
```

## Environment

Set these values in `.env`:

- `DATABASE_URL`
- `HOT_UPDATER_AUTH_TOKEN`
- `HOT_UPDATER_SERVER_URL`
- `S3_REGION`
- `S3_ENDPOINT` for S3-compatible providers only
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`

## CLI Usage

Use `hot-updater.config.ts` in the React Native project that deploys bundles, or copy the same configuration there.

```sh
npx hot-updater deploy -p ios
npx hot-updater deploy -p android
```

Bundle management endpoints under `/hot-updater/api/*` require:

```txt
Authorization: Bearer <HOT_UPDATER_AUTH_TOKEN>
```
