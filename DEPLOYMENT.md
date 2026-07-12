# Deployment Guide (DevOps)

Server OTA update cho React Native (hot-updater). App là **1 container Node stateless**, đóng gói sẵn bằng `Dockerfile` ở root repo.

## Kiến trúc

```
Mobile app ──HTTPS──> LB/Ingress ──> container :3001 ──> PostgreSQL (metadata)
    │
    └──presigned URL──> S3 bucket (file bundle)
```

- Server chỉ giữ **metadata** trong Postgres; file bundle nằm trên S3, client tải trực tiếp qua presigned URL.
- Container tự chạy `prisma migrate deploy` lúc boot — **không cần bước migrate riêng** trong pipeline.

## 1. Hạ tầng cần cấp

| Thành phần | Yêu cầu |
|---|---|
| Compute | 1 VM/pod nhỏ (2 vCPU / 2GB dư sức). Stateless, scale ngang được |
| PostgreSQL | 1 database `hot_updater`. Dung lượng rất nhỏ (chỉ metadata). Ưu tiên Postgres managed/cụm chung |
| Object storage | 1 bucket S3 hoặc S3-compatible (MinIO/Ceph). Client tải bundle qua presigned URL → bucket phải reachable từ internet (không cần public ACL) |
| Domain + TLS | 1 subdomain, vd `updates.example.com`. **HTTPS bắt buộc** (client mobile không chấp nhận HTTP). LB/Ingress → container port `3001` |

## 2. Environment variables (inject qua secret manager)

| Biến | Mô tả |
|---|---|
| `DATABASE_URL` | Connection string Postgres, vd `postgresql://user:pass@host:5432/hot_updater?schema=public` |
| `HOT_UPDATER_AUTH_TOKEN` | `openssl rand -hex 32`. Bảo vệ API quản lý bundle; cấp cho team RN dùng trong CI |
| `DASHBOARD_ALLOWED_ORIGINS` | Domain web dashboard được phép gọi API, vd `https://dashboard.example.com`. Nhiều domain thì phân tách bằng dấu phẩy |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | IAM user quyền RW đúng 1 bucket |
| `S3_BUCKET_NAME` | Tên bucket |
| `S3_REGION` | Region (`auto` với R2/MinIO) |
| `S3_ENDPOINT` | Chỉ điền khi dùng S3-compatible (MinIO/R2); AWS để trống |
| `PORT` | Mặc định `3001` |
| `STICKY_FORCE_UPDATE` | `true`: user bỏ lỡ một bản force thì bản update mới nhất cũng trả về force. Mặc định tắt |

IAM policy tối thiểu: `s3:PutObject`, `s3:GetObject`, `s3:ListBucket` trên đúng bucket.

App fail-fast lúc boot nếu thiếu biến bắt buộc (log ghi rõ biến nào thiếu).

## 3. Build & deploy

```sh
docker build -t hot-updater-server .
docker run -p 3001:3001 --env-file .env.production hot-updater-server
```

- CI/CD: build image → push registry → rollout theo pipeline chuẩn. Migration tự chạy khi container start.
- **Healthcheck:** `GET /health` → `{"ok":true}`. Dùng cho LB probe / k8s liveness + readiness.
- Graceful shutdown: app xử lý SIGTERM (đóng server + ngắt kết nối DB) — rolling update an toàn.
- 1 replica là đủ cho khởi đầu.

Tham khảo: `docker-compose.production.yml` trong repo là bản chạy đủ stack (Postgres + app) trên 1 máy đơn.

## 3.1 Deploy dashboard web

Dashboard nằm ở `apps/web` và deploy tách khỏi API.

Vercel/Netlify/Railway Static/Amplify đều được. Cấu hình chung:

| Mục | Giá trị |
|---|---|
| Root directory | `apps/web` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Web env | `VITE_API_BASE_URL=https://your-api.up.railway.app` |
| Open URL | `https://your-dashboard.vercel.app/dashboard/` |

Trên API Railway, set thêm:

```env
DASHBOARD_ALLOWED_ORIGINS="https://your-dashboard.vercel.app"
```

Nếu cần vừa local vừa production:

```env
DASHBOARD_ALLOWED_ORIGINS="http://localhost:5173,https://your-dashboard.vercel.app"
```

## 4. Network / security

| Route | Ai gọi | Chính sách |
|---|---|---|
| `GET /hot-updater/app-version/*`, `GET /hot-updater/fingerprint/*` | Mobile app (public) | Mở internet. Rate-limit nhẹ ở LB nếu có (mỗi lần mở app gọi 1 lần) |
| `/hot-updater/api/*` | CI/team RN | Đã có Bearer auth trong app. Chặt hơn: giới hạn IP văn phòng/CI ở LB |
| `/health`, `/hot-updater/version` | LB, giám sát | Mở |
| `/docs`, `/openapi.json` | Dev | Swagger UI — nên chặn ở LB với production |

Postgres không expose ra internet, chỉ app reach được.

## 5. Vận hành

- **Backup Postgres** theo policy chung — dữ liệu nhỏ, backup ngày là đủ.
- **Bucket lifecycle:** bundle cũ tích dần; đặt rule xoá object sau X tháng hoặc team RN dọn qua API.
- **Log:** app log ra stdout — gom bằng stack sẵn có.
- **Alert:** health probe fail, 5xx rate.

## 6. Bàn giao cho team RN sau khi lên

1. URL server: `https://updates.example.com/hot-updater`
2. `HOT_UPDATER_AUTH_TOKEN` + S3 credentials (cho CI chạy `npx hot-updater deploy`)

## 7. Verify sau deploy

```sh
curl https://updates.example.com/health                # {"ok":true}
curl https://updates.example.com/hot-updater/version   # {"version":"..."}

# Update-check (kỳ vọng null khi chưa có bundle):
curl "https://updates.example.com/hot-updater/app-version/android/1.0.0/production/00000000-0000-0000-0000-000000000000/00000000-0000-0000-0000-000000000000"

# API quản lý phải trả 401 khi thiếu token:
curl -i https://updates.example.com/hot-updater/api/bundles
```
