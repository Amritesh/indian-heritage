import { type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

type BaseProps = {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
};

type InputFieldProps = BaseProps & InputHTMLAttributes<HTMLInputElement> & { as?: 'input' };
type TextareaFieldProps = BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { as: 'textarea' };
type SelectFieldProps = BaseProps & SelectHTMLAttributes<HTMLSelectElement> & { as: 'select'; children: ReactNode };

type FormFieldProps = InputFieldProps | TextareaFieldProps | SelectFieldProps;

export function FormField(props: FormFieldProps) {
  const { label, error, hint, required, as = 'input', ...rest } = props;

  const inputClasses = cn(
    'w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg text-sm font-body',
    'focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors',
    'placeholder:text-outline/50',
    error && 'border-error focus:ring-error/20',
  );

  return (
    <label className="block space-y-2">
      <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </span>
      {as === 'textarea' ? (
        <textarea
          className={cn(inputClasses, 'min-h-[100px] resize-y')}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : as === 'select' ? (
        <select className={inputClasses} {...(rest as SelectHTMLAttributes<HTMLSelectElement>)}>
          {(props as SelectFieldProps).children}
        </select>
      ) : (
        <input className={cn(inputClasses, 'py-2.5 px-3')} {...(rest as InputHTMLAttributes<HTMLInputElement>)} />
      )}
      {error && <p className="text-xs text-error font-medium">{error}</p>}
      {hint && !error && <p className="text-xs text-outline">{hint}</p>}
    </label>
  );
}
