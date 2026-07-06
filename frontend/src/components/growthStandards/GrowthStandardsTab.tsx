import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { GrowthStandardRecord } from '../../api/growthStandards';
import { growthStandardsExportUrl, importGrowthStandardsCsv, listGrowthStandards } from '../../api/growthStandards';
import { ApiError } from '../../api/client';

interface ImportErrorDetails {
  error: string;
  lineNumber?: number;
}
import { Card } from '../shared/Card';
import { InfoBox } from '../shared/InfoBox';
import { useToast } from '../shared/ToastContext';

export function GrowthStandardsTab() {
  const { data: records, isLoading } = useQuery({ queryKey: ['growthStandards'], queryFn: listGrowthStandards });
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const importMutation = useMutation({
    mutationFn: (csvText: string) => importGrowthStandardsCsv(csvText),
    onSuccess: (result) => {
      setImportError(null);
      setPendingFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['growthStandards'] });
      showToast(`✅ Đã nhập ${result.imported} dòng dữ liệu chuẩn tăng trưởng mới!`, 'success');
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
    if (!confirm(`Nhập file "${file.name}" sẽ THAY THẾ TOÀN BỘ bảng chuẩn tăng trưởng hiện tại. Tiếp tục?`)) return;

    file.text().then((text) => importMutation.mutate(text));
  }

  const summary = summarize(records ?? []);

  return (
    <div>
      <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 4 }}>
        📐 Quản Lý Chuẩn Tăng Trưởng (WFA / HFA)
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        Bảng median cân nặng/chiều cao theo tháng tuổi dùng để tính Z-score. Tách riêng khỏi mã nguồn — có thể xuất ra để kiểm tra, hoặc nhập
        (import) dữ liệu mới khi có bản cập nhật chuẩn.
      </p>

      <div className="grid-2" style={{ gap: 20, alignItems: 'start' }}>
        <Card icon="📊" iconBg="#E3F2FD" title="Dữ liệu hiện tại">
          {isLoading ? (
            <p>Đang tải...</p>
          ) : (
            <>
              <table className="data-table" style={{ marginBottom: 12 }}>
                <thead>
                  <tr>
                    <th>Giới</th>
                    <th>Chỉ số</th>
                    <th>Số mốc tháng</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.rows.map((r) => (
                    <tr key={`${r.gender}-${r.metric}`}>
                      <td>{r.gender}</td>
                      <td>{r.metric}</td>
                      <td>{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                <strong>Nguồn dữ liệu:</strong>
                <ul style={{ marginTop: 4, paddingLeft: 18 }}>
                  {summary.sources.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
              <a className="btn-secondary" href={growthStandardsExportUrl()} style={{ textDecoration: 'none', display: 'inline-block' }}>
                📥 Tải xuống CSV hiện tại
              </a>
            </>
          )}
        </Card>

        <Card icon="📤" iconBg="#FFF3E0" title="Nhập Dữ Liệu Mới">
          <InfoBox tone="warn">
            Nhập file CSV sẽ <strong>thay thế toàn bộ</strong> bảng hiện tại, áp dụng ngay lập tức (không cần khởi động lại). Định dạng cột bắt
            buộc: <code>gender,metric,months,median,source</code> — gender là "Nam"/"Nữ", metric là "WFA"/"HFA".
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

function summarize(records: GrowthStandardRecord[]) {
  const counts = new Map<string, number>();
  const sources = new Set<string>();
  for (const r of records) {
    const key = `${r.gender}_${r.metric}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (r.source) sources.add(r.source);
  }
  const rows = [...counts.entries()].map(([key, count]) => {
    const [gender, metric] = key.split('_');
    return { gender, metric, count };
  });
  return { rows, sources: [...sources] };
}
