import type { Role, UserRecord, UserStatus } from '@dinhduong/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { triggerBackup } from '../../api/admin';
import { createUser, listUsers, resetPassword, updateUser, type CreateUserInput, type UpdateUserInput } from '../../api/users';
import { ApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useAuditLogs, useBackups } from '../../hooks/useAdmin';
import { Card } from '../shared/Card';
import { InfoBox } from '../shared/InfoBox';
import { useToast } from '../shared/ToastContext';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Quản trị viên',
  bac_si: 'Bác sĩ',
  dieu_duong: 'Điều dưỡng',
};

const ROLE_OPTIONS: Role[] = ['admin', 'bac_si', 'dieu_duong'];

const STATUS_BADGE: Record<UserStatus, { label: string; bg: string; color: string }> = {
  pending: { label: 'Đang chờ duyệt', bg: 'var(--warning-light)', color: 'var(--warning)' },
  active: { label: 'Đang hoạt động', bg: 'var(--success-light)', color: 'var(--success)' },
  disabled: { label: 'Đã vô hiệu hóa', bg: 'var(--surface-2)', color: 'var(--text-muted)' },
};

const initialForm: CreateUserInput = { name: '', email: '', password: '', role: 'dieu_duong' };

export function UsersTab() {
  const { user: me } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: listUsers });
  const [form, setForm] = useState<CreateUserInput>(initialForm);

  function errorMessage(err: unknown, fallback: string): string {
    if (err instanceof ApiError) {
      const details = err.details as { error?: string } | undefined;
      return details?.error ?? fallback;
    }
    return fallback;
  }

  const createMutation = useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: () => {
      setForm(initialForm);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast('✅ Đã tạo tài khoản mới!', 'success');
    },
    onError: (err) => showToast(errorMessage(err, 'Tạo tài khoản thất bại'), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) => updateUser(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: (err) => showToast(errorMessage(err, 'Cập nhật thất bại'), 'error'),
  });

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate(form);
  }

  function handleRoleChange(u: UserRecord, role: Role) {
    updateMutation.mutate({ id: u.id, input: { role } });
  }

  function handleToggleActive(u: UserRecord) {
    const goingActive = u.status !== 'active';
    if (!confirm(`Xác nhận ${goingActive ? 'kích hoạt lại' : 'vô hiệu hóa'} tài khoản "${u.name}"?`)) return;
    updateMutation.mutate({ id: u.id, input: { status: goingActive ? 'active' : 'disabled' } });
  }

  function handleApprove(u: UserRecord, role: Role) {
    updateMutation.mutate(
      { id: u.id, input: { status: 'active', role } },
      { onSuccess: () => showToast(`✅ Đã duyệt tài khoản "${u.name}".`, 'success') },
    );
  }

  function handleReject(u: UserRecord) {
    if (!confirm(`Từ chối yêu cầu đăng ký của "${u.name}"? Tài khoản sẽ ở trạng thái vô hiệu hóa.`)) return;
    updateMutation.mutate(
      { id: u.id, input: { status: 'disabled' } },
      { onSuccess: () => showToast(`Đã từ chối tài khoản "${u.name}".`, 'success') },
    );
  }

  function handleResetPassword(u: UserRecord) {
    const newPassword = prompt(`Nhập mật khẩu mới cho "${u.name}" (tối thiểu 8 ký tự):`);
    if (!newPassword) return;
    resetPassword(u.id, newPassword)
      .then(() => showToast('✅ Đã đặt lại mật khẩu.', 'success'))
      .catch((err) => showToast(errorMessage(err, 'Đặt lại mật khẩu thất bại'), 'error'));
  }

  const pendingUsers = (users ?? []).filter((u) => u.status === 'pending');
  const otherUsers = (users ?? []).filter((u) => u.status !== 'pending');

  return (
    <div>
      <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 4 }}>
        👤 Quản Lý Người Dùng
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        Tạo tài khoản, phân quyền, vô hiệu hóa/kích hoạt và đặt lại mật khẩu cho nhân viên phòng khám.
      </p>

      {!isLoading && pendingUsers.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <PendingApprovalCard pendingUsers={pendingUsers} onApprove={handleApprove} onReject={handleReject} isBusy={updateMutation.isPending} />
        </div>
      )}

      <div className="grid-list-form" style={{ alignItems: 'start' }}>
        <Card icon="📋" iconBg="#E3F2FD" title="Danh sách người dùng">
          {isLoading ? (
            <p>Đang tải...</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ whiteSpace: 'nowrap' }}>Tên</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Email</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Vai trò</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Trạng thái</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {otherUsers.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <select
                          className="form-control"
                          style={{ minWidth: 150 }}
                          value={u.role}
                          disabled={u.id === me?.id}
                          onChange={(e) => handleRoleChange(u, e.target.value as Role)}
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            whiteSpace: 'nowrap',
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: STATUS_BADGE[u.status].bg,
                            color: STATUS_BADGE[u.status].color,
                          }}
                        >
                          {STATUS_BADGE[u.status].label}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '8px 14px', fontSize: 12, whiteSpace: 'nowrap' }}
                            onClick={() => handleResetPassword(u)}
                          >
                            🔑 Đặt lại mật khẩu
                          </button>
                          <button
                            className={u.status === 'active' ? 'btn-danger' : 'btn-secondary'}
                            style={{ padding: '8px 14px', fontSize: 12, whiteSpace: 'nowrap' }}
                            disabled={u.id === me?.id}
                            onClick={() => handleToggleActive(u)}
                          >
                            {u.status === 'active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card icon="➕" iconBg="#FFF3E0" title="Thêm Người Dùng Mới">
          <form onSubmit={handleCreateSubmit}>
            <div className="form-group">
              <label className="form-label">
                Họ và tên<span className="required">*</span>
              </label>
              <input
                className="form-control"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Email<span className="required">*</span>
              </label>
              <input
                type="email"
                className="form-control"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Mật khẩu<span className="required">*</span>
              </label>
              <input
                type="password"
                className="form-control"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <div className="form-hint">Tối thiểu 8 ký tự</div>
            </div>
            <div className="form-group">
              <label className="form-label">Vai trò</label>
              <select className="form-control" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn-primary" type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Đang tạo...' : '➕ Tạo Tài Khoản'}
            </button>
          </form>
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 20 }}>
        <BackupCard />
        <AuditLogCard />
      </div>
    </div>
  );
}

function BackupCard() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data: backups, isLoading } = useBackups();

  const backupMutation = useMutation({
    mutationFn: triggerBackup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'backups'] });
      showToast('✅ Đã sao lưu dữ liệu.', 'success');
    },
    onError: (err) => {
      const message = err instanceof ApiError ? ((err.details as { error?: string })?.error ?? 'Sao lưu thất bại') : 'Sao lưu thất bại';
      showToast(message, 'error');
    },
  });

  return (
    <Card
      icon="🗄️"
      iconBg="#E1F5FE"
      title="Sao Lưu Dữ Liệu"
      extra={
        <button
          className="btn-secondary"
          style={{ marginLeft: 'auto' }}
          onClick={() => backupMutation.mutate()}
          disabled={backupMutation.isPending}
        >
          {backupMutation.isPending ? 'Đang sao lưu...' : '💾 Sao Lưu Ngay'}
        </button>
      }
    >
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
        Tự động sao lưu toàn bộ dữ liệu hằng ngày, giữ lại các bản gần nhất (bản cũ hơn thời hạn tự động xoá).
      </p>
      {isLoading ? (
        <p>Đang tải...</p>
      ) : (backups ?? []).length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có bản sao lưu nào.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tên tệp</th>
                <th>Dung lượng</th>
                <th>Thời điểm</th>
              </tr>
            </thead>
            <tbody>
              {(backups ?? []).map((b) => (
                <tr key={b.fileName}>
                  <td>{b.fileName}</td>
                  <td>{formatBytes(b.sizeBytes)}</td>
                  <td>{new Date(b.createdAt).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function AuditLogCard() {
  const { data: logs, isLoading } = useAuditLogs();

  return (
    <Card icon="📜" iconBg="#F3E5F5" title="Nhật Ký Thao Tác">
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
        200 thao tác ghi/sửa/xóa gần nhất trong hệ thống — bệnh nhân, người đại diện, tài khoản người dùng, thực phẩm, chuẩn tăng trưởng.
      </p>
      {isLoading ? (
        <p>Đang tải...</p>
      ) : (logs ?? []).length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có thao tác nào được ghi nhận.</p>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: 480, overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ whiteSpace: 'nowrap' }}>Thời gian</th>
                <th style={{ whiteSpace: 'nowrap' }}>Người thực hiện</th>
                <th style={{ whiteSpace: 'nowrap' }}>Hành động</th>
                <th>Mô tả</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map((l) => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(l.createdAt).toLocaleString('vi-VN')}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{l.userName}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{l.action}</td>
                  <td>{l.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function PendingApprovalCard({
  pendingUsers,
  onApprove,
  onReject,
  isBusy,
}: {
  pendingUsers: UserRecord[];
  onApprove: (u: UserRecord, role: Role) => void;
  onReject: (u: UserRecord) => void;
  isBusy: boolean;
}) {
  return (
    <Card icon="🕐" iconBg="#FFF8E1" title={`Đang Chờ Duyệt (${pendingUsers.length})`}>
      <InfoBox tone="warn">Nhân viên đã tự đăng ký tài khoản dưới đây — chọn đúng vai trò rồi duyệt để họ đăng nhập được, hoặc từ chối nếu không hợp lệ.</InfoBox>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {pendingUsers.map((u) => (
          <PendingUserRow key={u.id} user={u} onApprove={onApprove} onReject={onReject} isBusy={isBusy} />
        ))}
      </div>
    </Card>
  );
}

function PendingUserRow({
  user,
  onApprove,
  onReject,
  isBusy,
}: {
  user: UserRecord;
  onApprove: (u: UserRecord, role: Role) => void;
  onReject: (u: UserRecord) => void;
  isBusy: boolean;
}) {
  const [role, setRole] = useState<Role>(user.role);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        padding: '10px 12px',
        border: '1px solid var(--border)',
        borderRadius: 10,
      }}
    >
      <div style={{ flex: '1 1 200px' }}>
        <strong>{user.name}</strong>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user.email}</div>
      </div>
      <select className="form-control" style={{ minWidth: 150, width: 'auto' }} value={role} onChange={(e) => setRole(e.target.value as Role)}>
        {ROLE_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: 12 }} disabled={isBusy} onClick={() => onApprove(user, role)}>
        ✅ Duyệt
      </button>
      <button className="btn-danger" style={{ padding: '8px 14px', fontSize: 12 }} disabled={isBusy} onClick={() => onReject(user)}>
        ❌ Từ chối
      </button>
    </div>
  );
}
