import type { GuardianRecord, GuardianRelationship } from '@dinhduong/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { upsertGuardian } from '../../api/children';
import { ApiError } from '../../api/client';
import { useChildHistory } from '../../hooks/useChildren';
import { Card } from '../shared/Card';
import { InfoBox } from '../shared/InfoBox';
import { useToast } from '../shared/ToastContext';
import { TrendChart } from './TrendChart';

interface ChildHistoryPanelProps {
  childId: string;
  onBack: () => void;
  /** Opens the guardian contact cards already in edit mode — used when a doctor jumps here specifically to add/fix contact info (e.g. from LogTab's "Liên hệ" column) rather than to browse growth history. */
  autoEditContact?: boolean;
}

export function ChildHistoryPanel({ childId, onBack, autoEditContact }: ChildHistoryPanelProps) {
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
            {!history.guardians.some((g) => g.email && g.phone) && (
              <InfoBox tone="warn">Chưa có người đại diện nào đủ điều kiện liên hệ (cần cả email và số điện thoại) cho trẻ này.</InfoBox>
            )}

            <div className="grid-2" style={{ gap: 20, alignItems: 'start' }}>
              <GuardianCard
                childId={childId}
                relationship="Bố"
                guardian={history.guardians.find((g) => g.relationship === 'Bố')}
                startEditing={autoEditContact}
              />
              <GuardianCard
                childId={childId}
                relationship="Mẹ"
                guardian={history.guardians.find((g) => g.relationship === 'Mẹ')}
                startEditing={autoEditContact}
              />
            </div>

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
                      <th>Khám bởi</th>
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
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v.examinedByName ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card icon="📧" iconBg="#E1F5FE" title="Báo Cáo Đã Gửi">
              {history.reportLogs.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa gửi báo cáo nào cho trẻ này.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Ngày gửi</th>
                        <th>Lần khám</th>
                        <th>Gửi tới</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.reportLogs.map((log) => (
                        <tr key={log.id}>
                          <td>{new Date(log.sentAt).toLocaleString('vi-VN')}</td>
                          <td>{log.examDate.slice(0, 10)}</td>
                          <td>
                            {log.recipientName ? `${log.recipientName} — ` : ''}
                            {log.recipientEmail}
                          </td>
                          <td>
                            {log.status === 'sent' ? (
                              <span style={{ color: 'var(--success)' }}>✅ Đã gửi</span>
                            ) : (
                              <span style={{ color: 'var(--danger)' }} title={log.errorMessage ?? undefined}>
                                ❌ Thất bại
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

interface GuardianFormState {
  name: string;
  dob: string;
  address: string;
  email: string;
  phone: string;
}

function toFormState(g: GuardianRecord | undefined): GuardianFormState {
  return {
    name: g?.name ?? '',
    dob: g?.dob?.slice(0, 10) ?? '',
    address: g?.address ?? '',
    email: g?.email ?? '',
    phone: g?.phone ?? '',
  };
}

function GuardianCard({
  childId,
  relationship,
  guardian,
  startEditing,
}: {
  childId: string;
  relationship: GuardianRelationship;
  guardian: GuardianRecord | undefined;
  startEditing?: boolean;
}) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(!!startEditing);
  const [form, setForm] = useState<GuardianFormState>(toFormState(guardian));

  const mutation = useMutation({
    mutationFn: () =>
      upsertGuardian(childId, {
        relationship,
        name: form.name.trim() || null,
        dob: form.dob || null,
        address: form.address.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children', 'history', childId] });
      setEditing(false);
      showToast(`✅ Đã cập nhật thông tin ${relationship}.`, 'success');
    },
    onError: (err) => {
      const message = err instanceof ApiError ? ((err.details as { error?: string })?.error ?? 'Cập nhật thất bại') : 'Cập nhật thất bại';
      showToast(message, 'error');
    },
  });

  function handleCancel() {
    setForm(toFormState(guardian));
    setEditing(false);
  }

  const qualifies = !!guardian?.email && !!guardian?.phone;

  return (
    <Card icon={relationship === 'Bố' ? '👨' : '👩'} iconBg="#E8F5E9" title={`Thông tin ${relationship}`}>
      {editing ? (
        <>
          <div className="form-group">
            <label className="form-label">Họ tên</label>
            <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Ngày sinh</label>
              <input type="date" className="form-control" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Địa chỉ</label>
              <input className="form-control" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Số điện thoại</label>
              <input type="tel" className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? 'Đang lưu...' : '💾 Lưu'}
            </button>
            <button className="btn-secondary" onClick={handleCancel}>
              Hủy
            </button>
          </div>
        </>
      ) : (
        <>
          {!guardian?.name && !guardian?.email && !guardian?.phone ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có thông tin.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
              <div>
                <strong>{guardian?.name || '—'}</strong>
              </div>
              {guardian?.dob && <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Sinh {guardian.dob.slice(0, 10)}</div>}
              {guardian?.address && <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>📍 {guardian.address}</div>}
              <div>📧 {guardian?.email || '—'}</div>
              <div>📱 {guardian?.phone || '—'}</div>
              {qualifies && <span style={{ color: 'var(--success)', fontSize: 12 }}>✓ Đủ điều kiện liên hệ</span>}
            </div>
          )}
          <button className="btn-secondary" style={{ marginTop: 12 }} onClick={() => setEditing(true)}>
            ✏️ Sửa
          </button>
        </>
      )}
    </Card>
  );
}
