import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllCollectionsAdmin,
  createCollection,
  updateCollection,
  CollectionFormData,
} from '@/entities/collection/api/collectionAdminService';
import { FormField } from '@/shared/ui/FormField';

const DEFAULT_FORM: CollectionFormData = {
  name: '',
  displayName: '',
  slug: '',
  description: '',
  longDescription: '',
  heroEyebrow: '',
  culture: '',
  periodLabel: '',
  sourceUrl: '',
  heroImage: '',
  thumbnailImage: '',
  sortOrder: 0,
  enabled: true,
};

export function AdminCollectionFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState<CollectionFormData>(DEFAULT_FORM);
  const [error, setError] = useState('');

  const { data: collections = [] } = useQuery({
    queryKey: ['admin', 'collections'],
    queryFn: getAllCollectionsAdmin,
    enabled: isEditing,
  });

  useEffect(() => {
    if (isEditing && collections.length > 0) {
      const col = collections.find((c) => c.id === id);
      if (col) {
        setForm({
          name: col.name,
          displayName: col.displayName,
          slug: col.slug,
          description: col.description,
          longDescription: col.longDescription,
          heroEyebrow: col.heroEyebrow,
          culture: col.culture,
          periodLabel: col.periodLabel,
          sourceUrl: col.sourceUrl,
          heroImage: col.heroImage,
          thumbnailImage: col.thumbnailImage,
          sortOrder: col.sortOrder,
          enabled: col.enabled,
        });
      }
    }
  }, [isEditing, collections, id]);

  const mutation = useMutation({
    mutationFn: () =>
      isEditing ? updateCollection(id!, form) : createCollection(form).then(() => {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'collections'] });
      navigate('/admin/collections');
    },
    onError: (err: Error) => setError(err.message),
  });

  function set(field: keyof CollectionFormData, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      setError('Name and slug are required');
      return;
    }
    setError('');
    mutation.mutate();
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <span className="eyebrow">{isEditing ? 'Edit' : 'New'}</span>
        <h1 className="mt-2 font-headline text-3xl font-bold text-on-surface">
          {isEditing ? 'Edit Collection' : 'New Collection'}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 space-y-6"
      >
        <h2 className="font-label text-xs font-bold uppercase tracking-[0.2em] text-primary border-b border-outline-variant/20 pb-4">
          Collection Details
        </h2>

        {error && (
          <div className="bg-error-container/30 text-error rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Internal Name"
            required
            value={form.name}
            onChange={(e) => set('name', (e.target as HTMLInputElement).value)}
            placeholder="british-museum"
          />
          <FormField
            label="Display Name"
            required
            value={form.displayName}
            onChange={(e) => set('displayName', (e.target as HTMLInputElement).value)}
            placeholder="British Museum Collection"
          />
        </div>

        <FormField
          label="URL Slug"
          required
          value={form.slug}
          onChange={(e) => set('slug', (e.target as HTMLInputElement).value)}
          placeholder="british-museum"
          hint="Used in URLs: /collections/[slug]"
        />

        <FormField
          label="Short Description"
          required
          as="textarea"
          value={form.description}
          onChange={(e) => set('description', (e.target as HTMLTextAreaElement).value)}
          placeholder="A brief description of the collection"
        />

        <FormField
          label="Long Description"
          as="textarea"
          value={form.longDescription}
          onChange={(e) => set('longDescription', (e.target as HTMLTextAreaElement).value)}
          placeholder="Extended scholarly description"
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Hero Eyebrow"
            value={form.heroEyebrow}
            onChange={(e) => set('heroEyebrow', (e.target as HTMLInputElement).value)}
            placeholder="The British Museum"
          />
          <FormField
            label="Culture"
            value={form.culture}
            onChange={(e) => set('culture', (e.target as HTMLInputElement).value)}
            placeholder="Indian"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Period Label"
            value={form.periodLabel}
            onChange={(e) => set('periodLabel', (e.target as HTMLInputElement).value)}
            placeholder="1600–1900 CE"
          />
          <FormField
            label="Sort Order"
            type="number"
            value={String(form.sortOrder)}
            onChange={(e) => set('sortOrder', Number((e.target as HTMLInputElement).value))}
          />
        </div>

        <FormField
          label="Hero Image URL"
          type="url"
          value={form.heroImage}
          onChange={(e) => set('heroImage', (e.target as HTMLInputElement).value)}
          placeholder="https://..."
        />

        <FormField
          label="Thumbnail Image URL"
          type="url"
          value={form.thumbnailImage}
          onChange={(e) => set('thumbnailImage', (e.target as HTMLInputElement).value)}
          placeholder="https://..."
          hint="Falls back to hero image if empty"
        />

        <FormField
          label="Source API URL"
          type="url"
          value={form.sourceUrl}
          onChange={(e) => set('sourceUrl', (e.target as HTMLInputElement).value)}
          placeholder="https://api.example.com/collection"
        />

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="enabled"
            checked={form.enabled}
            onChange={(e) => set('enabled', e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <label htmlFor="enabled" className="text-sm font-semibold text-on-surface">
            Enabled (visible in public gallery)
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
          <button type="button" onClick={() => navigate('/admin/collections')} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary disabled:opacity-50">
            {mutation.isPending ? (
              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">save</span>
                {isEditing ? 'Save Changes' : 'Create Collection'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
