import { ImgHTMLAttributes, useState } from 'react';
import { cn } from '@/shared/lib/cn';

type ImageWithFallbackProps = ImgHTMLAttributes<HTMLImageElement> & {
  wrapperClassName?: string;
  objectFit?: 'cover' | 'contain';
};

export function ImageWithFallback({
  alt,
  className,
  wrapperClassName,
  objectFit = 'contain',
  ...props
}: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !props.src) {
    return (
      <div
        className={cn(
          'flex h-full min-h-48 w-full items-center justify-center bg-surface-container-low text-outline',
          wrapperClassName,
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-2xl">image_not_supported</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Image unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <img
      alt={alt}
      className={cn(
        'h-full w-full',
        objectFit === 'contain' ? 'object-contain' : 'object-cover',
        className,
      )}
      onError={() => setFailed(true)}
      loading="lazy"
      {...props}
    />
  );
}
