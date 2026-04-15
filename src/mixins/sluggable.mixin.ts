import "reflect-metadata";
import { SLUGGABLE_METADATA_KEY } from "../sluggable.constants";
import { SluggableService } from "../sluggable.service";
import { SluggableNotInitializedException } from "../exceptions/sluggable-not-initialized.exception";

type Constructor<T = object> = new (...args: any[]) => T;

export interface SluggableMixinEntity {
  getSlug(): string;
  getSlugField(): string;
  findBySlug(slug: string): Promise<any | null>;
  regenerateSlug(): Promise<string>;
}

function getService(): SluggableService {
  const service = SluggableService.getInstance();
  if (!service) {
    throw new SluggableNotInitializedException();
  }
  return service;
}

export function SluggableMixin<TBase extends Constructor>(Base: TBase) {
  class SluggableEntityClass extends Base implements SluggableMixinEntity {
    getSlug(): string {
      const meta = Reflect.getMetadata(
        SLUGGABLE_METADATA_KEY,
        this.constructor,
      );
      const slugField = meta?.slugField ?? "slug";
      return (this as any)[slugField] ?? "";
    }

    getSlugField(): string {
      const meta = Reflect.getMetadata(
        SLUGGABLE_METADATA_KEY,
        this.constructor,
      );
      return meta?.slugField ?? "slug";
    }

    async findBySlug(slug: string): Promise<any | null> {
      const service = getService();
      const slugField = this.getSlugField();
      return service.findBySlug(this.constructor as any, slugField, slug);
    }

    async regenerateSlug(): Promise<string> {
      const service = getService();
      const meta = Reflect.getMetadata(
        SLUGGABLE_METADATA_KEY,
        this.constructor,
      );
      const from: string[] = meta?.from ?? [];
      const slugField = meta?.slugField ?? "slug";
      const newSlug = await service.regenerateSlug(this, from, slugField, {
        separator: meta?.separator,
        maxLength: meta?.maxLength,
      });
      (this as any)[slugField] = newSlug;
      return newSlug;
    }
  }

  return SluggableEntityClass;
}
