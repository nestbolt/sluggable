import "reflect-metadata";
import { SLUGGABLE_METADATA_KEY } from "../sluggable.constants";

export interface SluggableOptions {
  /** Source field(s) to generate slug from. Can be a single field name or array. */
  from: string | string[];
  /** Target field to store the slug. Default: 'slug' */
  slugField?: string;
  /** Override separator for this entity. */
  separator?: string;
  /** Override max length for this entity. */
  maxLength?: number;
  /** Override onUpdate for this entity. 'keep' preserves original, 'regenerate' creates new slug. */
  onUpdate?: "regenerate" | "keep";
  /** Whether to generate unique slug with collision handling. Default: true */
  unique?: boolean;
}

export function Sluggable(options: SluggableOptions): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(
      SLUGGABLE_METADATA_KEY,
      {
        from: Array.isArray(options.from) ? options.from : [options.from],
        slugField: options.slugField ?? "slug",
        separator: options.separator,
        maxLength: options.maxLength,
        onUpdate: options.onUpdate,
        unique: options.unique ?? true,
      },
      target,
    );
  };
}
