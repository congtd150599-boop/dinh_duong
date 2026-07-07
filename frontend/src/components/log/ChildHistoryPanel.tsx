import { useChildHistory } from '../../hooks/useChildren';
import { Card } from '../shared/Card';
import { InfoBox } from '../shared/InfoBox';
import { TrendChart } from './TrendChart';

interface ChildHistoryPanelProps {
  childId: string;
  onBack: () => void;
}

export function ChildHistoryPanel({ childId, onBack }: ChildHistoryPanelProps) {
  const { data: history, isLoading } = useChildHistory(childId);

  return (
    <div>
      <button className="btn-secondary" onClick={onBack} style={{ marginBottom: 16 }}>
        ← Quay lại danh sách
      </button>

      {isLoading || !history ? (
        <p>Đang tải...</p>
      ) : (
        <>
          <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 4 }}>
            📈 Lịch sử tăng trưởng — {history.child.name}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            {history.child.gender} · Sinh {history.child.dob.slice(0, 10)} · {history.visits.length} lần khám
          </p>

          {Object.keys(history.alerts).length > 0 && (
            <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.visits.map((v) => {
                const alertsForVisit = history.alerts[v.id];
                if (!alertsForVisit || alertsForVisit.length === 0) return null;
                return alertsForVisit.map((alert, i) => (
                  <InfoBox key={`${v.id}-${i}`} tone={alert.severity === 'danger' ? 'danger' : 'warn'}>
                    <strong>Lần khám {v.examDate.slice(0, 10)}:</strong> {alert.message}
                  </InfoBox>
                ));
              })}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Card icon="📊" iconBg="#E3F2FD" title="Biểu Đồ Xu Hướng">
              <div style={{ display: 'grid', gap: 24 }}>
                <TrendChart
                  title="Cân nặng (kg)"
                  unit="kg"
                  color="#2a78d6"
                  points={history.visits.map((v) => ({ examDate: v.examDate, value: v.weight }))}
                />
                <TrendChart
                  title="Chiều cao (cm)"
                  unit="cm"
                  color="#2e7d32"
                  points={history.visits.map((v) => ({ examDate: v.examDate, value: v.height }))}
                />
                <TrendChart
                  title="BMI"
                  unit=""
                  color="#eb6834"
                  points={history.visits.map((v) => ({ examDate: v.examDate, value: v.bmi }))}
                />
              </div>
            </Card>

            <Card icon="📁" iconBg="#FFF3E0" title="Bảng Lịch Sử Khám">
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ngày khám</th>
                      <th>Cân nặng (kg)</th>
                      <th>Chiều cao (cm)</th>
                      <th>BMI</th>
                      <th>Z-score CN/Tuổi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.visits.map((v) => (
                      <tr key={v.id}>
                        <td>{v.examDate.slice(0, 10)}</td>
                        <td>{v.weight}</td>
                        <td>{v.height}</td>
                        <td>{v.bmi}</td>
                        <td>{v.wfaZ != null ? v.wfaZ.toFixed(2) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
