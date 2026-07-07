// One-off dev-data seeder — creates a handful of realistic patients (multiple
// visits each) via the real HTTP API so all the usual business logic runs
// (Z-scores, energy targets, menu, child grouping). Meant for manually testing
// the multi-visit trend charts + growth alerts feature in the browser.
// Run with: node backend/scripts/seed-sample-patients.mjs
// Requires the backend to be running and reachable at API_URL, and an admin
// account to already exist (see .env ADMIN_EMAIL/ADMIN_PASSWORD).

const API_URL = process.env.API_URL ?? 'http://localhost:4000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@dinhduong.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'DevAdmin123!';

let cookie = '';

async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...options.headers },
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${options.method ?? 'GET'} ${path} -> ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

// Each child: base fields + a list of visits (examDate, weight, height), applied in order.
const CHILDREN = [
  {
    name: 'Nguyễn Bảo Nam',
    dob: '2024-07-07',
    gender: 'Nam',
    guardianEmail: 'phuhuynh.baonam@example.com',
    visits: [
      { examDate: '2025-07-07', weight: 9.6, height: 75.0 },
      { examDate: '2026-01-07', weight: 11.0, height: 81.0 },
      { examDate: '2026-07-07', weight: 12.2, height: 87.0 },
    ],
    note: 'Tăng trưởng bình thường qua 3 lần khám — không có cảnh báo.',
  },
  {
    name: 'Trần Thị Mai Anh',
    dob: '2024-07-07',
    gender: 'Nữ',
    guardianEmail: 'phuhuynh.maianh@example.com',
    visits: [
      { examDate: '2025-07-07', weight: 9.0, height: 74.0 },
      { examDate: '2026-01-07', weight: 10.3, height: 79.0 },
      { examDate: '2026-04-07', weight: 9.8, height: 81.0 },
    ],
    note: 'Sụt cân giữa lần khám 2 và 3 (10.3kg → 9.8kg) — kỳ vọng cảnh báo "weight_loss".',
  },
  {
    name: 'Lê Văn Đức',
    dob: '2023-07-07',
    gender: 'Nam',
    visits: [
      { examDate: '2025-07-07', weight: 12.0, height: 87.0 },
      { examDate: '2025-11-07', weight: 12.5, height: 90.0 },
      { examDate: '2026-07-07', weight: 13.5, height: 90.05 },
    ],
    note: 'Chiều cao gần như không đổi (90.0 → 90.05cm) sau 8 tháng — kỳ vọng cảnh báo "stunting_risk".',
  },
  {
    name: 'Phạm Thị Hồng Ngọc',
    dob: '2025-07-07',
    gender: 'Nữ',
    visits: [
      { examDate: '2026-01-07', weight: 7.3, height: 65.0 },
      { examDate: '2026-07-07', weight: 9.0, height: 74.0 },
    ],
    note: 'Chỉ 2 lần khám, tăng trưởng bình thường — ví dụ đơn giản cho biểu đồ xu hướng.',
  },
];

async function main() {
  console.log(`Logging in as ${ADMIN_EMAIL}...`);
  await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }) });

  for (const child of CHILDREN) {
    console.log(`\n${child.name} (${child.gender}, sinh ${child.dob}) — ${child.note}`);
    let childId;
    for (const visit of child.visits) {
      const payload = {
        name: child.name,
        dob: child.dob,
        gender: child.gender,
        examDate: visit.examDate,
        weight: visit.weight,
        height: visit.height,
        tuvan: 'Có',
        guardianEmail: child.guardianEmail ?? null,
        labs: {},
        childId: childId ?? null,
      };
      const created = await api('/patients', { method: 'POST', body: JSON.stringify(payload) });
      childId = created.childId;
      console.log(`  ${visit.examDate}: ${visit.weight}kg / ${visit.height}cm -> wfa=${created.wfa}, wfh=${created.wfh}`);
    }
  }

  console.log('\nDone. Open the app, tab "Nhật Ký BN", to see the seeded visits, alert flags and trend history.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
