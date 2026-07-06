import type { Role, UserRecord } from '@dinhduong/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { createUser, listUsers, resetPassword, updateUser, type CreateUserInput } from '../../api/users';
import { ApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../shared/Card';
import { useToast } from '../shared/ToastContext';

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Quản trị viên',
  bac_si: 'Bác sĩ',
  dieu_duong: 'Điều dưỡng',
};

const ROLE_OPTIONS: Role[] = ['admin', 'bac_si', 'dieu_duong'];

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
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateUser>[1] }) => updateUser(id, input),
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
    const action = u.isActive ? 'vô hiệu hóa' : 'kích hoạt lại';
    if (!confirm(`Xác nhận ${action} tài khoản "${u.name}"?`)) return;
    updateMutation.mutate({ id: u.id, input: { isActive: !u.isActive } });
  }

  function handleResetPassword(u: UserRecord) {
    const newPassword = prompt(`Nhập mật khẩu mới cho "${u.name}" (tối thiểu 8 ký tự):`);
    if (!newPassword) return;
    resetPassword(u.id, newPassword)
      .then(() => showToast('✅ Đã đặt lại mật khẩu.', 'success'))
      .catch((err) => showToast(errorMessage(err, 'Đặt lại mật khẩu thất bại'), 'error'));
  }

  return (
    <div>
      <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 4 }}>
        👤 Quản Lý Người Dùng
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        Tạo tài khoản, phân quyền, vô hiệu hóa/kích hoạt và đặt lại mật khẩu cho nhân viên phòng khám.
      </p>

      <div className="grid-2" style={{ gap: 20, alignItems: 'start' }}>
        <Card icon="📋" iconBg="#E3F2FD" title="Danh sách người dùng">
          {isLoading ? (
            <p>Đang tải...</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tên</th>
                    <th>Email</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(users ?? []).map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <select
                          className="form-control"
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
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: u.isActive ? 'var(--success-light)' : 'var(--surface-2)',
                            color: u.isActive ? 'var(--success)' : 'var(--text-muted)',
                          }}
                        >
                          {u.isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-secondary" onClick={() => handleResetPassword(u)}>
                            🔑 Đặt lại mật khẩu
                          </button>
                          <button
                            className={u.isActive ? 'btn-danger' : 'btn-secondary'}
                            disabled={u.id === me?.id}
                            onClick={() => handleToggleActive(u)}
                          >
                            {u.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
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
    </div>
  );
}
