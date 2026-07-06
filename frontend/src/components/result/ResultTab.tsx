import type { ReactNode } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { useCreatePatient } from '../../hooks/usePatients';
import { useToast } from '../shared/ToastContext';
import { StatusBadge } from '../shared/Badge';
import { InfoBox } from '../shared/InfoBox';
import { PdfExportButton } from '../../pdf/PdfExportButton';
import { LabAssessmentPanel } from './LabAssessmentPanel';
import { WeeklyMenuTable } from './WeeklyMenuTable';

function ageLabelFor(months: number): string {
  if (months < 12) return '6–12 tháng';
  if (months < 24) return '12–24 tháng';
  if (months < 72) return '3–5 tuổi';
  return '≥6 tuổi';
}

export function ResultTab() {
  const { currentResult: r } = useAppState();
  const { showToast } = useToast();
  const createPatient = useCreatePatient();

  if (!r) {
    return (
      <div className="result-empty fade-in">
        <div className="big-icon">📊</div>
        <h3>Chưa có dữ liệu đánh giá</h3>
        <p>
          Vui lòng nhập thông tin bệnh nhân ở tab <strong>Nhập Liệu</strong> và bấm <strong>"Xem Báo Cáo Chi Tiết"</strong>
        </p>
      </div>
    );
  }

  function handleSave() {
    if (!r) return;
    createPatient.mutate(
      {
        name: r.name,
        dob: r.dob,
        examDate: r.examDate,
        weight: r.weight,
        height: r.height,
        muac: r.muac,
        gender: r.gender,
        tuvan: r.tuvan,
        revisit: r.revisit,
        labs: {}, // raw lab inputs aren't retained on the client after calculation; re-enter to include labs
      },
      {
        onSuccess: () => showToast(`✅ Đã lưu hồ sơ bệnh nhân "${r.name}" vào nhật ký!`, 'success'),
        onError: () => showToast('Lỗi khi lưu hồ sơ. Vui lòng thử lại.', 'error'),
      },
    );
  }

  const carbKcal = Math.round(r.targetEnergy * 0.55);
  const protKcal = Math.round(r.targetEnergy * 0.15);
  const lipKcal = Math.round(r.targetEnergy * 0.3);

  return (
    <div>
      {/* HERO */}
      <div className="result-hero fade-in">
        <div className="result-hero-name">🏥 {r.name}</div>
        <div className="result-hero-meta">
          {r.gender} | {r.months} tháng tuổi | Ngày khám: {r.examDate}
          {r.revisit ? ` | Tái khám: ${r.revisit}` : ''}
          {r.tuvan === 'Có' ? ' | ✅ Đã tư vấn dinh dưỡng' : ''}
        </div>
        <div className="result-hero-stats">
          <div className="hero-stat">
            <div className="val">{r.weight}</div>
            <div className="lbl">Cân nặng (kg)</div>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat">
            <div className="val">{r.height}</div>
            <div className="lbl">Chiều cao (cm)</div>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat">
            <div className="val">{r.bmi}</div>
            <div className="lbl">BMI</div>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat">
            <div className="val">{r.targetEnergy}</div>
            <div className="lbl">kcal/ngày</div>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat">
            <div className="val">{r.months}T</div>
            <div className="lbl">Tuổi</div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 20 }}>
        {/* GROWTH STATUS */}
        <div className="card fade-in">
          <div className="card-header">
            <div className="icon" style={{ background: '#E8F5E9' }}>
              📊
            </div>
            <h3>Đánh Giá Tình Trạng Dinh Dưỡng</h3>
          </div>
          <div className="card-body">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Chỉ số</th>
                  <th>Kết quả</th>
                  <th>Tình trạng</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Cân nặng/Tuổi (WHO)</td>
                  <td>
                    {r.weight} kg (CĐ: {r.whoWeight ? `${r.whoWeight} kg` : 'N/A'})
                  </td>
                  <td>
                    <StatusBadge status={r.wfa} />
                  </td>
                </tr>
                <tr>
                  <td>Chiều cao/Tuổi (WHO)</td>
                  <td>
                    {r.height} cm (CĐ: {r.whoHeight} cm)
                  </td>
                  <td>
                    <StatusBadge status={r.hfa} />
                  </td>
                </tr>
                <tr>
                  <td>Cân nặng/Chiều cao (WHO)</td>
                  <td>Z-score: {r.wfhZ !== null ? r.wfhZ.toFixed(2) : 'N/A'}</td>
                  <td>
                    <StatusBadge status={r.wfh} />
                  </td>
                </tr>
                <tr>
                  <td>BMI</td>
                  <td>{r.bmi} kg/m²</td>
                  <td>
                    <StatusBadge status={r.bmi < 18.5 ? 'Nhẹ cân' : r.bmi >= 30 ? 'Béo phì' : r.bmi >= 25 ? 'Thừa cân' : 'Bình thường'} />
                  </td>
                </tr>
                {r.muacStatus && (
                  <tr>
                    <td>MUAC (vòng cánh tay)</td>
                    <td>{r.muac} cm</td>
                    <td>
                      <StatusBadge
                        status={r.muacStatus.includes('Bình') ? 'Bình thường' : r.muacStatus.includes('NẶNG') ? 'SDD cấp nặng' : 'Suy dinh dưỡng cấp'}
                        label={r.muacStatus.includes('Bình') ? 'Bình thường' : r.muacStatus.includes('NẶNG') ? 'SDD cấp nặng' : 'SDD cấp vừa'}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ENERGY & MACROS */}
        <div className="card fade-in">
          <div className="card-header">
            <div className="icon" style={{ background: '#FFF3E0' }}>
              ⚡
            </div>
            <h3>Nhu Cầu Năng Lượng & Đại Chất</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="metric-card info">
                <div className="metric-label">NL chuẩn (WHO)</div>
                <div className="metric-value" style={{ color: 'var(--info)' }}>
                  {r.stdEnergy}
                </div>
                <div className="metric-sub">kcal/ngày theo tuổi</div>
              </div>
              <div className={`metric-card ${r.targetEnergy < r.stdEnergy ? 'warning' : r.targetEnergy > r.stdEnergy ? 'danger' : 'normal'}`}>
                <div className="metric-label">NL cá nhân hóa</div>
                <div className="metric-value" style={{ color: 'var(--primary)' }}>
                  {r.targetEnergy}
                </div>
                <div className="metric-sub">kcal/ngày</div>
              </div>
            </div>
            {r.energyNote && (
              <div style={{ marginBottom: 12 }}>
                <InfoBox tone={r.energyNoteType} icon={r.energyNoteIcon}>
                  {r.energyNote}
                </InfoBox>
              </div>
            )}
            <div className="macro-chart" style={{ height: 24, borderRadius: 12 }}>
              <div className="macro-seg" style={{ flex: 55, background: '#FF6F00', fontSize: 11 }}>
                Bột 55%
              </div>
              <div className="macro-seg" style={{ flex: 15, background: '#0277BD', fontSize: 11 }}>
                Đạm 15%
              </div>
              <div className="macro-seg" style={{ flex: 30, background: '#2E7D32', fontSize: 11 }}>
                Béo 30%
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
              <MacroStat color="#FF6F00" bg="#FFF8E1" value={`${r.carbG}g`} label="Bột đường" kcal={carbKcal} pct={55} />
              <MacroStat color="#0277BD" bg="#E1F5FE" value={`${r.proteinG}g`} label="Đạm (Protein)" kcal={protKcal} pct={15} />
              <MacroStat color="#2E7D32" bg="#E8F5E9" value={`${r.lipidG}g`} label="Chất béo" kcal={lipKcal} pct={30} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <LabAssessmentPanel labs={r.labs} />
      </div>

      {/* FOOD GROUPS */}
      <div className="card fade-in" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div className="icon" style={{ background: '#F3E5F5' }}>
            🥗
          </div>
          <h3>Nhóm Thực Phẩm Khuyến Nghị</h3>
        </div>
        <div className="card-body">
          <div className="grid-3" style={{ gap: 12 }}>
            <FoodGroupCard color="#FF6F00" bg="#FFF8E1" title={`🌾 Bột đường - ${r.carbG}g/ngày`}>
              Gạo, ngũ cốc, khoai lang.{' '}
              {r.statusKey.includes('Béo phì') ? (
                <>
                  <br />
                  ⚠️ Ưu tiên ngũ cốc nguyên hạt, gạo lứt. Tránh đường tinh luyện.
                </>
              ) : (
                'Đa dạng các loại bột đường.'
              )}
            </FoodGroupCard>
            <FoodGroupCard color="#0277BD" bg="#E1F5FE" title={`🥩 Đạm - ${r.proteinG}g/ngày`}>
              Thịt, cá, trứng, sữa.{' '}
              {r.statusKey.includes('Suy dinh dưỡng') ? (
                <>
                  <br />⭐ Tăng đạm động vật, chọn thịt có lẫn mỡ, cá béo.
                </>
              ) : r.statusKey.includes('Béo phì') ? (
                <>
                  <br />
                  ⚠️ Chọn thịt nạc (ức gà), cá nạc, sữa tách béo.
                </>
              ) : null}
            </FoodGroupCard>
            <FoodGroupCard color="#2E7D32" bg="#E8F5E9" title={`🫒 Chất béo - ${r.lipidG}g/ngày`}>
              {r.statusKey.includes('Suy dinh dưỡng')
                ? '⭐ Bắt buộc thêm 5-10ml mỡ lợn/dầu ăn vào cháo/canh. Khuyến khích bơ, phô mai.'
                : r.statusKey.includes('Béo phì')
                  ? '⚠️ Tuyệt đối tránh đồ chiên xào nhiều mỡ. Ưu tiên dầu oliu, mỡ cá béo.'
                  : 'Dầu thực vật, bơ, hạt.'}
            </FoodGroupCard>
          </div>
          <div style={{ marginTop: 12, padding: 12, background: 'var(--primary-light)', borderRadius: 10, fontSize: 13 }}>
            <strong style={{ color: 'var(--primary-dark)' }}>🥦 Bổ sung vi chất qua thực phẩm:</strong>
            <br />
            {r.labs.some((l) => l.name.includes('Sắt') && l.status === 'deficit') && (
              <>
                <span style={{ color: '#D32F2F' }}>
                  🩸 <strong>Thiếu Sắt:</strong> Tăng cường gan lợn/gà, huyết, thịt bò thẫm màu, mộc nhĩ, rau dền đỏ.
                </span>
                <br />
              </>
            )}
            {r.labs.some((l) => l.name.includes('Calci') && l.status === 'deficit') && (
              <>
                <span style={{ color: '#1976D2' }}>
                  🦴 <strong>Thiếu Canxi:</strong> Ăn tôm tép nhỏ nguyên vỏ, cua đồng, cá nhỏ, phô mai bò.
                </span>
                <br />
              </>
            )}
            {r.labs.some((l) => l.name.includes('Kẽm') && l.status === 'deficit') && (
              <>
                <span style={{ color: '#F57C00' }}>
                  ⚗️ <strong>Thiếu Kẽm:</strong> Hàu, hến, thịt bò nạc, lòng đỏ trứng.
                </span>
                <br />
              </>
            )}
            <span style={{ color: '#388E3C' }}>🥗 Cung cấp ≥300g rau xanh/ngày. Hoa quả ăn múi/miếng thay vì chỉ ép nước.</span>
          </div>
        </div>
      </div>

      {/* 7-DAY MENU */}
      <div className="card fade-in" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div className="icon" style={{ background: '#E8F5E9' }}>
            📅
          </div>
          <h3>Thực Đơn 7 Ngày Tham Khảo</h3>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
            Nhóm tuổi: {ageLabelFor(r.months)} | {r.statusKey}
          </span>
        </div>
        <div className="card-body" style={{ padding: 12 }}>
          <WeeklyMenuTable menu={r.menu} targetEnergy={r.targetEnergy} />
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            * Thực đơn mang tính tham khảo. Điều chỉnh theo sở thích, dị ứng và điều kiện gia đình. Tham khảo thêm chuyên gia dinh dưỡng.
          </div>
        </div>
      </div>

      {/* CLINICAL NOTES */}
      <div className="card fade-in" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div className="icon" style={{ background: '#FCE4EC' }}>
            📝
          </div>
          <h3>Ghi Chú Lâm Sàng</h3>
        </div>
        <div className="card-body">
          <div className="grid-2" style={{ gap: 12 }}>
            <InfoBox tone={r.wfaZ !== null && r.wfaZ < -2 ? 'danger' : r.hfaZ < -3 ? 'danger' : r.wfhZ !== null && r.wfhZ > 2 ? 'warn' : 'success'}>
              <strong>Tình trạng dinh dưỡng tổng thể:</strong>
              <br />
              CN/Tuổi: {r.wfa} | CC/Tuổi: {r.hfa} | CN/CC: {r.wfh}.
              <br />
              {r.wfaZ !== null && r.wfaZ < -3
                ? 'Suy dinh dưỡng thể nhẹ cân nặng – cần can thiệp dinh dưỡng ngay.'
                : r.hfaZ < -3
                  ? 'Thấp còi nặng – cần theo dõi và can thiệp dài hạn.'
                  : r.wfhZ !== null && r.wfhZ > 3
                    ? 'Béo phì – cần chế độ ăn và vận động kiểm soát.'
                    : 'Theo dõi định kỳ 3 tháng/lần.'}
            </InfoBox>
            <InfoBox tone="info">
              <strong>Lịch theo dõi:</strong>
              <br />
              {r.months < 6 ? 'Theo dõi mỗi tháng' : r.months < 24 ? 'Theo dõi 2 tháng/lần' : 'Theo dõi 3 tháng/lần'}.
              <br />
              {r.revisit ? (
                <>
                  Ngày tái khám dự kiến: <strong>{r.revisit}</strong>
                </>
              ) : (
                'Hẹn tái khám sau 3 tháng.'
              )}
              <br />
              Tư vấn dinh dưỡng: <strong>{r.tuvan}</strong>
            </InfoBox>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button className="btn-secondary" onClick={() => window.print()}>
          🖨️ In báo cáo
        </button>
        <PdfExportButton result={r} />
        <button className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }} onClick={handleSave} disabled={createPatient.isPending}>
          💾 {createPatient.isPending ? 'Đang lưu...' : 'Lưu hồ sơ'}
        </button>
      </div>
    </div>
  );
}

function MacroStat({ color, bg, value, label, kcal, pct }: { color: string; bg: string; value: string; label: string; kcal: number; pct: number }) {
  return (
    <div style={{ textAlign: 'center', padding: 12, background: bg, borderRadius: 10 }}>
      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
        {kcal} kcal ({pct}%)
      </div>
    </div>
  );
}

function FoodGroupCard({ color, bg, title, children }: { color: string; bg: string; title: string; children: ReactNode }) {
  return (
    <div style={{ padding: 14, background: bg, borderRadius: 10, borderLeft: `4px solid ${color}` }}>
      <div style={{ fontWeight: 700, color, marginBottom: 8 }}>{title}</div>
      <p style={{ fontSize: 12, lineHeight: 1.6 }}>{children}</p>
    </div>
  );
}
