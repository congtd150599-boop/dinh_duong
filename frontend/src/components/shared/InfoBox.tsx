import type { ReactNode } from 'react';

type InfoBoxTone = 'info' | 'warn' | 'danger' | 'success';

const TONE_ICON: Record<InfoBoxTone, string> = {
  info: 'ℹ️',
  warn: '⚠️',
  danger: '🚨',
  success: '✅',
};

export function InfoBox({ tone, icon, children }: { tone: InfoBoxTone; icon?: string; children: ReactNode }) {
  return (
    <div className={`info-box ${tone}`}>
      <span>{icon ?? TONE_ICON[tone]}</span>
      <p>{children}</p>
    </div>
  );
}
