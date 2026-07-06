import type { ReactNode } from 'react';

interface CardProps {
  icon: ReactNode;
  iconBg: string;
  title: string;
  children: ReactNode;
  headerAccent?: boolean;
  extra?: ReactNode;
}

export function Card({ icon, iconBg, title, children, headerAccent, extra }: CardProps) {
  return (
    <div className="card">
      <div
        className="card-header"
        style={
          headerAccent
            ? { background: 'linear-gradient(135deg,var(--primary-dark),var(--primary))', color: 'white', borderBottom: 'none' }
            : undefined
        }
      >
        <div className="icon" style={{ background: headerAccent ? 'rgba(255,255,255,0.15)' : iconBg }}>
          {icon}
        </div>
        <h3 style={headerAccent ? { color: 'white' } : undefined}>{title}</h3>
        {extra}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}
