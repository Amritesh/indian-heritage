type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-on-surface/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface-container-lowest rounded-xl shadow-ambient p-8 max-w-md w-full mx-4 space-y-6">
        <div>
          <h3 className="font-headline text-xl font-bold text-on-surface">{title}</h3>
          <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">{message}</p>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn-secondary text-sm px-4 py-2">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={
              destructive
                ? 'inline-flex items-center gap-2 bg-error text-on-error px-4 py-2 rounded-md font-label text-sm font-semibold hover:brightness-110 transition-all'
                : 'btn-primary text-sm px-4 py-2'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
