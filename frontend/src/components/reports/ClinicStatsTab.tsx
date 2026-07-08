import type { InterventionOutcome } from '@dinhduong/shared';
import { useClinicStatsReport } from '../../hooks/useReports';
import { TrendChart } from '../log/TrendChart';
import { Card } from '../shared/Card';
import { StatTile } from '../shared/StatTile';

function outcomeLabel(outcome: InterventionOutcome) {
  if (outcome === 'improved') return <span style={{ color: 'var(--success)' }}>✅ Cải thiện</span>;
  if (outcome === 'worsened') return <span style={{ color: 'var(--danger)' }}>⚠️ Xấu đi</span>;
  return <span style={{ color: 'var(--text-secondary)' }}>➖ Giữ nguyên</span>;
}

export function ClinicStatsTab() {
  const { data: report, isLoading } = useClinicStatsReport();

  return (
    <div>
      <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 4 }}>
        📊 Báo Cáo Thống Kê Phòng Khám
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        Tỷ lệ suy dinh dưỡng / thừa cân theo tháng, và hiệu quả can thiệp — so sánh tình trạng dinh dưỡng giữa lần khám đầu tiên và lần khám gần
        nhất của mỗi trẻ có từ 2 lần khám trở lên.
      </p>

      {isLoading || !report ? (
        <p>Đang tải...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card icon="📈" iconBg="#FFF3E0" title="Tỷ Lệ SDD / Thừa Cân Theo Tháng">
            {report.monthly.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có dữ liệu khám nào.</p>
            ) : (
              <>
                <div style={{ display: 'grid', gap: 24 }}>
                  <TrendChart
                    title="Tỷ lệ Suy dinh dưỡng (%)"
                    unit="%"
                    color="#C62828"
                    points={report.monthly.map((m) => ({ examDate: `${m.month}-01`, value: m.sddPct }))}
                  />
                  <TrendChart
                    title="Tỷ lệ Thừa cân / Béo phì (%)"
                    unit="%"
                    color="#F57F17"
                    points={report.monthly.map((m) => ({ examDate: `${m.month}-01`, value: m.overweightPct }))}
                  />
                </div>
                <div style={{ overflowX: 'auto', marginTop: 16 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Tháng</th>
                        <th>Tổng lượt khám</th>
                        <th>SDD</th>
                        <th>Thừa cân / Béo phì</th>
                        <th>Bình thường</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.monthly.map((m) => (
                        <tr key={m.month}>
                          <td>{m.month}</td>
                          <td>{m.total}</td>
                          <td>
                            {m.sddCount} ({m.sddPct}%)
                          </td>
                          <td>
                            {m.overweightCount} ({m.overweightPct}%)
                          </td>
                          <td>
                            {m.normalCount} ({m.normalPct}%)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>

          <Card icon="🩺" iconBg="#E8F5E9" title="Hiệu Quả Can Thiệp">
            {report.intervention.totalChildrenWithMultipleVisits === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có trẻ nào tái khám (cần ít nhất 2 lần khám để so sánh).</p>
            ) : (
              <>
                <div className="grid-3" style={{ gap: 12, marginBottom: 16 }}>
                  <StatTile
                    icon="✅"
                    label="Cải thiện"
                    value={String(report.intervention.improved)}
                    sub={`${report.intervention.improvedPct}%`}
                    color="var(--success)"
                  />
                  <StatTile
                    icon="➖"
                    label="Giữ nguyên"
                    value={String(report.intervention.unchanged)}
                    sub={`${report.intervention.unchangedPct}%`}
                    color="var(--text-secondary)"
                  />
                  <StatTile
                    icon="⚠️"
                    label="Xấu đi"
                    value={String(report.intervention.worsened)}
                    sub={`${report.intervention.worsenedPct}%`}
                    color="var(--danger)"
                  />
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Trẻ</th>
                        <th>Lần khám đầu</th>
                        <th>Trạng thái đầu</th>
                        <th>Lần khám gần nhất</th>
                        <th>Trạng thái gần nhất</th>
                        <th>Kết quả</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.intervention.details.map((d) => (
                        <tr key={d.childId}>
                          <td>{d.childName}</td>
                          <td>{d.firstExamDate.slice(0, 10)}</td>
                          <td>{d.firstStatus}</td>
                          <td>{d.lastExamDate.slice(0, 10)}</td>
                          <td>{d.lastStatus}</td>
                          <td>{outcomeLabel(d.outcome)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
