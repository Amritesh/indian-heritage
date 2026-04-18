import { useState, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/shared/config/firebase';
import { cn } from '@/shared/lib/cn';

type MediaUploaderProps = {
  value: string;
  onChange: (url: string) => void;
  storagePath?: string;
  label?: string;
  accept?: string;
};

export function MediaUploader({
  value,
  onChange,
  storagePath = 'uploads',
  label = 'Image',
  accept = 'image/*',
}: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!storage) {
      setError('Storage not configured');
      return;
    }
    setUploading(true);
    setError('');
    setProgress(0);

    const path = `${storagePath}/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file);

    task.on(
      'state_changed',
      (snapshot) => {
        setProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
      },
      (err) => {
        setError(err.message);
        setUploading(false);
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        onChange(url);
        setUploading(false);
      },
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="space-y-3">
      <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">
        {label}
      </span>

      {value && (
        <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-outline-variant/20 group">
          <img src={value} alt="Preview" className="w-full h-full object-cover" />
          <button
            onClick={() => onChange('')}
            className="absolute inset-0 bg-on-surface/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      <div className="flex gap-3">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste image URL or upload..."
          className="flex-1 bg-surface-container-lowest border border-outline-variant/20 rounded-lg text-sm py-2 px-3 focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            'btn-secondary text-xs px-3 py-2 shrink-0',
            uploading && 'opacity-50 cursor-not-allowed',
          )}
        >
          <span className="material-symbols-outlined text-sm">upload</span>
          {uploading ? `${progress}%` : 'Upload'}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
