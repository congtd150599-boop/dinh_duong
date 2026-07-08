import { FOOD_CATEGORIES, FOOD_CONDITION_TAGS, type FoodCategory, type FoodConditionTag, type FoodRecord } from '@dinhduong/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { ApiError } from '../../api/client';
import {
  createFood,
  deleteFood,
  foodsExportUrl,
  importFoodsCsv,
  listFoods,
  updateFood,
  type CreateFoodInput,
} from '../../api/foods';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../shared/Card';
import { InfoBox } from '../shared/InfoBox';
import { useToast } from '../shared/ToastContext';

const emptyForm: CreateFoodInput = {
  name: '',
  category: 'Khác',
  kcalPer100: 0,
  proteinPer100: 0,
  carbPer100: 0,
  fatPer100: 0,
  costPer100: null,
  preferenceScore: 3,
  benefits: '',
  cautionNote: '',
  conditionTags: [],
  source: '',
};

function toForm(food: FoodRecord): CreateFoodInput {
  return {
    name: food.name,
    category: food.category,
    kcalPer100: food.kcalPer100,
    proteinPer100: food.proteinPer100,
    carbPer100: food.carbPer100,
    fatPer100: food.fatPer100,
    costPer100: food.costPer100,
    preferenceScore: food.preferenceScore,
    benefits: food.benefits ?? '',
    cautionNote: food.cautionNote ?? '',
    conditionTags: food.conditionTags,
    source: food.source ?? '',
  };
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const details = err.details as { error?: string } | undefined;
    return details?.error ?? fallback;
  }
  return fallback;
}

export function FoodsTab() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'bac_si';
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data: foods, isLoading } = useQuery({ queryKey: ['foods'], queryFn: listFoods });

  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateFoodInput>(emptyForm);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (input: CreateFoodInput) => createFood(input),
    onSuccess: () => {
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ['foods'] });
      showToast('✅ Đã thêm thực phẩm mới!', 'success');
    },
    onError: (err) => showToast(errorMessage(err, 'Thêm thực phẩm thất bại'), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateFoodInput }) => updateFood(id, input),
    onSuccess: () => {
      setForm(emptyForm);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['foods'] });
      showToast('✅ Đã cập nhật thực phẩm!', 'success');
    },
    onError: (err) => showToast(errorMessage(err, 'Cập nhật thất bại'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFood(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] });
      showToast('🗑️ Đã xoá thực phẩm.', 'success');
    },
    onError: (err) => showToast(errorMessage(err, 'Xoá thất bại'), 'error'),
  });

  const importMutation = useMutation({
    mutationFn: (csvText: string) => importFoodsCsv(csvText),
    onSuccess: (result) => {
      setImportError(null);
      setPendingFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['foods'] });
      showToast(`✅ Đã nhập/cập nhật ${result.imported} thực phẩm!`, 'success');
    },
    onError: (err) => {
      const details = err instanceof ApiError ? (err.details as { error?: string; lineNumber?: number } | undefined) : undefined;
      const message = details?.error ?? (err instanceof Error ? err.message : 'Lỗi không xác định');
      setImportError(details?.lineNumber ? `${message} (dòng ${details.lineNumber})` : message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, input: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function handleEdit(food: FoodRecord) {
    setEditingId(food.id);
    setForm(toForm(food));
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleDelete(food: FoodRecord) {
    if (!confirm(`Xoá thực phẩm "${food.name}"? Hành động này không thể hoàn tác.`)) return;
    deleteMutation.mutate(food.id);
  }

  function toggleConditionTag(tag: FoodConditionTag) {
    const current = form.conditionTags ?? [];
    setForm({
      ...form,
      conditionTags: current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    });
  }

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
    file.text().then((text) => importMutation.mutate(text));
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return foods ?? [];
    return (foods ?? []).filter((f) => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q));
  }, [foods, search]);

  return (
    <div>
      <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 4 }}>
        🍎 Danh Sách Thực Phẩm
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        Tra cứu công dụng, năng lượng và lưu ý/chống chỉ định theo bệnh lý cho từng loại thực phẩm. Các thực phẩm đánh dấu "Hệ thống" dùng để sinh
        thực đơn tuần — sửa số liệu sẽ ảnh hưởng ngay tới thực đơn được đề xuất.
      </p>

      <Card
        icon="📋"
        iconBg="#E3F2FD"
        title="Danh sách thực phẩm"
        extra={
          <input
            className="form-control card-header-search"
            style={{ maxWidth: 240, marginLeft: 'auto' }}
            placeholder="Tìm theo tên hoặc nhóm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
      >
        {isLoading ? (
          <p>Đang tải...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Nhóm</th>
                  <th>Năng lượng</th>
                  <th>Chi phí/100g</th>
                  <th>Ưa thích</th>
                  <th>Lưu ý</th>
                  <th>Công dụng</th>
                  {canEdit && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id}>
                    <td>
                      {f.name}
                      {f.isSystemDefault && (
                        <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-muted)' }} title="Dùng để sinh thực đơn tuần">
                          🔒 Hệ thống
                        </span>
                      )}
                    </td>
                    <td>{f.category}</td>
                    <td>{f.kcalPer100} kcal/100g</td>
                    <td>{f.costPer100 != null ? `${f.costPer100.toLocaleString('vi-VN')}đ` : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td>{'⭐'.repeat(f.preferenceScore)}</td>
                    <td>
                      {f.conditionTags.length === 0 ? (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {f.conditionTags.map((tag) => (
                            <span
                              key={tag}
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: 6,
                                background: 'var(--warning-light)',
                                color: 'var(--warning)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ maxWidth: 220 }}>
                      <span
                        title={f.benefits ?? ''}
                        style={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: f.benefits ? 'var(--text-secondary)' : 'var(--text-muted)',
                        }}
                      >
                        {f.benefits || '—'}
                      </span>
                    </td>
                    {canEdit && (
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-secondary" onClick={() => handleEdit(f)}>
                            ✏️ Sửa
                          </button>
                          {!f.isSystemDefault && (
                            <button className="btn-danger" onClick={() => handleDelete(f)}>
                              🗑️ Xoá
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={canEdit ? 8 : 7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      Không có thực phẩm nào khớp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <a className="btn-secondary" href={foodsExportUrl()} style={{ textDecoration: 'none', display: 'inline-block' }}>
            📥 Tải xuống CSV
          </a>
        </div>
      </Card>

      {canEdit && (
        <div className="grid-2" style={{ gap: 20, alignItems: 'start', marginTop: 20 }}>
          <Card icon={editingId ? '✏️' : '➕'} iconBg="#FFF3E0" title={editingId ? 'Sửa Thực Phẩm' : 'Thêm Thực Phẩm Mới'}>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">
                  Tên thực phẩm<span className="required">*</span>
                </label>
                <input className="form-control" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Nhóm</label>
                <select
                  className="form-control"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as FoodCategory })}
                >
                  {FOOD_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid-2" style={{ gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">
                    Năng lượng (kcal/100g)<span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    required
                    value={form.kcalPer100}
                    onChange={(e) => setForm({ ...form, kcalPer100: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Đạm (g/100g)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    value={form.proteinPer100}
                    onChange={(e) => setForm({ ...form, proteinPer100: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tinh bột (g/100g)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    value={form.carbPer100}
                    onChange={(e) => setForm({ ...form, carbPer100: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Chất béo (g/100g)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    value={form.fatPer100}
                    onChange={(e) => setForm({ ...form, fatPer100: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid-2" style={{ gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Chi phí (đ/100g)</label>
                  <input
                    type="number"
                    step="100"
                    min="0"
                    className="form-control"
                    placeholder="Chưa có giá"
                    value={form.costPer100 ?? ''}
                    onChange={(e) => setForm({ ...form, costPer100: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                  <div className="form-hint">Để trống nếu chưa rõ giá — thực đơn sẽ không bị ảnh hưởng bởi chi phí.</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Mức độ ưa thích</label>
                  <select
                    className="form-control"
                    value={form.preferenceScore ?? 3}
                    onChange={(e) => setForm({ ...form, preferenceScore: Number(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {'⭐'.repeat(n)} ({n})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Công dụng / tác dụng dinh dưỡng</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={form.benefits ?? ''}
                  onChange={(e) => setForm({ ...form, benefits: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Lưu ý theo bệnh lý (chọn các nhóm liên quan)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {FOOD_CONDITION_TAGS.map((tag) => (
                    <label key={tag} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                      <input type="checkbox" checked={(form.conditionTags ?? []).includes(tag)} onChange={() => toggleConditionTag(tag)} />
                      {tag}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Ghi chú lưu ý khác (tự do)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={form.cautionNote ?? ''}
                  onChange={(e) => setForm({ ...form, cautionNote: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nguồn tham khảo</label>
                <input className="form-control" value={form.source ?? ''} onChange={(e) => setForm({ ...form, source: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId
                    ? updateMutation.isPending
                      ? 'Đang lưu...'
                      : '💾 Lưu Thay Đổi'
                    : createMutation.isPending
                      ? 'Đang thêm...'
                      : '➕ Thêm Thực Phẩm'}
                </button>
                {editingId && (
                  <button type="button" className="btn-secondary" onClick={handleCancelEdit}>
                    Hủy
                  </button>
                )}
              </div>
            </form>
          </Card>

          <Card icon="📤" iconBg="#E8F5E9" title="Nhập Dữ Liệu Hàng Loạt (CSV)">
            <InfoBox tone="info">
              Nhập CSV sẽ <strong>cập nhật</strong> thực phẩm trùng tên và <strong>thêm mới</strong> thực phẩm chưa có — không xoá dữ liệu hiện có.
              Cột bắt buộc theo thứ tự:{' '}
              <code>
                name,category,kcalPer100,proteinPer100,carbPer100,fatPer100,costPer100,preferenceScore,benefits,cautionNote,conditionTags,source
              </code>
              . Cột <code>conditionTags</code> nhiều giá trị cách nhau bởi dấu <code>|</code>, ví dụ <code>"Tiểu đường|Gout"</code>. Cột{' '}
              <code>costPer100</code> để trống nếu chưa có giá; <code>preferenceScore</code> từ 1-5 (để trống = mặc định 3).
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
      )}
    </div>
  );
}
