import { computeGrowthAlerts, type AssessmentResult, type Gender, type GrowthAlert, type PatientRecord, type VisitPoint } from '@dinhduong/shared';
import { useMemo, useState } from 'react';
import { csvExportUrl } from '../../api/client';
import { useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';
import { useDeletePatient, usePatients } from '../../hooks/usePatients';
import { useToast } from '../shared/ToastContext';
import { ChildHistoryPanel } from './ChildHistoryPanel';

const WFH_OPTIONS = ['SDD cấp nặng', 'Suy dinh dưỡng cấp', 'Bình thường', 'Thừa cân', 'Béo phì'];
const SDD_STATUSES = new Set(['SDD cấp nặng', 'Suy dinh dưỡng cấp']);
const OVERWEIGHT_STATUSES = new Set(['Thừa cân', 'Béo phì']);

interface Filters {
  search: string;
  gender: Gender | 'all';
  wfh: string | 'all';
  from: string;
  to: string;
}

const emptyFilters: Filters = { search: '', gender: 'all', wfh: 'all', from: '', to: '' };

function matchesFilters(p: PatientRecord, f: Filters): boolean {
  if (f.search.trim() && !p.name.toLowerCase().includes(f.search.trim().toLowerCase())) return false;
  if (f.gender !== 'all' && p.gender !== f.gender) return false;
  if (f.wfh !== 'all' && p.wfh !== f.wfh) return false;
  const examDate = p.examDate.slice(0, 10);
  if (f.from && examDate < f.from) return false;
  if (f.to && examDate > f.to) return false;
  return true;
}

/** Groups patients by childId and runs computeGrowthAlerts per group — reuses data usePatients() already loaded, no extra fetch. */
function buildAlertsByVisitId(patients: PatientRecord[]): Map<string, GrowthAlert[]> {
  const byChild = new Map<string, PatientRecord[]>();
  for (const p of patients) {
    if (!byChild.has(p.childId)) byChild.set(p.childId, []);
    byChild.get(p.childId)!.push(p);
  }
  const merged = new Map<string, GrowthAlert[]>();
  for (const visits of byChild.values()) {
    const points: VisitPoint[] = visits.map((p) => ({
      id: p.id,
      examDate: p.examDate,
      weight: p.weight,
      height: p.height,
      wfaZ: p.fullResult.wfaZ,
    }));
    for (const [visitId, alerts] of computeGrowthAlerts(points)) merged.set(visitId, alerts);
  }
  return merged;
}

export function LogTab() {
  const { data: patients, isLoading } = usePatients();
  const deletePatient = useDeletePatient();
  const { setActiveTab, setCurrentResult } = useAppState();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const filtered = useMemo(() => (patients ?? []).filter((p) => matchesFilters(p, filters)), [patients, filters]);
  const alertsByVisitId = useMemo(() => buildAlertsByVisitId(patients ?? []), [patients]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const sdd = filtered.filter((p) => SDD_STATUSES.has(p.wfh)).length;
    const overweight = filtered.filter((p) => OVERWEIGHT_STATUSES.has(p.wfh)).length;
    const normal = total - sdd - overweight;
    const pct = (n: number) => (total > 0 ? `${((n / total) * 100).toFixed(0)}%` : '—');
    return { total, sdd, overweight, normal, sddPct: pct(sdd), overweightPct: pct(overweight), normalPct: pct(normal) };
  }, [filtered]);

  const canDelete = user?.role === 'admin' || user?.role === 'bac_si';
  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(emptyFilters);

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

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

  if (selectedChildId) {
    return <ChildHistoryPanel childId={selectedChildId} onBack={() => setSelectedChildId(null)} />;
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

      {!isLoading && patients && patients.length > 0 && (
        <>
          <div className="grid-4" style={{ gap: 12, marginBottom: 16 }}>
            <StatTile icon="📋" label="Tổng số hồ sơ" value={String(stats.total)} />
            <StatTile icon="⚠️" label="Suy dinh dưỡng" value={String(stats.sdd)} sub={stats.sddPct} color="var(--danger)" />
            <StatTile icon="📈" label="Thừa cân / béo phì" value={String(stats.overweight)} sub={stats.overweightPct} color="var(--warning)" />
            <StatTile icon="✅" label="Bình thường" value={String(stats.normal)} sub={stats.normalPct} color="var(--success)" />
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0, minWidth: 180, flex: 1 }}>
                <label className="form-label">Tìm theo tên</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nguyễn Văn A"
                  value={filters.search}
                  onChange={(e) => update('search', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Giới</label>
                <select className="form-control" value={filters.gender} onChange={(e) => update('gender', e.target.value as Filters['gender'])}>
                  <option value="all">Tất cả</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tình trạng (CN/CC)</label>
                <select className="form-control" value={filters.wfh} onChange={(e) => update('wfh', e.target.value)}>
                  <option value="all">Tất cả</option>
                  {WFH_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Ngày khám từ</label>
                <input type="date" className="form-control" value={filters.from} onChange={(e) => update('from', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Đến</label>
                <input type="date" className="form-control" value={filters.to} onChange={(e) => update('to', e.target.value)} />
              </div>
              {hasActiveFilters && (
                <button className="btn-secondary" onClick={() => setFilters(emptyFilters)}>
                  ✕ Xóa lọc
                </button>
              )}
            </div>
          </div>
        </>
      )}

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
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={14} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    Không tìm thấy hồ sơ nào khớp bộ lọc.
                  </td>
                </tr>
              ) : (
                filtered
                  .slice()
                  .reverse()
                  .map((p) => {
                    const statusColor = p.wfh.includes('nặng') ? '#C62828' : p.wfh === 'Bình thường' ? '#2E7D32' : '#F57F17';
                    const alerts = alertsByVisitId.get(p.id);
                    return (
                      <tr key={p.id}>
                        <td>{p.stt}</td>
                        <td>{p.examDate.slice(0, 10)}</td>
                        <td style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => handleView(p.fullResult)}>
                          {p.name}
                          {alerts && alerts.length > 0 && (
                            <span title={alerts.map((a) => a.message).join(' · ')} style={{ marginLeft: 6 }}>
                              🚩
                            </span>
                          )}
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
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn-secondary" onClick={() => setSelectedChildId(p.childId)}>
                              📈 Lịch sử
                            </button>
                            {canDelete && (
                              <button className="btn-danger" onClick={() => handleDelete(p.id, p.name)}>
                                🗑️
                              </button>
                            )}
                          </div>
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

function StatTile({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
          {sub && (
            <span style={{ fontSize: 13, fontWeight: 600, color: color ?? 'var(--text-secondary)' }}>{sub}</span>
          )}
        </div>
      </div>
    </div>
  );
}
