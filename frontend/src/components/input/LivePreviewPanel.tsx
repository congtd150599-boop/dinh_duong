import type { AssessmentResult } from '@dinhduong/shared';
import { Card } from '../shared/Card';
import { StatusBadge } from '../shared/Badge';

export function LivePreviewPanel({ result, hasEnoughInput }: { result: AssessmentResult | null; hasEnoughInput: boolean }) {
  return (
    <Card icon="⚡" iconBg="" title="Xem trước kết quả" headerAccent extra={<span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.7 }}>Tự động cập nhật</span>}>
      {!hasEnoughInput || !result ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
          <p style={{ fontSize: 13 }}>
            {hasEnoughInput
              ? 'Đang tính toán...'
              : 'Nhập đầy đủ: họ tên, ngày sinh, ngày khám, cân nặng, chiều cao để xem kết quả'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <StatusBadge status={result.wfa} label={`CN/Tuổi: ${result.wfa}`} />
            <StatusBadge status={result.hfa} label={`CC/Tuổi: ${result.hfa}`} />
            <StatusBadge status={result.wfh} label={`CN/CC: ${result.wfh}`} />
          </div>
          <div className="divider" style={{ margin: '4px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--text-muted)' }}>NL chuẩn</span>
            <strong>{result.stdEnergy} kcal/ngày</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--text-muted)' }}>NL cá nhân</span>
            <strong style={{ color: 'var(--primary)' }}>{result.targetEnergy} kcal/ngày</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--text-muted)' }}>Đạm</span>
            <strong>
              {result.proteinG}g | Béo {result.lipidG}g | Bột {result.carbG}g
            </strong>
          </div>
        </div>
      )}
    </Card>
  );
}
