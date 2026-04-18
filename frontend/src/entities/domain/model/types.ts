export type DomainRecord = {
  id: string;
  canonicalId: string;
  slug: string;
  name: string;
  description: string;
  heroImagePath?: string | null;
  sortOrder: number;
};
