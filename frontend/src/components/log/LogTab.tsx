import type { AssessmentResult } from '@dinhduong/shared';
import { csvExportUrl } from '../../api/client';
import { useAppState } from '../../context/AppStateContext';
import { useDeletePatient, usePatients } from '../../hooks/usePatients';
import { useToast } from '../shared/ToastContext';

export function LogTab() {
  const { data: patients, isLoading } = usePatients();
  const deletePatient = useDeletePatient();
  const { setActiveTab, setCurrentResult } = useAppState();
  const { showToast } = useToast();

  function handleDelete(id: string, name: string) {
    if (!confirm(`Xoá hồ sơ của "${name}"?`)) return;
    deletePatient.mutate(id, {
      onSuccess: () => showToast('Đã xoá hồ sơ.', 'error'),
      onError: () => showToast('Lỗi khi xoá hồ sơ.', 'error'),
    });
  }

  function handleView(fullResult: AssessmentResult) {
    setCurrentResult(fullResult);
    setActiveTab('result');
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--primary-dark)' }}>
            📁 Nhật Ký Bệnh Nhân
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Dữ liệu được lưu trữ trên máy chủ (PostgreSQL)</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a className="btn-secondary" href={csvExportUrl()} style={{ textDecoration: 'none', display: 'inline-block' }}>
            📥 Xuất CSV
          </a>
        </div>
      </div>
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" id="log-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Ngày khám</th>
                <th>Họ và tên</th>
                <th>Tuổi</th>
                <th>Giới</th>
                <th>CN (kg)</th>
                <th>CC (cm)</th>
                <th>BMI</th>
                <th>Tình trạng</th>
                <th>NL chuẩn</th>
                <th>NL cá nhân</th>
                <th>Đánh giá vi chất</th>
                <th>Ngày TK</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={14} style={{ textAlign: 'center', padding: 24 }}>
                    Đang tải...
                  </td>
                </tr>
              ) : !patients || patients.length === 0 ? (
                <tr>
                  <td colSpan={14}>
                    <div className="log-empty">
                      <div className="icon">📭</div>
                      <p>
                        Chưa có hồ sơ nào được lưu.
                        <br />
                        Nhập liệu bệnh nhân và bấm <strong>Lưu Hồ Sơ</strong> để bắt đầu.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                patients
                  .slice()
                  .reverse()
                  .map((p) => {
                    const statusColor = p.wfh.includes('nặng') ? '#C62828' : p.wfh === 'Bình thường' ? '#2E7D32' : '#F57F17';
                    return (
                      <tr key={p.id}>
                        <td>{p.stt}</td>
                        <td>{p.examDate.slice(0, 10)}</td>
                        <td style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => handleView(p.fullResult)}>
                          {p.name}
                        </td>
                        <td>{p.months}T</td>
                        <td>{p.gender}</td>
                        <td>{p.weight}</td>
                        <td>{p.height}</td>
                        <td>{p.bmi}</td>
                        <td>
                          <span style={{ color: statusColor, fontWeight: 600, fontSize: 12 }}>{p.wfh}</span>
                        </td>
                        <td>{p.stdEnergy} kcal</td>
                        <td>{p.targetEnergy} kcal</td>
                        <td style={{ fontSize: 11, maxWidth: 200 }}>{p.labAssessmentSummary}</td>
                        <td>{p.revisit ? p.revisit.slice(0, 10) : '—'}</td>
                        <td>
                          <button className="btn-danger" onClick={() => handleDelete(p.id, p.name)}>
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
