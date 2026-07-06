# Tasks — Đánh Giá Dinh Dưỡng Nhi Khoa

> File này theo dõi tiến độ thực tế của dự án. Cập nhật tick `[x]` ngay khi một mục hoàn thành và được kiểm chứng (chạy test/thử tay), không tick trước.

## Phase 1 — Chuyển đổi Full-Stack (React + Node + PostgreSQL + Docker)

- [x] **M1** — Scaffold monorepo (npm workspaces) + Docker dev environment, hot-reload xác nhận cho cả frontend (Vite) và backend (nodemon)
- [x] **M2** — Prisma schema (`Patient`) + migration đầu tiên, xác nhận qua `psql`
- [x] **M3** — Port engine tính toán (bảng WHO, năng lượng, vi chất, Z-score, thực đơn) sang service thuần TypeScript + 99 unit test
- [x] **M4** — API CRUD bệnh nhân (`/api/assessments`, `/api/patients`) + validate Zod + 10 integration test + smoke test tay qua HTTP
- [x] **M5** — Frontend React: design system port từ bản gốc, 3 tab (Nhập liệu / Kết quả / Nhật ký) nối API thật, React Query, 6 smoke test
- [x] **M6a** — CSV export server-side (`GET /api/patients/export/csv`), nút "Xuất CSV" ở tab Nhật Ký — đã xong từ M4, xác nhận qua integration test (content-type, escape dấu phẩy/ngoặc kép)
- [x] **M6b** — Port PDF export sang React (`PdfReportTemplate.tsx` + `PdfExportButton.tsx`, dùng lại `html2pdf.js`) — code hoàn chỉnh, type-check sạch, Vite load module không lỗi. ⚠️ **Chưa tự kiểm chứng được file PDF thực tế** (cần Canvas API của trình duyệt, không test headless được) — nhờ bạn bấm "Xuất PDF" ở tab Kết Quả để xác nhận file tải về đúng
- [x] **M7** — Production Docker build (multi-stage: builder+runtime cho backend, builder+Nginx cho frontend) + smoke test toàn luồng (tạo→xem→xuất CSV→xóa) qua Nginx proxy trên bản production thật

**🎉 Phase 1 (M1-M7) đã hoàn tất toàn bộ.** Ứng dụng chạy được cả ở môi trường dev (`docker-compose.dev.yml`, hot-reload) lẫn production (`docker-compose.prod.yml`, Nginx + build tối ưu).

## Phase 1.5 — Sửa chuẩn tăng trưởng WHO + module Import dữ liệu

- [x] Xác minh: Bộ Y tế Việt Nam (Quyết định 3777/QĐ-BYT-2024) **không có bảng riêng** — quy định dùng thẳng chuẩn WHO 2006 (0-5 tuổi) và WHO 2007 (5-19 tuổi). Số liệu Tổng điều tra Dinh dưỡng VN là thống kê hiện trạng dân số, không phải chuẩn để chấm điểm từng trẻ.
- [x] Lấy dữ liệu chính thức trực tiếp từ bộ dữ liệu WHO dùng trong phần mềm WHO Anthro/AnthroPlus (repo GitHub chính thức của WHO), xác minh khớp với vài mốc đã có sẵn trước khi thay
- [x] Sửa **cả 2 bảng** (`WFA`, `HFA`, cả nam và nữ) — phát hiện bảng nam ở đoạn >5 tuổi cũng sai (lệch tới ~3-10cm), không chỉ riêng bảng nữ như nghi ngờ ban đầu
- [x] Tách hẳn dữ liệu chuẩn tăng trưởng ra khỏi code: bảng `GrowthStandardPoint` trong Postgres + cache trong bộ nhớ, có dữ liệu WHO mặc định đi kèm (`growth-standards-who-default.ts`) làm nền nếu chưa import gì
- [x] Chức năng **Import CSV** — tab mới "📐 Chuẩn Tăng Trưởng": xem dữ liệu hiện tại, tải xuống CSV, nhập file CSV mới (thay thế toàn bộ, áp dụng ngay không cần khởi động lại). API: `GET/POST /api/growth-standards`, `/export`, `/import`
- [x] 18 test mới (12 unit + 6 integration) xác nhận: giá trị đúng, ranh giới WHO2006/2007, **và bé gái không còn cao hơn bé trai bất thường** (dữ liệu mới cho đúng mô hình dậy thì: gái vượt trai tạm thời 10-13 tuổi, khớp y văn)
- [x] Kiểm chứng qua HTTP thật trên cả dev và production: export/import/tính toán đều phản ánh đúng dữ liệu mới ngay lập tức

## Vấn đề đã phát hiện, chưa xử lý

- [ ] (Tối ưu, không khẩn) Bundle JS frontend production ~910KB (vượt cảnh báo 500KB của Vite) — nên code-split sau này, không ảnh hưởng đúng/sai chức năng
- [ ] Bảng `GrowthStandardPoint` chưa có giao diện xem trước dữ liệu import trước khi xác nhận (chỉ có confirm dialog cảnh báo) — nếu cần an toàn hơn có thể thêm bước "xem trước, so sánh với dữ liệu cũ" trước khi ghi đè

## Vấn đề đã phát hiện và đã xử lý xong (ghi lại để không lặp lại)

- [x] `docker-compose.dev.yml` và `docker-compose.prod.yml` cùng nằm trong thư mục `docker/` nên Docker Compose dùng chung 1 project name mặc định ("docker") — chạy prod đã **vô tình thay thế container dev đang chạy** cùng tên. Đã sửa bằng cách khai báo `name: dinhduong-dev` / `name: dinhduong-prod` riêng biệt ở đầu mỗi file. Dữ liệu không mất (nằm ở volume riêng `pgdata`/`pgdata_prod`) nhưng container bị thay — nếu gặp lại tình trạng dev "tự nhiên tắt", kiểm tra `docker ps -a` xem có bị đè project name không.
- [x] Dockerfile production của backend chỉ copy `backend/node_modules`, thiếu `node_modules` gốc (nơi npm workspaces hoist package `prisma` CLI) → lúc chạy `npx prisma migrate deploy` tự tải bản Prisma khác (7.8.0) từ mạng thay vì dùng bản đã khai báo (5.20.x). Đã sửa bằng cách copy cả 2 thư mục `node_modules` (gốc + backend) sang image runtime.

## Tầng 2 — Tính năng Trung cấp (đang triển khai)

- [x] Biểu đồ tăng trưởng trực quan — 2 biểu đồ đường SVG tự viết (không thêm thư viện ngoài) trong tab "Chuẩn Tăng Trưởng": Cân nặng theo tuổi (WFA, 0–5 tuổi) và Chiều cao theo tuổi (HFA, 0–19 tuổi), tách riêng Nam/Nữ, có hover xem chi tiết từng mốc tháng tuổi. Đây là biểu đồ chuẩn tham chiếu WHO, chưa phải đường cong theo dõi nhiều lần khám của 1 bệnh nhân cụ thể (mục "Theo dõi xu hướng đa lần khám" bên dưới vẫn chưa làm).
- [x] Chuẩn kép WHO (≤5 tuổi) / WHO 2007 (>5 tuổi) — **thay hẳn công thức Z-score xấp xỉ cũ (`(value-median)/(median*hệ số cố định)`) bằng phương pháp LMS thật của WHO** (`Z = ((X/M)^L-1)/(L*S)`). Xác nhận: mục "hoặc CDC" trong đề bài là sót lại từ trước — Phase 1.5 đã xác nhận Việt Nam dùng thẳng WHO 2006/2007, không dùng CDC. Lấy trực tiếp cột L/S từ đúng các file nguồn WHO đã dùng ở Phase 1.5 (`weianthro.txt`/`lenanthro.txt`/`hfawho2007.txt`), cộng thêm 2 file mới `wflanthro.txt`/`wfhanthro.txt` cho chỉ số **Cân nặng/Chiều cao (WFH) — trước đây chưa từng có bảng WHO thật, chỉ tự chế từ WFA+HFA**. WFH giờ tra theo đúng chiều cao đo được (không theo tháng tuổi) vì bảng WHO gốc là vậy — lưu riêng dạng bundled data, không qua tab import CSV (khác trục dữ liệu với WFA/HFA). **Đổi định dạng CSV import/export** của tab "Chuẩn Tăng Trưởng" từ 5 cột thành 7 cột (`...,l,s,...`) — phá vỡ tương thích ngược có chủ đích, đã xác nhận với user. Phát hiện thêm 1 bug làm tròn ngày (Math.round thay vì Math.floor) gây sai lệch nhẹ ở các tháng 8/24/40/56. 25 test mới, xác minh qua HTTP thật khớp chính xác tính tay.
- [x] Cơ sở dữ liệu thành phần dinh dưỡng thực phẩm Việt Nam — `food-composition.data.ts` mới (kcal/carb/protein/fat thật cho 25 loại nguyên liệu), thay các hằng số mật độ tự chế trong `menu.service.ts` (carbDensity=0.28, fatFromMeat=wPro*0.05...). Năng lượng/macro mục tiêu vẫn tính độc lập theo tuổi/cân nặng như cũ (không đổi kiến trúc) — chỉ số gam nguyên liệu hiển thị giờ dựa trên dữ liệu thật. Tiện thể sửa 4 bug phát hiện được khi rà code: "bánh mì" bị nhận nhầm thành "bún/phở" (do check `.includes('mì')` chạy trước), "Sữa cao năng lượng" viết đầy đủ không khớp check "sữa cao nl", nhánh chết cho "sữa hạt" trong món chính (đã xóa), và món có "sữa" trong tên bị ép thành đồ ăn phụ dù là bữa chính có tinh bột. 9 test mới.
- [x] Lọc thực đơn theo dị ứng thực phẩm / tôn giáo / ăn chay — 7 nút chọn (chay, không hải sản/trứng/sữa/đậu phộng-hạt/thịt heo/thịt bò) ở tab Nhập Liệu. Món không hợp sẽ tự thay bằng món khác cùng bữa trong 7 món mẫu/tuần đã có sẵn (không cần bảng gắn thẻ thủ công cho 401 món — dùng nhận diện từ khóa như code có sẵn); nếu cả 7 món cùng bữa đều không hợp thì dùng món trung tính an toàn (cơm + đậu phụ + rau). Rà qua HTTP thật phát hiện thêm nhiều từ khóa thịt bị bỏ sót (lươn, bê, chả/nem/giò/pate = thịt chế biến, sốt vang = bò) — đã bổ sung. Còn sót 1-2 món tên phiên âm không có từ khóa rõ ràng (VD "Mì vằn thắn") — giới hạn đã biết của cách nhận diện từ khóa, không phải bug. 12 test mới.
- [ ] Theo dõi xu hướng đa lần khám (trend nhiều chỉ số qua thời gian, không chỉ 1 lần khám)
- [ ] Cảnh báo lâm sàng tự động (VD: sụt cân bất thường giữa 2 lần khám → flag đỏ)
- [x] Quản lý người dùng & phân quyền (bác sĩ / điều dưỡng / admin) — JWT trong httpOnly cookie (không session store, sống sót qua restart nodemon), 3 vai trò với ma trận quyền: admin quản lý user + mọi thứ, bác sĩ toàn quyền lâm sàng trừ quản lý user/chuẩn tăng trưởng, điều dưỡng thêm/xem bệnh nhân nhưng không xóa. Tài khoản admin đầu tiên tự tạo từ `ADMIN_EMAIL`/`ADMIN_PASSWORD` trong `.env` lúc server khởi động nếu bảng User rỗng. 22 test mới (integration, 2 file mới `auth`/`users` + bổ sung vào 2 file cũ) xác nhận phân quyền, guard admin-cuối-cùng, và tự-vô-hiệu-hóa. Xác minh qua HTTP thật: login/me/logout, 401 khi chưa đăng nhập, 403 đúng vai trò.
- [x] Nhắc lịch tái khám qua email (SMS/Zalo chưa làm — cần tài khoản dịch vụ trả phí user chưa có) — trường "Email phụ huynh" mới (tùy chọn) trong form nhập liệu; job `node-cron` quét mỗi ngày (mặc định 8:00 sáng, cấu hình qua `REVISIT_REMINDER_CRON`) tìm bệnh nhân có ngày tái khám trong `REVISIT_REMINDER_DAYS_BEFORE` ngày tới (mặc định 3) và gửi email qua `nodemailer`, đánh dấu `revisitReminderSentAt` để không gửi trùng. **Dry-run mặc định**: chưa cấu hình `SMTP_*` trong `.env` thì chỉ log ra console thay vì gửi thật — điền SMTP thật vào sau không cần sửa code/build lại. 7 test mới (unit email dry-run/thật + integration quét đúng/sai điều kiện). Xác minh qua HTTP thật + gọi thẳng hàm quét trong container: tạo bệnh nhân có lịch tái khám gần + email → quét thấy đúng 1 người, đánh dấu đã gửi, quét lại lần 2 = 0 (không gửi trùng).
- [x] Tìm kiếm, lọc, thống kê danh sách bệnh nhân — tab Nhật Ký giờ có: tìm theo tên, lọc theo giới/tình trạng CN-CC (SDD cấp nặng/Suy dinh dưỡng cấp/Bình thường/Thừa cân/Béo phì)/khoảng ngày khám, và 4 ô thống kê (tổng số, % SDD, % thừa cân-béo phì, % bình thường) tự tính theo đúng danh sách đang lọc — hoàn toàn phía frontend (danh sách bệnh nhân vốn đã tải hết về máy), không cần API mới. Tiện thể ẩn luôn nút xóa hồ sơ với tài khoản Điều dưỡng (trước đó nút vẫn hiện nhưng bấm sẽ bị 403 — lỗ hổng UX sót lại từ lúc làm phân quyền). 2 test mới xác nhận lọc đúng theo tên và ẩn nút xóa theo vai trò.
- [ ] Báo cáo thống kê phòng khám (tỷ lệ SDD/thừa cân theo tháng, hiệu quả can thiệp)
- [ ] Backup dữ liệu định kỳ, audit trail thao tác người dùng

## Tầng 3 — Tính năng Nâng cao (tầm nhìn dài hạn)

- [ ] Tích hợp HIS/EMR/LIS bệnh viện (chuẩn HL7/FHIR)
- [ ] AI dự đoán nguy cơ SDD/béo phì dựa trên xu hướng tăng trưởng
- [ ] App di động cho phụ huynh (nhật ký ăn uống tại nhà, nhắc nhở, xem lịch sử khám)
- [ ] Nhận diện ảnh chụp thức ăn để ước tính khẩu phần thực tế
- [ ] Tự động tối ưu thực đơn (thay thực đơn mẫu cố định bằng thuật toán cân bằng dinh dưỡng/chi phí/khẩu vị)
- [ ] Telemedicine / tư vấn dinh dưỡng từ xa
- [ ] Chữ ký số bác sĩ trên phiếu kết quả (giá trị pháp lý hồ sơ bệnh án điện tử)
- [ ] Multi-tenant SaaS cho chuỗi phòng khám
- [ ] Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân (đặc biệt nhạy cảm vì là dữ liệu trẻ em + sức khoẻ)
