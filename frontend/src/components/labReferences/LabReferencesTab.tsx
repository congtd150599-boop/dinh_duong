import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { LabReferenceRecord, LabTestKey } from '@dinhduong/shared';
import { importLabReferencesCsv, labReferencesExportUrl, listLabReferences } from '../../api/labReferences';
import { ApiError } from '../../api/client';
import { Card } from '../shared/Card';
import { InfoBox } from '../shared/InfoBox';
import { useToast } from '../shared/ToastContext';

interface ImportErrorDetails {
  error: string;
  lineNumber?: number;
}

const TEST_LABELS: Record<LabTestKey, string> = {
  ca: 'Calci toàn phần',
  vitD: 'Vitamin D 25(OH)D',
  zn: 'Kẽm huyết thanh',
  hb: 'Hemoglobin (Hb)',
  fe: 'Sắt huyết thanh',
  ferritin: 'Ferritin (Sắt dự trữ)',
  chol: 'Cholesterol toàn phần',
  tg: 'Triglycerid',
};

function formatAgeRange(minMonths: number, maxMonths: number): string {
  if (minMonths === 0 && maxMonths >= 9999) return 'Mọi lứa tuổi';
  if (maxMonths >= 9999) return `≥${minMonths} tháng`;
  return `${minMonths}–${maxMonths} tháng`;
}

function formatThresholds(r: LabReferenceRecord): string {
  const parts: string[] = [];
  if (r.lowSevere !== null) parts.push(`nặng <${r.lowSevere}`);
  if (r.lowDeficit !== null) parts.push(`thiếu <${r.lowDeficit}`);
  if (r.highBorderline !== null) parts.push(`ranh giới ${r.highInclusive ? '≥' : '>'}${r.highBorderline}`);
  if (r.highExcess !== null) parts.push(`cao ${r.highInclusive ? '≥' : '>'}${r.highExcess}`);
  return parts.join(' · ');
}

export function LabReferencesTab() {
  const { data: records, isLoading } = useQuery({ queryKey: ['labReferences'], queryFn: listLabReferences });
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const importMutation = useMutation({
    mutationFn: (csvText: string) => importLabReferencesCsv(csvText),
    onSuccess: (result) => {
      setImportError(null);
      setPendingFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['labReferences'] });
      showToast(`✅ Đã nhập ${result.imported} dòng chuẩn xét nghiệm mới!`, 'success');
    },
    onError: (err) => {
      const details = err instanceof ApiError ? (err.details as ImportErrorDetails | undefined) : undefined;
      const message = details?.error ?? (err instanceof Error ? err.message : 'Lỗi không xác định');
      setImportError(details?.lineNumber ? `${message} (dòng ${details.lineNumber})` : message);
    },
  });

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setImportError(null);
    setPendingFileName(file?.name ?? null);
  }

  function handleImportClick() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      showToast('Vui lòng chọn file CSV trước!', 'error');
      return;
    }
    if (!confirm(`Nhập file "${file.name}" sẽ THAY THẾ TOÀN BỘ bảng chuẩn xét nghiệm hiện tại. Tiếp tục?`)) return;

    file.text().then((text) => importMutation.mutate(text));
  }

  return (
    <div>
      <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 4 }}>
        🧪 Quản Lý Chuẩn Xét Nghiệm
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        Ngưỡng đánh giá xét nghiệm vi chất (Calci, Vitamin D, Kẽm, Hb, Sắt, Ferritin, Cholesterol, Triglycerid) dùng để chấm "thiếu/bình
        thường/cao" — tách riêng khỏi mã nguồn, có thể xuất ra để kiểm tra hoặc nhập dữ liệu mới khi phòng xét nghiệm đổi máy/thang đo, hoặc có
        hướng dẫn mới.
      </p>

      <div className="grid-2" style={{ gap: 20, alignItems: 'start' }}>
        <Card icon="📊" iconBg="#E3F2FD" title="Dữ liệu hiện tại">
          {isLoading ? (
            <p>Đang tải...</p>
          ) : (
            <>
              <div style={{ overflowX: 'auto', marginBottom: 12 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Xét nghiệm</th>
                      <th>Giới</th>
                      <th>Tuổi</th>
                      <th>Ngưỡng</th>
                      <th>Đơn vị</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(records ?? []).map((r, i) => (
                      <tr key={`${r.testKey}-${r.gender}-${r.minMonths}-${i}`}>
                        <td>{TEST_LABELS[r.testKey] ?? r.testKey}</td>
                        <td>{r.gender}</td>
                        <td>{formatAgeRange(r.minMonths, r.maxMonths)}</td>
                        <td>{formatThresholds(r)}</td>
                        <td>{r.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <a className="btn-secondary" href={labReferencesExportUrl()} style={{ textDecoration: 'none', display: 'inline-block' }}>
                📥 Tải xuống CSV hiện tại
              </a>
            </>
          )}
        </Card>

        <Card icon="📤" iconBg="#FFF3E0" title="Nhập Dữ Liệu Mới">
          <InfoBox tone="warn">
            Nhập file CSV sẽ <strong>thay thế toàn bộ</strong> bảng hiện tại, áp dụng ngay lập tức (không cần khởi động lại). Định dạng cột bắt
            buộc:{' '}
            <code>testKey,gender,minMonths,maxMonths,lowSevere,lowDeficit,highBorderline,highExcess,highInclusive,unit,source</code>. 4 cột
            ngưỡng (lowSevere/lowDeficit/highBorderline/highExcess) để trống nếu không áp dụng cho xét nghiệm đó — vd Kẽm chỉ cần lowDeficit.
            gender là "Nam"/"Nữ"/"Cả hai".
          </InfoBox>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Chọn file CSV</label>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="form-control" onChange={handleFileChosen} />
            {pendingFileName && <div className="form-hint">Đã chọn: {pendingFileName}</div>}
          </div>
          {importError && (
            <div style={{ marginBottom: 12 }}>
              <InfoBox tone="danger">{importError}</InfoBox>
            </div>
          )}
          <button className="btn-primary" onClick={handleImportClick} disabled={importMutation.isPending}>
            📤 {importMutation.isPending ? 'Đang nhập...' : 'Nhập Dữ Liệu'}
          </button>
        </Card>
      </div>
    </div>
  );
}
