import type { AssessmentResult, MealSlot, MenuDish } from '@dinhduong/shared';

const PDF_DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
const MEALS: MealSlot[] = ['Sáng', 'Phụ sáng', 'Trưa', 'Phụ chiều', 'Tối', 'Phụ tối'];
const MEAL_TIMES: Record<MealSlot, string> = {
  'Sáng': '07:00',
  'Phụ sáng': '09:30',
  'Trưa': '12:00',
  'Phụ chiều': '15:30',
  'Tối': '18:30',
  'Phụ tối': '20:30',
};

function badgeCls(s: string): string {
  if (s.includes('nặng') || s.includes('SDD')) return 'pdf-badge-bad';
  // 'dưỡng' catches 'Suy dinh dưỡng cấp' (BFA/wasting label) — it contains
  // none of the other warn keywords below and used to silently fall through
  // to pdf-badge-ok (green) for what is a malnutrition flag, see Bugs.md #9.
  if (s.includes('cân') || s.includes('còi') || s.includes('Thừa') || s.includes('Béo') || s.includes('dưỡng')) return 'pdf-badge-warn';
  return 'pdf-badge-ok';
}

function ageLabelFor(months: number): string {
  if (months < 12) return '6–12 tháng';
  if (months < 24) return '12–24 tháng';
  if (months < 72) return '3–5 tuổi';
  return '≥6 tuổi';
}

function LabColor(status: 'ok' | 'deficit' | 'excess'): string {
  return status === 'ok' ? '#2E7D32' : status === 'deficit' ? '#C62828' : '#F57F17';
}

function DishCell({ dish }: { dish: MenuDish | '—' }) {
  if (dish === '—') return <>—</>;
  return (
    <>
      <div className="menu-dish-name">{dish.dishName}</div>
      <ul className="menu-ingredients">
        {dish.ingredients.map((ing, i) => (
          <li key={i}>
            {ing.icon} {ing.amount}
            {ing.unit} {ing.label}
          </li>
        ))}
      </ul>
      <div className="menu-qty-total">Tổng: {dish.mealKcal} kcal</div>
    </>
  );
}

/** Verbatim port of legacy/index.html exportPDF()'s HTML template (lines 2901-3160). */
export function PdfReportTemplate({ result: r }: { result: AssessmentResult }) {
  const ageLabel = ageLabelFor(r.months);

  return (
    <div className="pdf-page">
      {/* HEADER */}
      <div className="pdf-header">
        <div className="pdf-header-logo">🏥</div>
        <div className="pdf-header-title">
          <h1>PHIẾU ĐÁNH GIÁ DINH DƯỠNG NHI KHOA</h1>
          <p>Theo tiêu chuẩn WHO 2006/2007 · Quyết định 3777/QĐ-BYT-2024</p>
        </div>
        <div className="pdf-header-date">
          <div style={{ fontSize: 16 }}>📅</div>
          <div>
            Ngày khám: <strong>{r.examDate}</strong>
          </div>
          <div>Xuất lúc: {new Date().toLocaleString('vi-VN')}</div>
        </div>
      </div>

      {/* PATIENT BAND */}
      <div className="pdf-patient-band">
        <div className="pf">
          <div className="pf-label">Họ và tên</div>
          <div className="pf-value" style={{ fontSize: 15 }}>
            {r.name}
          </div>
        </div>
        <div className="pf">
          <div className="pf-label">Ngày sinh</div>
          <div className="pf-value">{r.dob}</div>
          <div style={{ fontSize: 9, color: '#616161' }}>Tuổi: {r.months} tháng</div>
        </div>
        <div className="pf">
          <div className="pf-label">Giới tính</div>
          <div className="pf-value">{r.gender === 'Nam' ? '♂ Nam' : '♀ Nữ'}</div>
          <div style={{ fontSize: 9, color: '#616161' }}>Nhóm: {ageLabel}</div>
        </div>
        <div className="pf">
          <div className="pf-label">Ngày tái khám</div>
          <div className="pf-value">{r.revisit || '—'}</div>
          <div style={{ fontSize: 9, color: '#616161' }}>Tư vấn: {r.tuvan}</div>
        </div>
      </div>

      {/* ANTHROPOMETRIC */}
      <div className="pdf-section">
        <div className="pdf-section-title">📏 Chỉ Số Nhân Trắc & So Sánh Chuẩn WHO</div>
        <div className="pdf-grid4" style={{ marginBottom: 10 }}>
          <div className="pdf-stat-box teal">
            <div className="pdf-stat-label">Cân nặng</div>
            <div className="pdf-stat-value">
              {r.weight} <span style={{ fontSize: 12 }}>kg</span>
            </div>
            <div className="pdf-stat-sub">Chuẩn WHO: {r.whoWeight} kg</div>
            <div style={{ marginTop: 4 }}>
              <span className={`pdf-badge ${badgeCls(r.wfa)}`}>{r.wfa}</span>
            </div>
          </div>
          <div className="pdf-stat-box teal">
            <div className="pdf-stat-label">Chiều cao</div>
            <div className="pdf-stat-value">
              {r.height} <span style={{ fontSize: 12 }}>cm</span>
            </div>
            <div className="pdf-stat-sub">Chuẩn WHO: {r.whoHeight} cm</div>
            <div style={{ marginTop: 4 }}>
              <span className={`pdf-badge ${badgeCls(r.hfa)}`}>{r.hfa}</span>
            </div>
          </div>
          {/* r.bfa (BMI-for-age, WHO) thay ngưỡng BMI người lớn (18.5/25/30) cố định
              cũ — sai vì áp dụng cho trẻ em, xem Bugs.md #9. */}
          <div className={`pdf-stat-box ${badgeCls(r.bfa) === 'pdf-badge-bad' ? 'red' : badgeCls(r.bfa) === 'pdf-badge-warn' ? 'orange' : 'teal'}`}>
            <div className="pdf-stat-label">BMI/Tuổi</div>
            <div className="pdf-stat-value">
              {r.bmi} <span style={{ fontSize: 12 }}>kg/m²</span>
            </div>
            <div className="pdf-stat-sub">{r.bfa}</div>
          </div>
          <div className={`pdf-stat-box ${r.wfhZ !== null && r.wfhZ < -2 ? 'red' : r.wfhZ !== null && r.wfhZ > 2 ? 'orange' : 'teal'}`}>
            <div className="pdf-stat-label">CN/Chiều cao</div>
            <div className="pdf-stat-value" style={{ fontSize: 14 }}>
              {r.wfhZ !== null ? (
                <>
                  {r.wfhZ.toFixed(2)} <span style={{ fontSize: 10 }}>Z</span>
                </>
              ) : (
                'N/A'
              )}
            </div>
            <div style={{ marginTop: 4 }}>
              <span className={`pdf-badge ${badgeCls(r.wfh)}`}>{r.wfh}</span>
            </div>
            {r.muacStatus && (
              <div style={{ fontSize: 8, color: '#616161', marginTop: 2 }}>
                MUAC: {r.muac}cm – {r.muacStatus.includes('Bình') ? 'BT' : r.muacStatus.includes('NẶNG') ? 'SDD nặng' : 'SDD vừa'}
              </div>
            )}
          </div>
        </div>

        <table className="pdf-table">
          <thead>
            <tr>
              <th>Chỉ số</th>
              <th>Kết quả</th>
              <th>Chuẩn WHO</th>
              <th>Chênh lệch</th>
              <th>Phân loại</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Cân nặng / Tuổi</strong>
              </td>
              <td>{r.weight} kg</td>
              <td>{r.whoWeight !== null ? `${r.whoWeight} kg` : 'N/A'}</td>
              <td style={{ color: r.whoWeight !== null && r.weight < r.whoWeight ? '#C62828' : '#2E7D32', fontWeight: 700 }}>
                {r.whoWeight !== null ? `${r.weight > r.whoWeight ? '+' : ''}${(r.weight - r.whoWeight).toFixed(1)} kg` : '-'}
              </td>
              <td>
                <span className={`pdf-badge ${badgeCls(r.wfa)}`}>{r.wfa}</span>
              </td>
            </tr>
            <tr>
              <td>
                <strong>Chiều cao / Tuổi</strong>
              </td>
              <td>{r.height} cm</td>
              <td>{r.whoHeight} cm</td>
              <td style={{ color: r.height < r.whoHeight ? '#C62828' : '#2E7D32', fontWeight: 700 }}>
                {r.height > r.whoHeight ? '+' : ''}
                {(r.height - r.whoHeight).toFixed(1)} cm
              </td>
              <td>
                <span className={`pdf-badge ${badgeCls(r.hfa)}`}>{r.hfa}</span>
              </td>
            </tr>
            <tr>
              <td>
                <strong>Cân nặng / Chiều cao</strong>
              </td>
              <td>Z-score: {r.wfhZ !== null ? r.wfhZ.toFixed(2) : 'N/A'}</td>
              <td>Z = 0 (trung vị)</td>
              <td style={{ fontWeight: 700 }}>{r.wfhZ !== null ? `${r.wfhZ.toFixed(2)} SD` : '-'}</td>
              <td>
                <span className={`pdf-badge ${badgeCls(r.wfh)}`}>{r.wfh}</span>
              </td>
            </tr>
            <tr>
              <td>
                <strong>BMI/Tuổi</strong>
              </td>
              <td>{r.bmi} kg/m²</td>
              <td>{r.bfaZ !== null ? `Z-score: ${r.bfaZ.toFixed(2)}` : '—'}</td>
              <td>—</td>
              <td>
                <span className={`pdf-badge ${badgeCls(r.bfa)}`}>{r.bfa}</span>
              </td>
            </tr>
            {r.muacStatus && (
              <tr>
                <td>
                  <strong>MUAC</strong>
                </td>
                <td>{r.muac} cm</td>
                <td>≥ 12.5 cm</td>
                <td>—</td>
                <td>
                  <span className={`pdf-badge ${r.muacStatus.includes('Bình') ? 'pdf-badge-ok' : 'pdf-badge-bad'}`}>
                    {r.muacStatus.includes('Bình') ? 'Bình thường' : r.muacStatus.includes('NẶNG') ? 'SDD nặng' : 'SDD vừa'}
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ENERGY & MACROS */}
      <div className="pdf-section">
        <div className="pdf-section-title">⚡ Nhu Cầu Năng Lượng & Đại Chất Dinh Dưỡng</div>
        <div className="pdf-grid2" style={{ marginBottom: 10 }}>
          <div className="pdf-stat-box blue">
            <div className="pdf-stat-label">Năng lượng chuẩn (WHO)</div>
            <div className="pdf-stat-value" style={{ color: '#0277BD' }}>
              {r.stdEnergy} <span style={{ fontSize: 12 }}>kcal/ngày</span>
            </div>
            <div className="pdf-stat-sub">Theo độ tuổi và giới tính</div>
          </div>
          <div className="pdf-stat-box teal">
            <div className="pdf-stat-label">Năng lượng cá nhân hóa</div>
            <div className="pdf-stat-value">
              {r.targetEnergy} <span style={{ fontSize: 12 }}>kcal/ngày</span>
            </div>
            <div className="pdf-stat-sub">{r.energyNote || 'Theo tình trạng dinh dưỡng'}</div>
          </div>
        </div>

        <div className="pdf-macro-bar">
          <div className="pdf-macro-seg" style={{ flex: 55, background: '#FF6F00' }}>
            Bột đường 55%
          </div>
          <div className="pdf-macro-seg" style={{ flex: 15, background: '#0277BD' }}>
            Đạm 15%
          </div>
          <div className="pdf-macro-seg" style={{ flex: 30, background: '#2E7D32' }}>
            Béo 30%
          </div>
        </div>

        <table className="pdf-table">
          <thead>
            <tr>
              <th>Đại chất</th>
              <th>Tỷ lệ (%)</th>
              <th>Năng lượng (kcal)</th>
              <th>Khối lượng (g/ngày)</th>
              <th>Nguồn thực phẩm</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong style={{ color: '#FF6F00' }}>🌾 Bột đường (Carbohydrate)</strong>
              </td>
              <td>55%</td>
              <td>{Math.round(r.targetEnergy * 0.55)} kcal</td>
              <td>
                <strong>{r.carbG} g</strong>
              </td>
              <td>Gạo, khoai, bún, ngũ cốc</td>
            </tr>
            <tr>
              <td>
                <strong style={{ color: '#0277BD' }}>🥩 Đạm (Protein)</strong>
              </td>
              <td>15%</td>
              <td>{Math.round(r.targetEnergy * 0.15)} kcal</td>
              <td>
                <strong>{r.proteinG} g</strong>
              </td>
              <td>Thịt, cá, trứng, đậu, sữa</td>
            </tr>
            <tr>
              <td>
                <strong style={{ color: '#2E7D32' }}>🫒 Chất béo (Lipid)</strong>
              </td>
              <td>30%</td>
              <td>{Math.round(r.targetEnergy * 0.3)} kcal</td>
              <td>
                <strong>{r.lipidG} g</strong>
              </td>
              <td>Dầu thực vật, bơ, cá hồi, hạt</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* LABS */}
      {r.labs.length > 0 && (
        <div className="pdf-section">
          <div className="pdf-section-title">🧪 Kết Quả Xét Nghiệm Vi Chất</div>
          <div className="pdf-grid2" style={{ gap: 6 }}>
            {r.labs.map((lab) => (
              <div key={lab.name} className={`pdf-lab-item ${lab.status === 'ok' ? 'ok' : lab.status === 'deficit' ? 'bad' : 'excess'}`}>
                <div style={{ flex: 1 }}>
                  <div className="pdf-lab-name">
                    {lab.icon} {lab.name}
                  </div>
                  <div style={{ fontSize: 9, color: '#616161' }}>
                    Bình thường: {lab.normal} {lab.unit}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: LabColor(lab.status), marginTop: 2 }}>{lab.diagnosis}</div>
                  {lab.recommendation && <div style={{ fontSize: 8.5, color: '#424242', marginTop: 3, lineHeight: 1.4 }}>{lab.recommendation}</div>}
                </div>
                <div className="pdf-lab-val" style={{ color: LabColor(lab.status) }}>
                  {lab.value}
                  <span style={{ fontSize: 8, fontWeight: 400, display: 'block', textAlign: 'right' }}>{lab.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FOOD GROUPS */}
      <div className="pdf-section">
        <div className="pdf-section-title">🥗 Nhóm Thực Phẩm Khuyến Nghị</div>
        <div className="pdf-grid3" style={{ gap: 8 }}>
          <div style={{ padding: 10, background: '#FFF8E1', borderRadius: 6, borderLeft: '3px solid #FF6F00' }}>
            <div style={{ fontWeight: 700, color: '#FF6F00', marginBottom: 4, fontSize: 10 }}>🌾 Bột đường - {r.carbG}g/ngày</div>
            <p style={{ fontSize: 9, lineHeight: 1.4 }}>
              Gạo, khoai lang, yến mạch. {r.statusKey.includes('Béo phì') ? 'Ưu tiên ngũ cốc nguyên hạt, gạo lứt. Tránh đường tinh luyện.' : 'Đa dạng các loại bột đường.'}
            </p>
          </div>
          <div style={{ padding: 10, background: '#E1F5FE', borderRadius: 6, borderLeft: '3px solid #0277BD' }}>
            <div style={{ fontWeight: 700, color: '#0277BD', marginBottom: 4, fontSize: 10 }}>🥩 Đạm - {r.proteinG}g/ngày</div>
            <p style={{ fontSize: 9, lineHeight: 1.4 }}>
              Thịt, cá, trứng, sữa.{' '}
              {r.statusKey.includes('Suy dinh dưỡng')
                ? 'Tăng đạm động vật, chọn thịt có lẫn mỡ, cá béo.'
                : r.statusKey.includes('Béo phì')
                  ? 'Chọn thịt nạc (ức gà), cá nạc, sữa tách béo.'
                  : ''}
            </p>
          </div>
          <div style={{ padding: 10, background: '#E8F5E9', borderRadius: 6, borderLeft: '3px solid #2E7D32' }}>
            <div style={{ fontWeight: 700, color: '#2E7D32', marginBottom: 4, fontSize: 10 }}>🫒 Chất béo - {r.lipidG}g/ngày</div>
            <p style={{ fontSize: 9, lineHeight: 1.4 }}>
              {r.statusKey.includes('Suy dinh dưỡng')
                ? 'Thêm 5-10ml mỡ lợn/dầu ăn vào cháo/canh. Khuyến khích bơ, phô mai.'
                : r.statusKey.includes('Béo phì')
                  ? 'Tuyệt đối tránh đồ chiên xào nhiều mỡ. Ưu tiên dầu oliu, mỡ cá béo.'
                  : 'Dầu thực vật, bơ, hạt.'}
            </p>
          </div>
        </div>
        <div style={{ marginTop: 8, padding: 8, background: '#F3E5F5', borderRadius: 6, fontSize: 9 }}>
          <strong style={{ color: '#6A1B9A' }}>🥦 Bổ sung vi chất qua thực phẩm:</strong>{' '}
          {r.labs.some((l) => l.name.includes('Sắt') && l.status === 'deficit') && (
            <>
              <strong>Thiếu Sắt:</strong> Tăng cường gan, huyết, thịt bò thẫm màu, mộc nhĩ, rau dền đỏ.{' '}
            </>
          )}
          {r.labs.some((l) => l.name.includes('Calci') && l.status === 'deficit') && (
            <>
              <strong>Thiếu Canxi:</strong> Ăn tôm tép nhỏ nguyên vỏ, cá nhỏ, phô mai, sữa bò.{' '}
            </>
          )}
          {r.labs.some((l) => l.name.includes('Kẽm') && l.status === 'deficit') && (
            <>
              <strong>Thiếu Kẽm:</strong> Hàu, hến, thịt bò nạc, lòng đỏ trứng.{' '}
            </>
          )}
          Rau xanh tươi sống, hoa quả các loại.
        </div>
      </div>

      {/* MENU */}
      <div className="pdf-section" style={{ pageBreakBefore: 'always' }}>
        <div className="pdf-section-title">
          📅 Thực Đơn 7 Ngày Tham Khảo · {ageLabel} · {r.statusKey}
        </div>
        <table className="pdf-menu-table">
          <thead>
            <tr>
              <th style={{ minWidth: 60 }}>Bữa</th>
              {PDF_DAYS.map((d) => (
                <th key={d}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MEALS.map((meal) => (
              <tr key={meal}>
                <td className="meal-hdr">
                  {meal}
                  <br />
                  <span style={{ fontSize: 7, color: '#757575' }}>{MEAL_TIMES[meal]}</span>
                </td>
                {PDF_DAYS.map((_, i) => (
                  <td key={i}>
                    <DishCell dish={r.menu[meal][i] ?? '—'} />
                  </td>
                ))}
              </tr>
            ))}
            <tr style={{ background: '#E8F5E9' }}>
              <td className="meal-hdr">Tổng NL</td>
              <td colSpan={7} style={{ textAlign: 'center', fontWeight: 700, color: '#2E7D32', fontSize: 9 }}>
                ~ {r.targetEnergy} kcal / ngày
              </td>
            </tr>
            {r.menu.note && (
              <tr>
                <td className="meal-hdr">Lưu ý</td>
                <td colSpan={7} style={{ fontStyle: 'italic', color: '#616161', fontSize: 8.5 }}>
                  {r.menu.note}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div style={{ marginTop: 6, fontSize: 8.5, color: '#9E9E9E', fontStyle: 'italic' }}>
          * Thực đơn mang tính tham khảo. Điều chỉnh theo sở thích, dị ứng và điều kiện gia đình. Tham khảo bác sĩ/chuyên gia dinh dưỡng để được tư vấn chi tiết.
        </div>
      </div>

      {/* CLINICAL NOTE */}
      <div className="pdf-section">
        <div className="pdf-section-title">📝 Ghi Chú Lâm Sàng & Khuyến Nghị</div>
        <div className="pdf-grid2" style={{ gap: 8 }}>
          <div style={{ padding: 10, background: '#F0F4F3', borderRadius: 6, borderLeft: '3px solid #00796B' }}>
            <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 4, color: '#004D40' }}>📊 Tổng kết đánh giá</div>
            <div style={{ fontSize: 9.5, lineHeight: 1.6 }}>
              Tình trạng dinh dưỡng: <strong>{r.wfh}</strong>
              <br />
              CN/Tuổi: {r.wfa} | CC/Tuổi: {r.hfa}
              <br />
              {(r.wfaZ !== null && r.wfaZ < -3) || r.hfaZ < -3
                ? '⚠️ Cần can thiệp dinh dưỡng sớm.'
                : r.wfhZ !== null && r.wfhZ > 2
                  ? '⚠️ Cần kiểm soát cân nặng.'
                  : '✅ Tiếp tục theo dõi định kỳ.'}
            </div>
          </div>
          <div style={{ padding: 10, background: '#E1F5FE', borderRadius: 6, borderLeft: '3px solid #0277BD' }}>
            <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 4, color: '#01579B' }}>📅 Lịch theo dõi</div>
            <div style={{ fontSize: 9.5, lineHeight: 1.6 }}>
              Tái khám: <strong>{r.revisit || (r.months < 24 ? 'Sau 2 tháng' : 'Sau 3 tháng')}</strong>
              <br />
              Cân nặng: {r.months < 12 ? 'Mỗi tháng' : r.months < 24 ? '2 tháng/lần' : '3 tháng/lần'}
              <br />
              Tư vấn dinh dưỡng: <strong>{r.tuvan}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="pdf-footer">
        <div>
          Bệnh nhân: <strong>{r.name}</strong> · {r.gender} · {r.months} tháng tuổi
        </div>
        <div>Hệ thống Đánh Giá Dinh Dưỡng Nhi Khoa · WHO 2006/2007</div>
        <div>Ngày in: {new Date().toLocaleDateString('vi-VN')}</div>
      </div>
      <div className="pdf-watermark">Tài liệu này chỉ dùng cho mục đích tham khảo y tế. Cần tham vấn bác sĩ chuyên khoa dinh dưỡng để có phác đồ điều trị chính xác.</div>
    </div>
  );
}
