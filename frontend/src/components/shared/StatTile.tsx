export function StatTile({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
          {sub && <span style={{ fontSize: 13, fontWeight: 600, color: color ?? 'var(--text-secondary)' }}>{sub}</span>}
        </div>
      </div>
    </div>
  );
}
