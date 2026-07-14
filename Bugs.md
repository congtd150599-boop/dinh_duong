# Bugs.md — Nhật ký sửa lỗi công thức tính chỉ số dinh dưỡng

Ghi lại quá trình rà soát công thức tính chỉ số dinh dưỡng (backend) đối chiếu với tài liệu chuẩn trong `documents/`, các lỗi phát hiện, cách sửa, và cách đã xác minh. Theo yêu cầu ban đầu: "Phân tích các tiêu chuẩn trong documents để kiểm tra lại các thuật toán tính chỉ số dinh dưỡng" (2026-07-11).

## Phương pháp rà soát

Đọc code tính toán (`z-score.service.ts`, `assessment.service.ts`, `energy.service.ts`, `growth-standards.service.ts`, `wfh-lms.service.ts`) rồi đối chiếu với 2 tài liệu chuẩn trích xuất được text:
- `documents/DD trong SDD nặng.pdf` (10 trang) — tiêu chuẩn chẩn đoán SDD cấp nặng, ngưỡng MUAC.
- `documents/Hướng dẫn điều trị Nhi khoa Phần Ngoại Trú 2025 (...).pdf` (797 trang) — Chương V: Dinh dưỡng, tr.148, **Bảng 1 "Phân loại tình trạng dinh dưỡng theo WHO"** (nguồn chuẩn chính cho toàn bộ phần sửa lỗi bên dưới).
- `documents/Béo phì ở trẻ em .2024.pptx.pdf` (29 trang) — bảng ngưỡng Z-score BMI-theo-tuổi, xác nhận chéo với Bảng 1.

`documents/CC2 - Dinh dưỡng - Béo phì.pdf` (107 trang) là bản scan ảnh, không có lớp text để trích xuất, môi trường không có OCR/poppler — không đối chiếu được, nhưng 2 nguồn còn lại đã khớp nhau nên đủ tin cậy.

---

## Bug #1 [Nghiêm trọng] — Đánh giá thừa cân/béo phì dùng ngưỡng BMI người lớn (≥25) cho mọi lứa tuổi

**Vị trí cũ**: `assessment.service.ts:41` và lặp lại ở `energy.service.ts:34` (trước khi sửa):
```js
else if (bmi >= 25 || (wfhZ !== null && wfhZ > 2) || (wfaZ !== null && wfaZ > 2)) statusKey = 'Thừa cân/Béo phì';
```

**Sai ở đâu**: `bmi >= 25` là ngưỡng béo phì người lớn (WHO), áp dụng cho trẻ em ở mọi tuổi. Bảng 1 (tr.148, "Hướng dẫn điều trị Nhi khoa 2025") quy định: dưới 60 tháng dùng CN/CC hoặc BMI/tuổi (Z-score), **từ 6 tuổi dùng BMI/tuổi (Z-score)** — không bao giờ là BMI thô. Ngưỡng Z-score còn lệch theo tuổi: <5 tuổi +2SD/+3SD (Thừa cân/Béo phì), ≥5 tuổi +1SD/+2SD (khớp thêm với `Béo phì ở trẻ em 2024.pptx.pdf` tr.5-6).

Rà code xác nhận hệ thống **chưa từng có bảng LMS cho BMI-theo-tuổi** — `GrowthMetric` chỉ có `'WFA' | 'HFA'`, và comment trong `wfh-lms-who-default.ts` (dòng cũ) đã tự ghi nhận: *"BMI-for-age is used instead, which this app does not yet compute"*. Hệ quả: với trẻ >60 tháng (wfaZ/wfhZ luôn null theo thiết kế), BMI thô gần như không bao giờ chạm 25 ở trẻ em thật (trẻ 7 tuổi béo phì theo đúng chuẩn WHO thường chỉ có BMI ~18-20) → hệ thống gần như **không phát hiện được thừa cân/béo phì cho bất kỳ bệnh nhi nào trên 5 tuổi**, kéo theo năng lượng mục tiêu không giảm 20% và macro không đổi sang tỷ lệ 35/35/30 như thiết kế.

**Cách sửa**: Thêm hẳn 1 bảng LMS BMI-theo-tuổi (BFA) thật của WHO, giống hệt cách project đã thêm WFH trước đây:
- `backend/scripts/generate-lms-growth-data.mjs`: thêm fetch 2 nguồn chính thức WHO — `bmianthro.txt` (0-60 tháng, WHO Child Growth Standards 2006, cùng cơ chế `floor(month*30.4375)` như WFA/HFA) và `bfawho2007.txt` (61-228 tháng, WHO Growth Reference 2007, cùng nguồn với HFA phần >5 tuổi). Sinh ra file mới `backend/src/data/bfa-lms-who-default.ts` (458 dòng, 2 giới × 229 tháng).
- File mới `backend/src/services/bfa-lms.service.ts`: `getBfaLms(gender, months)`, tra theo tuổi (0-228 tháng), y hệt pattern `getHfaLms`. Cố tình **không** gộp vào bảng `GrowthStandardPoint` (DB, CSV import qua tab "Chuẩn Tăng Trưởng") — giữ dạng bundled-only như WFH, để giảm phạm vi ảnh hưởng của 1 lần sửa lỗi (không đụng Prisma schema, không đụng validation CSV, không đụng UI quản lý chuẩn tăng trưởng).
- `z-score.service.ts`: thêm `classifyBfaZ(z, months)` — ngưỡng lệch theo tuổi (+2/+3SD dưới 60 tháng, +1/+2SD từ 60 tháng), tái dùng nhãn "SDD cấp nặng"/"Suy dinh dưỡng cấp"/"Thừa cân"/"Béo phì" đã có (Bảng 1 trình bày CN/CC và BMI/tuổi là 1 cột gộp, cùng ý nghĩa lâm sàng). `computeZScores` giờ nhận thêm `bmi`, `months`, `bfaLms`, trả thêm `bfaZ`/`bfa`.
- `assessment.service.ts` / `energy.service.ts`: bỏ hẳn `bmi >= 25`, thay bằng `isOverweight`/`isWasted` dựa trên `wfhZ` (mọi tuổi, ngưỡng ±2SD) OR `bfaZ` (mọi tuổi, ngưỡng theo tuổi ở trên) — không giới hạn theo tuổi vì ngưỡng của `bfaZ` dưới 60 tháng trùng khớp `wfhZ` nên OR luôn an toàn, và còn "vá" thêm được ca hiếm chiều cao ngoài bảng WFH (xem Bug #3).
- `packages/shared/src/types.ts`: thêm `bfa: string`, `bfaZ: number | null` vào `AssessmentResult` — không cần migration DB (Patient model chỉ lưu `wfa/hfa/wfh` dạng cột, còn `fullResult` (JSON) tự động lưu nguyên `AssessmentResult` nên `bfa`/`bfaZ` được lưu lịch sử miễn phí).
- `frontend/src/components/result/ResultTab.tsx`: dòng "BMI" trong bảng đánh giá **cũng tự tính lại ngưỡng người lớn y hệt** (`bmi<18.5/25/30`, độc lập với backend) — đây là lần xuất hiện thứ 3 của cùng 1 lỗi gốc, thuần ở tầng hiển thị. Đổi thành hiển thị `r.bfa` (kết quả backend đã tính đúng) thay vì tự suy ngưỡng người lớn. `InfoBox` "Tình trạng dinh dưỡng tổng thể" cũng tự suy tone/thông điệp từ `wfaZ/hfaZ/wfhZ` thô (luôn null với trẻ >5 tuổi) — bổ sung thêm nhánh `bfaZ` để không im lặng bỏ sót trẻ lớn thừa cân/béo phì/suy dinh dưỡng.

**File đổi**: `backend/scripts/generate-lms-growth-data.mjs`, `backend/src/data/bfa-lms-who-default.ts` (mới), `backend/src/services/bfa-lms.service.ts` (mới), `backend/src/services/z-score.service.ts`, `backend/src/services/assessment.service.ts`, `backend/src/services/energy.service.ts`, `packages/shared/src/types.ts`, `frontend/src/components/result/ResultTab.tsx`.

**Test mới**: `z-score.service.test.ts` (`classifyBfaZ` — ngưỡng theo tuổi), `energy.service.test.ts` (obesity/wasted trigger qua `bfaZ` thay `bmi`), `assessment.service.test.ts` (3 case thật ở tháng 84 dùng đúng LMS thật của WHO — Thừa cân bfaZ≈1.63, Béo phì bfaZ≈2.52, Suy dinh dưỡng bfaZ≈-2.5 — trước đây hoàn toàn không phát hiện được ở tuổi này).

---

## Bug #2 [Trung bình] — Ngưỡng thấp còi (HFA) lệch theo tuổi vô căn cứ

**Vị trí cũ**: `assessment.service.ts:40`:
```js
else if (hfaZ < -3 || (months > 60 && hfaZ < -2)) statusKey = 'Suy dinh dưỡng';
```

**Sai ở đâu**: Bảng 1 quy định Chiều cao/tuổi: `<-2SD = Thấp còi`, `<-3SD = Thấp còi nặng` — **không phân biệt theo tuổi**. Code cũ chỉ gắn "Suy dinh dưỡng" cho trẻ ≤60 tháng khi hfaZ<-3 (nặng), bỏ sót hoàn toàn thấp còi vừa (-3≤hfaZ<-2) ở statusKey tổng — dù nhãn `hfa` riêng lẻ vẫn đúng là "Thấp còi". Cùng hfaZ=-2.5, trẻ 4 tuổi ra "Bình thường", trẻ 6 tuổi ra "Suy dinh dưỡng" — không có cơ sở lâm sàng nào cho sự bất nhất này.

**Cách sửa**: Đổi thành ngưỡng đồng nhất `hfaZ < -2` cho mọi lứa tuổi.

**File đổi**: `backend/src/services/assessment.service.ts`. `frontend/src/components/result/ResultTab.tsx` (InfoBox tự suy tone cũng dùng `hfaZ<-3` cho tone/thông điệp — đồng bộ hoá luôn theo cùng ngưỡng, thêm nhánh thông điệp riêng cho "Thấp còi" (vừa) khác "Thấp còi nặng").

**Test mới**: `assessment.service.test.ts` — dựng đúng LMS thật của WHO tại tháng 24 (height=80.2cm → hfaZ≈-2.49, vừa đủ nằm giữa -3 và -2), giữ wfaZ/wfhZ ở mức bình thường để cô lập đúng hiệu ứng của riêng hfaZ. Trước sửa: statusKey='Bình thường' (sai). Sau sửa: statusKey='Suy dinh dưỡng'.

---

## Bug #3 [Trung bình] — Lỗi độ ưu tiên toán tử: bỏ sót nhẹ cân khi wfhZ null

**Vị trí cũ**: `assessment.service.ts:39`:
```js
if (wfhZ !== null && (wfhZ < -2 || (wfaZ !== null && wfaZ < -2))) statusKey = 'Suy dinh dưỡng';
```

**Sai ở đâu**: Điều kiện `wfaZ < -2` chỉ được xét **khi `wfhZ` đã khác null** — dấu ngoặc đặt sai chỗ khiến 2 điều kiện lẽ ra độc lập lại bị gộp theo kiểu AND ở ngoài. `wfhZ` bị null khi chiều cao đo được nằm ngoài bảng WHO WFH (45-110cm cho <24 tháng / 65-120cm cho ≥24 tháng) — trường hợp hiếm nhưng có thật (trẻ rất cao/rất thấp so với bảng). Khi đó, dù `wfaZ` cực thấp (nhẹ cân nặng thật sự), hệ thống vẫn báo "Bình thường" vì bị short-circuit ngay từ đầu.

**Cách sửa**: Tách thành 2 điều kiện độc lập nối bằng OR: `(wfhZ !== null && wfhZ < -2) || (wfaZ !== null && wfaZ < -2)` — đúng ý định ban đầu.

**File đổi**: `backend/src/services/assessment.service.ts`.

**Test mới**: `assessment.service.test.ts` — dựng ca thật (tháng 24, cao 125cm — vượt trần bảng WFH 120cm nên wfhZ=null chắc chắn; nặng 8kg → wfaZ≈-3.63; đồng thời hfaZ≈+12 (rất cao so với tuổi) để đảm bảo test không "ăn may" pass nhờ nhánh thấp còi — cô lập đúng nhánh đang sửa). Trước sửa: statusKey='Bình thường' (sai, bỏ sót trẻ nhẹ cân nặng). Sau sửa: statusKey='Suy dinh dưỡng'.

---

## Bug #4 [Nhẹ] — Dùng cân nặng/tuổi (WFA) để báo "Thừa cân" — sai cách dùng chỉ số

**Vị trí cũ**: `z-score.service.ts:15` (`classifyZ`, nhánh `'wfa'`):
```js
if (z < -3) return 'Nhẹ cân nặng';
if (z < -2) return 'Nhẹ cân';
if (z > 2) return 'Thừa cân';   // ← sai
return 'Bình thường';
```
Nhãn này cũng bị dùng lại trong `statusKey`/`calcEnergy` cũ (`wfaZ > 2` như một tín hiệu béo phì).

**Sai ở đâu**: Bảng 1 chỉ định nghĩa cột Cân nặng/tuổi đi xuống (`<-2SD=Nhẹ cân`, `<-3SD=Nhẹ cân nặng`) — không có hàng "Thừa cân" cho cột này; thừa cân/béo phì chỉ định nghĩa trên CN/CC hoặc BMI/tuổi. Đây cũng đúng khuyến cáo WHO: cân nặng/tuổi không phân biệt được trẻ cao-nặng cân đối với trẻ thật sự thừa cân (không tính chiều cao).

**Cách sửa**: Bỏ nhánh `z > 2 → 'Thừa cân'` — mọi z≥-2 đều trả `'Bình thường'`. Đồng thời bỏ luôn `wfaZ > 2` khỏi mọi logic xác định thừa cân/béo phì ở `assessment.service.ts`/`energy.service.ts` (đã bỏ tự nhiên khi viết lại `isOverweight` ở Bug #1 — chỉ còn dựa trên `wfhZ`/`bfaZ`).

**File đổi**: `backend/src/services/z-score.service.ts` (đồng thời khi sửa Bug #1).

**Test sửa**: `z-score.service.test.ts` (`z=2.01,'wfa'` giờ mong đợi `'Bình thường'` thay vì `'Thừa cân'`), `assessment.service.test.ts` (case "overweight qua WFH" — `wfa` giờ mong đợi `'Bình thường'` thay vì `'Thừa cân'`, `wfh`/`statusKey` không đổi vì đã có `wfhZ` xác nhận độc lập).

---

# Vòng 2 — Rà soát lại (code review, /code-review high effort)

Sau khi sửa xong 4 bug ở trên, chạy 1 vòng review riêng (8 nhánh tìm lỗi song song qua subagent: correctness × 3, reuse, simplification, efficiency, altitude, conventions) đối chiếu đúng diff vừa sửa. Phát hiện thêm 6 vấn đề thật, đã sửa hết ở vòng này.

## Bug #5 [Nghiêm trọng — đang ảnh hưởng thật trên production] — Xem hồ sơ bệnh nhân đã lưu từ trước sẽ crash trang Kết Quả

**Nguyên nhân**: `fullResult` (JSON) của các bệnh nhân đã lưu **trước** khi thêm field `bfa`/`bfaZ` (Bug #1) hoàn toàn không có 2 key này — đọc ra là `undefined`, không phải `null`. Code kiểm tra `r.bfaZ !== null` — nhưng `undefined !== null` cũng là `true` trong JS, nên `r.bfaZ.toFixed(2)` vẫn chạy trên `undefined` → crash (`ResultTab.tsx:152`). Tương tự `StatusBadge status={r.bfa}` gọi `classifyBadgeClass(undefined)` → `.includes()` trên `undefined` → crash (`ResultTab.tsx:158`, `Badge.tsx:18`).

Đã xác nhận **đang xảy ra thật**: production hiện có đúng 1 hồ sơ ("Trang") lưu trước thời điểm sửa Bug #1, mở lại hồ sơ này sẽ crash trang Kết Quả.

**Quyết định xử lý** (theo yêu cầu trực tiếp của user, không viết thêm code phòng thủ cho dữ liệu cũ): vì hệ thống production mới khởi động, chỉ có 1 hồ sơ test, **xoá sạch dữ liệu production** (`docker compose -f docker/docker-compose.prod.yml down --volumes`) thay vì thêm `!= null`/`?? fallback` khắp nơi để tương thích ngược với dữ liệu cũ. Sau khi xoá, mọi bệnh nhân tạo mới đều đi qua code đã có `bfa`/`bfaZ` ngay từ đầu nên không còn tái diễn — **cho tới lần tới có field mới được thêm vào `AssessmentResult`**, đây là rủi ro kiến trúc chung (JSON lưu DB không có schema migration/backfill) chứ không riêng gì `bfa`/`bfaZ`, không xử lý triệt để ở vòng sửa này theo đúng phạm vi user yêu cầu.

**File đổi**: không đổi code cho bug này — xử lý bằng thao tác hạ tầng (xem mục "Xác minh" bên dưới).

## Bug #6 [Trung bình] — Ngưỡng BFA lệch 1 tháng so với WFH tại đúng mốc 60 tháng

**Sai ở đâu**: `classifyBfaZ` (và bản sao ở `assessment.service.ts`/`energy.service.ts`/`ResultTab.tsx`) dùng `months < 60` để chọn ngưỡng SD, nghĩa là **tháng 60 chẵn** đã rơi vào nhóm ">60 tháng" (ngưỡng lỏng +1SD/+2SD). Nhưng `wfh-lms.service.ts` dùng `months > 60` mới trả `null` — tức tháng 60 chẵn **vẫn** dùng chuẩn WFH/2006 (ngưỡng +2SD/+3SD, chặt hơn). Do `isOverweight`/`isWasted` OR cả `wfhZ` lẫn `bfaZ` lại, đúng tại tháng 60, 2 chỉ số dùng 2 bộ ngưỡng khác nhau cho cùng 1 lần khám — 1 trẻ có bfaZ=1.5 có thể bị báo "Thừa cân" (theo ngưỡng lỏng bị áp nhầm) dù wfhZ cùng lúc nói "Bình thường" (ngưỡng chặt đúng).

**Cách sửa**: Đổi toàn bộ `months < 60` thành `months <= 60` (khớp đúng ranh giới `months > 60` của WFH).

**File đổi**: `backend/src/services/z-score.service.ts`, `backend/src/services/assessment.service.ts`, `backend/src/services/energy.service.ts`, `frontend/src/components/result/ResultTab.tsx`.

**Test sửa/thêm**: `z-score.service.test.ts` (thêm case tháng 60 chẵn phải dùng ngưỡng chặt), `energy.service.test.ts` (đổi test "≥60 tháng" từ tháng 60 sang tháng 61, thêm test xác nhận tháng 60 vẫn dùng ngưỡng chặt).

## Bug #7 [Nhẹ] — BMI bị làm tròn 1 chữ số thập phân trước khi tính Z-score

**Sai ở đâu**: `assessment.service.ts` tính `bmi` bằng `.toFixed(1)` (dùng để hiển thị) rồi đưa thẳng giá trị đã làm tròn này vào công thức LMS tính `bfaZ`. Sai số làm tròn tới 0.05 BMI có thể đủ để lật ngược phân loại ngay tại ranh giới SD (chính bộ test của dự án đã phân biệt rạch ròi z=2.00 và z=2.01).

**Cách sửa**: Tính riêng `bmiRaw` (chưa làm tròn) để đưa vào `computeZScores`, giữ `bmi` (đã làm tròn) chỉ để hiển thị.

**File đổi**: `backend/src/services/assessment.service.ts`.

## Bug #8 [Nhẹ] — Nhãn fallback của BFA không khớp bảng màu badge

**Sai ở đâu**: Khi `bfaLms` null (hiếm, lỗ hổng dữ liệu), `z-score.service.ts` trả `bfa = 'Không áp dụng'` — nhưng `Badge.tsx`'s `STATUS_BADGE_CLASS` chỉ có key `'Không áp dụng (>5 Tuổi)'`. Không khớp chuỗi chính xác, rơi xuống các heuristic `.includes(...)` cũng không khớp, cuối cùng badge hiện màu xanh "bình thường" — sai, gây hiểu nhầm cho 1 trường hợp lẽ ra là "không xác định được".

**Cách sửa**: Thêm key `'Không áp dụng'` riêng vào `STATUS_BADGE_CLASS` (giữ nguyên chuỗi `'Không áp dụng (>5 Tuổi)'` cho WFA/WFH vì lý do "N/A" khác nhau — 1 bên là do tuổi, 1 bên là lỗ hổng dữ liệu).

**File đổi**: `frontend/src/components/shared/Badge.tsx`.

## Bug #9 [Nghiêm trọng] — PDF báo cáo và panel so sánh WHO khi nhập liệu vẫn dùng ngưỡng BMI người lớn cũ

**Sai ở đâu**: Khi sửa Bug #1, chỉ sửa `assessment.service.ts`/`energy.service.ts` (backend) và bảng trong `ResultTab.tsx` — bỏ sót **2 chỗ khác** cũng tự tính lại ngưỡng BMI người lớn (18.5/25/30) độc lập, y hệt lỗi gốc:
- `frontend/src/pdf/PdfReportTemplate.tsx` (dòng ~120, ~206) — **đây là file dựng PDF thật sự gửi/tải cho phụ huynh và bác sĩ**. Một trẻ 7 tuổi được `ResultTab` báo đúng "Thừa cân" (theo `bfaZ`) vẫn có thể xuất ra PDF ghi "Bình thường" (theo BMI thô <25) — mâu thuẫn ngay trên cùng 1 hồ sơ.
- `frontend/src/components/input/WhoComparePanel.tsx` (dòng ~53) — panel xem trước "So Sánh Chuẩn WHO" khi đang nhập liệu, cùng lỗi.

Tiện phát hiện thêm: hàm `badgeCls()` dùng chung trong `PdfReportTemplate.tsx` (đã tồn tại từ trước, không phải lỗi mới) không nhận diện được chuỗi `'Suy dinh dưỡng cấp'` (không chứa "nặng"/"SDD"/"cân"/"còi"/"Thừa"/"Béo") nên rơi vào badge xanh "bình thường" — ảnh hưởng cả nhãn `wfh` cũ lẫn `bfa` mới. Sửa luôn bằng cách thêm từ khoá "dưỡng".

**Cách sửa**: Cả 2 file đổi sang dùng `r.bfa`/`result.bfaZ` (backend đã tính đúng) thay vì tự suy ngưỡng người lớn.

**File đổi**: `frontend/src/pdf/PdfReportTemplate.tsx`, `frontend/src/components/input/WhoComparePanel.tsx`.

## Bug #10 [Rất nhẹ, chỉ ảnh hưởng test] — Literal BMI cũ còn sót trong test bracket-transition

`energy.service.test.ts`'s block "bracket transitions" (không đổi bởi vòng sửa Bug #1) vẫn truyền số dạng BMI cũ (16, 20) vào tham số thứ 6 — giờ mang nghĩa `bfaZ`. Test vẫn pass (chỉ assert `.stdEnergy`, tính trước khi nhánh overweight chạy) nhưng về logic, các số này giờ vô nghĩa (Z-score=16/20 không tồn tại thật) và có thể gây pass giả nếu sau này có ai thêm assertion `targetEnergy` vào đúng chỗ đó. Đổi hết thành `null`.

**File đổi**: `backend/src/services/energy.service.test.ts`.

---

## Xác minh

- **Vòng 1**: Test backend 290/293 pass, backend/frontend type-check sạch, frontend 10/10 test pass, smoke-test HTTP thật trên production (trẻ 7 tuổi thừa cân) đúng kỳ vọng.
- **Vòng 2 (sau khi sửa Bug #5-#10)**: Test backend **293/296 pass** (đúng 3 lỗi môi trường `pg_dump` không đổi từ vòng 1, vẫn không liên quan). Backend/frontend type-check sạch. Frontend 10/10 test pass.
- 3 lỗi còn lại (`backup.service.test.ts`, `pg_dump: not found`) là môi trường container dev thiếu sẵn `postgresql16-client` dù Dockerfile đã khai báo (image cũ, cần `--build` lại) — **không liên quan** tới các sửa đổi trong tài liệu này, không đụng tới.
  - Nhân tiện phát hiện thêm 2 vấn đề môi trường không liên quan lúc chạy test lần đầu, đã tự xử lý để có kết quả test đáng tin cậy: DB test (`dinhduong_test`) chưa từng migrate (chạy `prisma migrate deploy` trỏ `DATABASE_URL_TEST`), và Prisma Client trong container bị cũ/thiếu 2 model `Child`/`Guardian` (chạy `prisma generate` + restart container — đúng y sự cố đã ghi nhận trước đó ở `Tasks.md`).
- **Type-check**: backend (`tsc --noEmit`) — 9 lỗi còn lại đều thuộc file test tích hợp cũ (`supertest`/`superagent` type mismatch) và 1 file test `growth-standards.service.test.ts` cũ thiếu `l`/`s`, không đụng tới bất kỳ file nào vừa sửa. Frontend (`tsc --noEmit`) — sạch, 0 lỗi.
- **Test frontend**: 10/10 pass.
- Dữ liệu LMS BMI-theo-tuổi lấy **trực tiếp từ nguồn chính thức WHO** (`WorldHealthOrganization/anthro` và `/anthroplus` trên GitHub — cùng 2 repo project đã dùng cho WFA/HFA/WFH trước đây), không tự chế hay nội suy.

---

# Vòng 3 — Đối chiếu với ảnh xét nghiệm thật + linh hoạt hoá ngưỡng xét nghiệm (2026-07-12)

User gửi 1 ảnh phiếu kết quả xét nghiệm thật để kiểm tra hệ thống phân tích dữ liệu đúng chưa. Phát hiện 2 lỗi ở `lab-assessment.service.ts` (ngoài phạm vi chỉ số tăng trưởng ở 2 vòng trước) và quyết định giải quyết tận gốc bằng cách đưa toàn bộ ngưỡng xét nghiệm ra khỏi code — sang bảng DB admin-editable, giống hệt cách `GrowthStandardPoint` đã làm cho chuẩn tăng trưởng.

## Bug #11 [Nghiêm trọng] — Sai đơn vị Cholesterol/Triglycerid, thiếu phân biệt giới tính cho Sắt huyết thanh

**Sai ở đâu**: Ảnh xét nghiệm thật (máy `SH.3.061468`) cho thấy:
- **Sắt huyết thanh**: có ngưỡng riêng theo giới (Nữ: 10.7–32.2 µmol/L) — code cũ dùng 1 ngưỡng chung 11.0–27.0 µmol/L cho mọi giới, và hàm `assessLabs()` khi đó còn không nhận tham số giới tính nên không thể phân biệt được dù muốn.
- **Cholesterol toàn phần & Triglycerid**: máy trả kết quả bằng **mmol/L** (chuẩn của mọi phòng xét nghiệm Việt Nam), nhưng form nhập liệu (`InputTab.tsx`) và ngưỡng cảnh báo trong code lại là thang **mg/dL** (170/200 cho Cholesterol, 100/130 cho Triglycerid). Bác sĩ chép thẳng số trên phiếu (vd Triglycerid `2.26`) vào ô "mg/dL" → so `2.26 >= 100` → luôn ra "Bình thường" dù giá trị thật đang cao (2.26 mmol/L ≈ 200 mg/dL) — **cảnh báo rối loạn lipid máu gần như không bao giờ kích hoạt được trong thực tế**.

**Cách sửa**: Quy đổi 2 ngưỡng Cholesterol/Triglycerid sang mmol/L bằng hệ số chuẩn (Cholesterol ÷38.67, Triglycerid ÷88.5) — **giữ nguyên điểm quyết định lâm sàng cũ, chỉ sửa đơn vị** (170→4.4, 200→5.2, 100→1.13, 130→1.47), không tự suy ra ngưỡng lâm sàng mới. Thêm tham số `gender` vào `assessLabs()` để Sắt huyết thanh có thể phân biệt theo giới — nhưng **không tự đoán con số Nam** đọc không rõ trên ảnh (phần "Nam: 2,5 hay 12,5–32,2" bị mờ) — giữ nguyên 11.0–27.0 cho cả 2 giới làm giá trị khởi điểm, để bác sĩ tự chỉnh đúng theo phiếu xét nghiệm thật của phòng khám qua tính năng mới (Bug #12).

**File đổi**: `backend/src/services/lab-assessment.service.ts`, `backend/src/services/assessment.service.ts` (truyền `input.gender`), `frontend/src/components/input/InputTab.tsx` (nhãn/gợi ý đổi sang mmol/L).

## Bug #12 [Tính năng] — Đưa toàn bộ ngưỡng xét nghiệm ra khỏi code, admin sửa được qua UI

**Vấn đề gốc**: Bug #11 cho thấy ngưỡng xét nghiệm (đơn vị, giá trị, phân theo giới/tuổi) phụ thuộc vào máy xét nghiệm/phòng khám cụ thể và có thể đổi theo thời gian — nhưng trước đây hoàn toàn hardcode trong `lab-assessment.service.ts`, đổi gì cũng cần sửa code + deploy lại.

**Giải pháp**: Áp dụng đúng pattern đã có sẵn cho `GrowthStandardPoint` (chuẩn tăng trưởng WHO) sang ngưỡng xét nghiệm:
- Bảng Prisma mới `LabReferenceRange` (`testKey`, `gender`, `minMonths`/`maxMonths`, 4 cột ngưỡng nullable `lowSevere`/`lowDeficit`/`highBorderline`/`highExcess`, `highInclusive`, `unit`, `source`) — đủ linh hoạt biểu diễn cả 4 dạng ngưỡng đang có (1 chiều dưới như Kẽm, 2 chiều như Calci/Sắt, 2 bậc như Vitamin D/Cholesterol).
- `backend/src/services/lab-reference.service.ts` — cache trong bộ nhớ + tra cứu theo `(testKey, gender, months)`, load từ DB lúc khởi động (`server.ts`), có thể nạp lại ngay khi import CSV mới (không cần khởi động lại server).
- `lab-assessment.service.ts` viết lại để lấy số từ bảng tra cứu thay vì hardcode — **giữ nguyên chính xác toàn bộ text chẩn đoán/khuyến nghị và các quirk ranh giới cũ** (Vitamin D/Cholesterol 2 bậc status/diagnosis lệch nhau, xác nhận lại bằng bộ test cũ).
- `lab-reference-import.service.ts` + route `POST/GET /api/lab-references` (import CSV, export CSV, chỉ `admin` được import — giống hệt quyền của Chuẩn Tăng Trưởng) + ghi Nhật Ký Thao Tác (`lab_reference.import`).
- Tab admin mới "🧪 Chuẩn Xét Nghiệm" (`LabReferencesTab.tsx`) — xem bảng hiện tại, tải CSV, nhập CSV mới thay thế toàn bộ.
- Dữ liệu mặc định bundled (`lab-reference-ranges-default.ts`) giữ nguyên giá trị cũ (sau khi sửa đơn vị ở Bug #11) — **không đổi hành vi hệ thống khi deploy**, chỉ mở khả năng bác sĩ tự chỉnh sau.

**File đổi**: `backend/prisma/schema.prisma` (+migration `20260712142201_add_lab_reference_range`), `backend/src/data/lab-reference-ranges-default.ts` (mới), `backend/src/services/lab-reference.service.ts` (mới), `backend/src/services/lab-reference-import.service.ts` (mới), `backend/src/routes/lab-reference.route.ts` (mới), `backend/src/app.ts`, `backend/src/server.ts`, `packages/shared/src/types.ts` (`LabReferenceRecord`, `LabTestKey`), `frontend/src/api/labReferences.ts` (mới), `frontend/src/components/labReferences/LabReferencesTab.tsx` (mới), `frontend/src/context/AppStateContext.tsx`, `frontend/src/components/layout/Sidebar.tsx`, `frontend/src/App.tsx`.

**Test mới**: `lab-reference.service.test.ts` (tra cứu theo tuổi/giới, `loadRecords` ghi đè cache), `lab-reference.integration.test.ts` (import/export CSV qua HTTP thật, phân quyền admin-only, validate lỗi dòng), cập nhật toàn bộ `lab-assessment.service.test.ts` (thêm tham số `gender`, đổi giá trị test Cholesterol/Triglycerid sang mmol/L).

**Lưu ý vận hành**: migration mới bị chặn bởi 1 vấn đề tồn đọng không liên quan trong DB dev (`Patient.childId` còn NULL từ trước, migration `make_patient_child_id_required` chưa từng chạy được ở môi trường dev) — áp dụng migration mới trực tiếp bằng `prisma db execute` + `prisma migrate resolve --applied`, không đụng vào vấn đề cũ đó. Production không bị ảnh hưởng (DB prod đã xoá sạch ở Bug #5, `prisma migrate deploy` tự áp dụng đủ toàn bộ migration theo đúng thứ tự lúc khởi động).

## Xác minh

- Backend: **311/314 test pass** (3 lỗi còn lại vẫn là `pg_dump: not found`, môi trường, không đổi từ vòng trước).
- Type-check backend/frontend: sạch (backend chỉ còn lỗi `supertest` type cũ đã biết, không liên quan).
- Frontend: 10/10 test pass.
