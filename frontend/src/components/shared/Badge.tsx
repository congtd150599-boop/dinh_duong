const STATUS_BADGE_CLASS: Record<string, string> = {
  'Bình thường': 'badge-normal',
  'Nhẹ cân': 'badge-warn',
  'Nhẹ cân nặng': 'badge-danger',
  'Thấp còi': 'badge-info',
  'Thấp còi nặng': 'badge-danger',
  'Cao hơn chuẩn': 'badge-info',
  'Thừa cân': 'badge-warn',
  'Béo phì': 'badge-obesity',
  'Suy dinh dưỡng cấp': 'badge-danger',
  'SDD cấp nặng': 'badge-danger',
  'Không áp dụng (>5 Tuổi)': 'badge-info',
};

/** Same classification → badge-color mapping used throughout legacy/index.html. */
export function classifyBadgeClass(status: string): string {
  if (STATUS_BADGE_CLASS[status]) return STATUS_BADGE_CLASS[status];
  if (status.includes('nặng')) return 'badge-danger';
  if (status.includes('Nhẹ cân') || status.includes('Thấp còi') || status.includes('SDD')) return 'badge-warn';
  if (status.includes('Thừa') || status.includes('Béo')) return 'badge-obesity';
  return 'badge-normal';
}

/** `status` drives the color classification; `label` (default: status) is the displayed text. */
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <span className={`badge ${classifyBadgeClass(status)}`}>{label ?? status}</span>;
}
