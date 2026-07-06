# Docker dev environment

## Chạy

```bash
cp .env.example .env      # 1 lần đầu
docker compose -f docker/docker-compose.dev.yml up --build
```

- Frontend (Vite dev server, HMR): http://localhost:5173
- Backend (Express API): http://localhost:4000/api/health
- Postgres: localhost:5432
- Adminer (xem DB trực quan): http://localhost:8080 (System: PostgreSQL, Server: postgres, user/pass theo `.env`)

Sửa code trong `frontend/src` hoặc `backend/src` trên máy host sẽ tự động áp dụng trong container (HMR cho frontend qua Vite, restart cho backend qua `nodemon`) — không cần rebuild image.

**Lưu ý về watcher trên Windows**: cả Vite (`usePolling: true` trong `vite.config.ts`) và nodemon (`legacyWatch: true` trong `backend/nodemon.json`) đều phải bật chế độ polling thay vì dựa vào native filesystem events — vì lớp chia sẻ file của Docker Desktop trên Windows không luôn báo đúng sự kiện thay đổi file cho watcher bên trong container. Đã kiểm chứng thực tế: sửa file trên host, cả 2 service đều tự áp dụng thay đổi trong vài giây mà không cần restart container.

## Vì sao `node_modules` là named volume riêng?

Trên Windows, bind-mount toàn bộ thư mục `frontend`/`backend` từ host vào container sẽ **đè luôn `node_modules`** đã cài trong image (vốn là binary Linux) bằng `node_modules` rỗng/không tương thích của host. Compose file khai báo thêm một volume named riêng đúng path `node_modules` bên trong container:

```yaml
volumes:
  - ../backend:/app/backend
  - backend_node_modules:/app/backend/node_modules   # mount sau, "thắng" bind-mount phía trên
```

Vì path này cụ thể hơn (con của path bind-mount phía trên), Docker ưu tiên nó — `node_modules` bên trong container luôn là bản cài lúc build image, không bị ghi đè bởi host.

**Hệ quả cần nhớ — đã kiểm chứng thực tế và phát hiện 1 điểm quan trọng**: named volume chỉ được Docker nạp dữ liệu từ image **một lần duy nhất** lúc tạo mới. Sau đó, dù có `--build` lại image bao nhiêu lần, volume cũ vẫn giữ nguyên nội dung cũ — **rebuild image không tự động cập nhật dependency mới vào container đang chạy**. Cách đúng khi đổi `package.json` (thêm/xoá dependency):

```bash
docker compose -f docker/docker-compose.dev.yml exec backend npm install   # hoặc frontend
```

Chạy trực tiếp `npm install` **trong container đang chạy** (không phải trên host, không phải chỉ rebuild image) — vì `package.json` đã tự động đồng bộ qua bind-mount, chỉ cần lệnh install chạy đúng chỗ để ghi vào volume. Chỉ cần `docker compose up --build` khi đổi chính `Dockerfile.dev` (ví dụ đổi base image, thêm `apk add`).

Backend có `"postinstall": "prisma generate"` trong `package.json` — vì Prisma Client sinh code cũng nằm trong `node_modules` (cùng volume dễ bị mất khi install lại). Nếu vẫn gặp lỗi `@prisma/client did not initialize yet`, chạy tay: `docker compose exec backend npx prisma generate`.

## Biến môi trường cần phân biệt

- `DATABASE_URL` dùng tên service Docker (`postgres:5432`) — chỉ resolve được **trong** mạng Docker, backend container gọi được nhưng máy host thì không.
- `VITE_API_URL` dùng `localhost` — vì trình duyệt (chạy trên host, không phải trong container) là bên gọi API, không phải Vite dev server.

## Migration Prisma

Luôn chạy migration **trong container backend**, không chạy trên host Windows (tránh lệch binary engine Prisma giữa 2 hệ điều hành):

```bash
docker compose -f docker/docker-compose.dev.yml exec backend npx prisma migrate dev
```

## Chạy bản Production

```bash
docker compose -f docker/docker-compose.prod.yml up --build -d
```

- Frontend (Nginx, build tĩnh): http://localhost:8081
- Backend **không** mở port ra host — chỉ Nginx (`/api/` proxy) và các container khác trong cùng network gọi được, đúng chuẩn không để lộ backend ra ngoài.
- Không bind-mount, không hot-reload — mỗi lần đổi code phải `--build` lại.

**⚠️ Quan trọng: `dev` và `prod` phải có project name khác nhau.** Cả 2 file compose nằm chung thư mục `docker/`, nếu không khai báo `name:` riêng ở đầu mỗi file thì Docker Compose sẽ dùng chung 1 project name mặc định (theo tên thư mục) → chạy `prod` sẽ **đè luôn container `dev` đang chạy cùng tên** (đã gặp thật khi làm M7). Cả 2 file hiện đã có `name: dinhduong-dev` / `name: dinhduong-prod` ở dòng đầu — không xoá dòng này.

Nếu ngờ dev "tự nhiên bị tắt", kiểm tra bằng `docker ps -a` xem container có đúng tên `dinhduong-dev-*` không, hay đã bị container `docker-*`/`dinhduong-prod-*` nào chiếm mất tên.
