import type { ReactNode } from 'react';

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function SectionHeader({ eyebrow, title, description, action }: SectionHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl space-y-3">
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="font-headline text-3xl font-bold leading-tight text-on-surface sm:text-4xl">
          {title}
        </h2>
        {description && (
          <p className="text-base leading-relaxed text-on-surface-variant">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
