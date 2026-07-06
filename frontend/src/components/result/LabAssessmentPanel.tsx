import type { LabResult } from '@dinhduong/shared';
import { Card } from '../shared/Card';

const STATUS_COLOR: Record<LabResult['status'], string> = {
  ok: 'var(--success)',
  deficit: 'var(--danger)',
  excess: 'var(--warning)',
};

export function LabAssessmentPanel({ labs }: { labs: LabResult[] }) {
  if (labs.length === 0) return null;

  return (
    <Card icon="🧪" iconBg="#FFF8E1" title="Đánh Giá Xét Nghiệm Vi Chất">
      {labs.map((lab) => (
        <div key={lab.name} className={`micro-item ${lab.status}`}>
          <div className="micro-icon">{lab.icon}</div>
          <div className="micro-info">
            <div className="micro-name">{lab.name}</div>
            <div className="micro-detail">
              Giá trị bình thường: {lab.normal} {lab.unit} | Kết quả:{' '}
              <strong>
                {lab.value} {lab.unit}
              </strong>
            </div>
            <div style={{ fontWeight: 600, fontSize: 12, marginTop: 4, color: STATUS_COLOR[lab.status] }}>{lab.diagnosis}</div>
            {lab.recommendation && <div className="micro-rec">💊 {lab.recommendation}</div>}
          </div>
          <div className="micro-val" style={{ color: STATUS_COLOR[lab.status] }}>
            {lab.value}
            <div style={{ fontSize: 10, fontWeight: 400 }}>{lab.unit}</div>
          </div>
        </div>
      ))}
    </Card>
  );
}
