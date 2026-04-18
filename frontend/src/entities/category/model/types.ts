export type CategoryRecord = {
  id: string;
  canonicalId: string;
  slug: string;
  title: string;
  summary: string;
  heroImagePath?: string | null;
  itemCount: number;
  status: string;
  pageType: string;
  sourceKind: string;
};
