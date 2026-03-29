import { ReactNode } from 'react';

type StatePanelProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  tone?: 'default' | 'error';
  icon?: string;
};

export function StatePanel({
  eyebrow,
  title,
  description,
  children,
  tone = 'default',
  icon,
}: StatePanelProps) {
  return (
    <div
      className={
        tone === 'error'
          ? 'bg-error-container/30 border border-error/10 rounded-xl px-6 py-8'
          : 'bg-surface-container-lowest border border-outline-variant/10 rounded-xl flex flex-col items-center px-6 py-16 text-center'
      }
    >
      {icon && (
        <span className="material-symbols-outlined text-4xl text-outline mb-4">{icon}</span>
      )}
      <div className={tone === 'error' ? 'eyebrow text-error' : 'eyebrow'}>{eyebrow}</div>
      <h3 className="mt-3 font-headline text-3xl font-bold text-on-surface">{title}</h3>
      <p className="mt-4 max-w-2xl leading-relaxed text-on-surface-variant">{description}</p>
      {children && <div className="mt-8">{children}</div>}
    </div>
  );
}
