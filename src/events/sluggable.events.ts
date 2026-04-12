export const SLUGGABLE_EVENTS = {
  SLUG_GENERATED: "sluggable.slug-generated",
  SLUG_REGENERATED: "sluggable.slug-regenerated",
} as const;

export interface SlugGeneratedEvent {
  entity: any;
  slug: string;
  sourceFields: string[];
  sourceText: string;
}

export interface SlugRegeneratedEvent {
  entity: any;
  oldSlug: string;
  newSlug: string;
  sourceFields: string[];
}
