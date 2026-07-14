import type { AssessmentResult } from '@dinhduong/shared';
import { Card } from '../shared/Card';

function diffClass(diff: number, tolerance = 0.5): string {
  if (Math.abs(diff) < tolerance) return 'diff-ok';
  return diff < 0 ? 'diff-low' : 'diff-high';
}

export function WhoComparePanel({ result }: { result: AssessmentResult | null }) {
  return (
    <Card icon="📈" iconBg="#E8EAF6" title="So Sánh Chuẩn WHO">
      {!result ? (
        <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>
          Nhập đầy đủ thông tin để so sánh với chuẩn WHO
        </div>
      ) : (
        <>
          <div className="compare-row">
            <div className="compare-label">Cân nặng</div>
            <div className="compare-current">{result.weight}</div>
            <div className="compare-unit">kg</div>
            <div className="compare-arrow">→</div>
            {result.whoWeight !== null ? (
              <>
                <div className="compare-target">CĐ: {result.whoWeight} kg</div>
                <div className={`compare-diff ${diffClass(result.weight - result.whoWeight)}`}>
                  {(result.weight - result.whoWeight > 0 ? '+' : '') + (result.weight - result.whoWeight).toFixed(1)} kg
                </div>
              </>
            ) : (
              <>
                <div className="compare-target">N/A (&gt;5 Tuổi)</div>
                <div className="compare-diff">-</div>
              </>
            )}
          </div>
          <div className="compare-row">
            <div className="compare-label">Chiều cao</div>
            <div className="compare-current">{result.height}</div>
            <div className="compare-unit">cm</div>
            <div className="compare-arrow">→</div>
            <div className="compare-target">CĐ: {result.whoHeight} cm</div>
            <div className={`compare-diff ${diffClass(result.height - result.whoHeight)}`}>
              {(result.height - result.whoHeight > 0 ? '+' : '') + (result.height - result.whoHeight).toFixed(1)} cm
            </div>
          </div>
          <div className="compare-row">
            <div className="compare-label">BMI/Tuổi</div>
            <div className="compare-current">{result.bmi}</div>
            <div className="compare-unit">kg/m²</div>
            <div className="compare-arrow">→</div>
            {/* result.bfaZ (BMI-for-age, WHO) thay ngưỡng BMI người lớn cố định
                (18.5-24.9) cũ — sai vì áp dụng cho trẻ em, xem Bugs.md #9. */}
            {result.bfaZ !== null ? (
              <>
                <div className="compare-target">CĐ: -2 đến +2 SD</div>
                <div className={`compare-diff ${result.bfaZ < -2 ? 'diff-low' : result.bfaZ > 2 ? 'diff-high' : 'diff-ok'}`}>
                  {result.bfaZ < -2 ? result.bfa : result.bfaZ > 2 ? result.bfa : '✓ OK'}
                </div>
              </>
            ) : (
              <>
                <div className="compare-target">N/A</div>
                <div className="compare-diff">-</div>
              </>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
