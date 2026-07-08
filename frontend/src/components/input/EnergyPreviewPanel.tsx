import type { AssessmentResult } from '@dinhduong/shared';
import { Card } from '../shared/Card';
import { InfoBox } from '../shared/InfoBox';

export function EnergyPreviewPanel({ result }: { result: AssessmentResult | null }) {
  if (!result) {
    return (
      <Card icon="⚡" iconBg="#FFF3E0" title="Nhu Cầu Năng Lượng">
        <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>
          Năng lượng sẽ được tính toán tự động theo tuổi và tình trạng
        </div>
      </Card>
    );
  }

  const carbPct = Math.round((result.carbG * 4 * 100) / result.targetEnergy);
  const protPct = Math.round((result.proteinG * 4 * 100) / result.targetEnergy);
  const lipPct = 100 - carbPct - protPct;

  return (
    <Card icon="⚡" iconBg="#FFF3E0" title="Nhu Cầu Năng Lượng">
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Năng lượng chuẩn (theo tuổi)</span>
          <strong style={{ fontSize: 14 }}>{result.stdEnergy} kcal/ngày</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Năng lượng cá nhân hóa</span>
          <strong style={{ fontSize: 16, color: 'var(--primary)' }}>{result.targetEnergy} kcal/ngày</strong>
        </div>
        {result.energyNote && (
          <div style={{ marginTop: 8 }}>
            <InfoBox tone={result.energyNoteType} icon={result.energyNoteIcon}>
              {result.energyNote}
            </InfoBox>
          </div>
        )}
      </div>
      <div className="divider" style={{ margin: '12px 0' }} />
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
        PHÂN BỔ ĐẠI CHẤT DINH DƯỠNG
      </div>
      <div className="macro-chart">
        <div className="macro-seg" style={{ flex: carbPct, background: '#FF6F00' }}>
          Tinh bột
        </div>
        <div className="macro-seg" style={{ flex: protPct, background: '#0277BD' }}>
          Đạm
        </div>
        <div className="macro-seg" style={{ flex: lipPct, background: '#2E7D32' }}>
          Béo
        </div>
      </div>
      <div className="stat-grid-3" style={{ gap: 8 }}>
        <div style={{ textAlign: 'center', padding: 10, background: '#FFF8E1', borderRadius: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#FF6F00' }}>{result.carbG}g</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Bột đường ({carbPct}%)</div>
        </div>
        <div style={{ textAlign: 'center', padding: 10, background: '#E1F5FE', borderRadius: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0277BD' }}>{result.proteinG}g</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Đạm ({protPct}%)</div>
        </div>
        <div style={{ textAlign: 'center', padding: 10, background: '#E8F5E9', borderRadius: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#2E7D32' }}>{result.lipidG}g</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Béo ({lipPct}%)</div>
        </div>
      </div>
    </Card>
  );
}
