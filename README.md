# Hot Updater Server

Self-hosted Hot Updater backend using:

- Express
- Prisma
- PostgreSQL
- AWS S3-compatible storage

## Project Structure

This is an npm workspaces monorepo with two apps sharing a single root lockfile:

```txt
apps/
  api/   Express + Prisma + @hot-updater/server — the backend (deployable)
  web/   React + Vite dashboard — a static site
```

Each app has its own `package.json`; the root `package.json` only declares the
workspaces and forwards commands. Run everything from the repo root:

| Command | Runs |
|---|---|
| `npm run dev` | API in watch mode (`apps/api`) |
| `npm run dev:web` | Vite dev server (`apps/web`) |
| `npm run build` | Build the API into `apps/api/dist` |
| `npm run build:web` | Build the dashboard into `apps/web/dist` |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run prisma:migrate:deploy` | Apply pending migrations (production) |
| `npm run prisma:generate` | Regenerate the Prisma client |

Environment files: local API config lives in `apps/api/.env`, the web dev
override in `apps/web/.env`, and production Compose config in `.env.production`
at the root.

## Run Locally

### 1. Create the environment file

Copy the example file and replace the S3 values with the IAM access key and bucket you created. Do not commit `apps/api/.env`.

```sh
cp apps/api/.env.example apps/api/.env
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

Express is API-only and does not render or serve dashboard HTML. For frontend development, keep the API running on port `3001` and start Vite separately:

```sh
npm run dev:web
```

Open `http://localhost:5173/dashboard/`. Vite proxies `/dashboard/api/*` to the Express server.

If you want to test the web app against a deployed API instead of the local proxy, create `apps/web/.env`:

```sh
cp apps/web/.env.example apps/web/.env
```

```env
VITE_API_BASE_URL="https://your-api.up.railway.app"
```

Build the API and web independently:

```sh
npm run build
npm run build:web
```

For production, publish `apps/web/dist` as a separate static site. Set `VITE_API_BASE_URL` in the web host to your API origin, for example `https://your-api.up.railway.app`.

### Deploy the dashboard web

Recommended setup:

- API: Railway
- Web: Vercel, Netlify, Railway static hosting, or AWS Amplify

For Vercel:

- Root Directory: `apps/web`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable: `VITE_API_BASE_URL=https://your-api.up.railway.app`
- Open URL: `https://your-dashboard.vercel.app/dashboard/`

On the API host, allow the deployed dashboard origin:

```env
DASHBOARD_ALLOWED_ORIGINS="https://your-dashboard.vercel.app"
```

For multiple dashboard domains, separate them with commas:

```env
DASHBOARD_ALLOWED_ORIGINS="http://localhost:5173,https://your-dashboard.vercel.app"
```

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

Set these values in `apps/api/.env` (local) or your host's environment (production):

- `DATABASE_URL`
- `HOT_UPDATER_AUTH_TOKEN`
- `HOT_UPDATER_SERVER_URL`
- `DASHBOARD_ALLOWED_ORIGINS` for deployed dashboard web origins
- `S3_REGION`
- `S3_ENDPOINT` for S3-compatible providers only
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`

## CLI Usage

A reference config lives at `apps/api/hot-updater.config.ts` (used by `npm run hot-updater:schema` to regenerate the Prisma models). To deploy bundles, copy the same configuration into the React Native project that owns them and run the CLI there.

```sh
npx hot-updater deploy -p ios
npx hot-updater deploy -p android
```

Bundle management endpoints under `/hot-updater/api/*` require:

```txt
Authorization: Bearer <HOT_UPDATER_AUTH_TOKEN>
```
