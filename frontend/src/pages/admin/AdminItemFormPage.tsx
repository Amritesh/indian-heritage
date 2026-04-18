import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getItemById } from '@/entities/item/api/itemService';
import { createItem, updateItem, ItemFormData } from '@/entities/item/api/itemAdminService';
import { getAllCollectionsAdmin } from '@/entities/collection/api/collectionAdminService';
import { FormField } from '@/shared/ui/FormField';
import { MediaUploader } from '@/shared/ui/MediaUploader';

type MetadataField = 'type' | 'denomination' | 'rulerOrIssuer' | 'mintOrPlace' | 'seriesOrCatalog' | 'weightEstimate' | 'condition' | 'estimatedPriceInr';

const DEFAULT_FORM: ItemFormData = {
  title: '',
  subtitle: '',
  description: '',
  shortDescription: '',
  period: '',
  dateText: '',
  culture: '',
  location: '',
  imageUrl: '',
  imageAlt: '',
  materials: [],
  tags: [],
  notes: [],
  collectionId: '',
  collectionSlug: '',
  collectionName: '',
  metadata: {},
};

function TagInput({ label, values, onChange }: { label: string; values: string[]; onChange: (vals: string[]) => void }) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput('');
  };

  return (
    <div className="space-y-2">
      <label className="font-label text-xs font-bold uppercase tracking-wider text-outline">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Type and press Enter"
          className="flex-1 text-sm border border-outline-variant/30 rounded-lg px-3 py-2 bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
        />
        <button type="button" onClick={add} className="btn-secondary py-2 px-3">
          <span className="material-symbols-outlined text-lg">add</span>
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <span key={v} className="archival-chip flex items-center gap-1">
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="hover:text-error transition-colors"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminItemFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState<ItemFormData>(DEFAULT_FORM);
  const [error, setError] = useState('');

  const { data: existingItem } = useQuery({
    queryKey: ['item', id],
    queryFn: () => getItemById(id!),
    enabled: isEditing,
  });

  const { data: collections = [] } = useQuery({
    queryKey: ['admin', 'collections'],
    queryFn: getAllCollectionsAdmin,
  });

  useEffect(() => {
    if (existingItem) {
      setForm({
        title: existingItem.title,
        subtitle: existingItem.subtitle,
        description: existingItem.description,
        shortDescription: existingItem.shortDescription,
        period: existingItem.period,
        dateText: existingItem.dateText,
        culture: existingItem.culture,
        location: existingItem.location,
        imageUrl: existingItem.imageUrl,
        imageAlt: existingItem.imageAlt,
        materials: existingItem.materials,
        tags: existingItem.tags,
        notes: existingItem.notes,
        collectionId: existingItem.collectionId,
        collectionSlug: existingItem.collectionSlug,
        collectionName: existingItem.collectionName,
        metadata: existingItem.metadata,
      });
    }
  }, [existingItem]);

  const mutation = useMutation({
    mutationFn: () =>
      isEditing ? updateItem(id!, form) : createItem(form).then(() => {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'items'] });
      navigate('/admin/items');
    },
    onError: (err: Error) => setError(err.message),
  });

  function set<K extends keyof ItemFormData>(field: K, value: ItemFormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleCollectionChange(slug: string) {
    const col = collections.find((c) => c.slug === slug);
    if (col) {
      set('collectionSlug', col.slug);
      set('collectionId', col.id);
      set('collectionName', col.displayName);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.collectionSlug) { setError('Collection is required'); return; }
    setError('');
    mutation.mutate();
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <span className="eyebrow">{isEditing ? 'Edit Item' : 'New Item'}</span>
        <h1 className="mt-2 font-headline text-3xl font-bold text-on-surface">
          {isEditing ? (existingItem?.title ?? 'Edit Item') : 'New Archive Item'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="bg-error-container/30 text-error rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        {/* Basic Info */}
        <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 space-y-6">
          <h2 className="font-label text-xs font-bold uppercase tracking-[0.2em] text-primary border-b border-outline-variant/20 pb-4">
            Basic Information
          </h2>

          <div>
            <label className="font-label text-xs font-bold uppercase tracking-wider text-outline">Collection</label>
            <select
              value={form.collectionSlug}
              onChange={(e) => handleCollectionChange(e.target.value)}
              required
              className="mt-2 w-full text-sm border border-outline-variant/30 rounded-lg px-3 py-2 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select a collection…</option>
              {collections.map((c) => (
                <option key={c.id} value={c.slug}>{c.displayName}</option>
              ))}
            </select>
          </div>

          <FormField
            label="Title"
            required
            value={form.title}
            onChange={(e) => set('title', (e.target as HTMLInputElement).value)}
            placeholder="Gold Mohur of Akbar"
          />

          <FormField
            label="Subtitle"
            value={form.subtitle}
            onChange={(e) => set('subtitle', (e.target as HTMLInputElement).value)}
            placeholder="Mughal Empire, ca. 1560"
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Period"
              value={form.period}
              onChange={(e) => set('period', (e.target as HTMLInputElement).value)}
              placeholder="1556–1605 CE"
            />
            <FormField
              label="Date Text"
              value={form.dateText}
              onChange={(e) => set('dateText', (e.target as HTMLInputElement).value)}
              placeholder="ca. 1560"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Culture"
              value={form.culture}
              onChange={(e) => set('culture', (e.target as HTMLInputElement).value)}
              placeholder="Mughal"
            />
            <FormField
              label="Location / Mint"
              value={form.location}
              onChange={(e) => set('location', (e.target as HTMLInputElement).value)}
              placeholder="Agra Mint"
            />
          </div>
        </div>

        {/* Description */}
        <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 space-y-6">
          <h2 className="font-label text-xs font-bold uppercase tracking-[0.2em] text-primary border-b border-outline-variant/20 pb-4">
            Descriptions
          </h2>

          <FormField
            label="Short Description"
            as="textarea"
            value={form.shortDescription}
            onChange={(e) => set('shortDescription', (e.target as HTMLTextAreaElement).value)}
            placeholder="One or two sentence summary"
          />

          <FormField
            label="Full Description"
            as="textarea"
            value={form.description}
            onChange={(e) => set('description', (e.target as HTMLTextAreaElement).value)}
            placeholder="Detailed scholarly description of the artifact…"
          />
        </div>

        {/* Media */}
        <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 space-y-6">
          <h2 className="font-label text-xs font-bold uppercase tracking-[0.2em] text-primary border-b border-outline-variant/20 pb-4">
            Primary Image
          </h2>
          <MediaUploader
            value={form.imageUrl}
            onChange={(url) => set('imageUrl', url)}
            storagePath={`uploads/items/${form.collectionSlug || 'uncategorized'}`}
          />
          <FormField
            label="Image Alt Text"
            value={form.imageAlt}
            onChange={(e) => set('imageAlt', (e.target as HTMLInputElement).value)}
            placeholder="Descriptive alt text for accessibility"
          />
        </div>

        {/* Classification */}
        <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 space-y-6">
          <h2 className="font-label text-xs font-bold uppercase tracking-[0.2em] text-primary border-b border-outline-variant/20 pb-4">
            Classification
          </h2>
          <TagInput label="Materials" values={form.materials} onChange={(v) => set('materials', v)} />
          <TagInput label="Tags" values={form.tags} onChange={(v) => set('tags', v)} />
        </div>

        {/* Metadata */}
        <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 space-y-6">
          <h2 className="font-label text-xs font-bold uppercase tracking-[0.2em] text-primary border-b border-outline-variant/20 pb-4">
            Metadata
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {(
              [
                ['type', 'Type', 'Coin, Manuscript…'],
                ['denomination', 'Denomination', 'Mohur, Rupee…'],
                ['rulerOrIssuer', 'Ruler / Issuer', 'Akbar, EIC…'],
                ['mintOrPlace', 'Mint / Place', 'Agra, Bombay…'],
                ['seriesOrCatalog', 'Series / Catalog', 'KM #123'],
                ['weightEstimate', 'Weight', '10.9g'],
                ['condition', 'Condition', 'VF, EF…'],
                ['estimatedPriceInr', 'Est. Price (INR)', '₹45,000'],
              ] as [MetadataField, string, string][]
            ).map(([field, label, placeholder]) => (
              <FormField
                key={field}
                label={label}
                value={String(form.metadata?.[field] ?? '')}
                onChange={(e) =>
                  set('metadata', { ...form.metadata, [field]: (e.target as HTMLInputElement).value })
                }
                placeholder={placeholder}
              />
            ))}
          </div>
        </div>

        {/* Scholar Notes */}
        <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 space-y-6">
          <h2 className="font-label text-xs font-bold uppercase tracking-[0.2em] text-primary border-b border-outline-variant/20 pb-4">
            Scholarly Notes
          </h2>
          <TagInput label="Notes" values={form.notes} onChange={(v) => set('notes', v)} />
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/admin/items')} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary disabled:opacity-50">
            {mutation.isPending ? (
              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">save</span>
                {isEditing ? 'Save Changes' : 'Create Item'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
