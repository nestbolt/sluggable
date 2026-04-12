import "reflect-metadata";
import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
  DataSource,
} from "typeorm";
import { SLUGGABLE_METADATA_KEY } from "./sluggable.constants";
import { SluggableService } from "./sluggable.service";
import { SLUGGABLE_EVENTS } from "./events/sluggable.events";

interface SluggableMetadata {
  from: string[];
  slugField: string;
  separator?: string;
  maxLength?: number;
  onUpdate?: "regenerate" | "keep";
  unique: boolean;
}

@EventSubscriber()
export class SluggableSubscriber implements EntitySubscriberInterface {
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  async beforeInsert(event: InsertEvent<any>): Promise<void> {
    if (!event.entity) return;

    const meta = this.getMetadata(event.entity);
    if (!meta) return;

    const service = SluggableService.getInstance();
    if (!service) return;

    // Skip if slug is already set manually
    if (event.entity[meta.slugField]) return;

    const sourceText = meta.from
      .map((field) => event.entity[field])
      .filter(Boolean)
      .join(" ");

    if (!sourceText) return;

    const baseSlug = service.generateSlug(sourceText, {
      separator: meta.separator,
      maxLength: meta.maxLength,
    });

    let finalSlug = baseSlug;
    if (meta.unique) {
      finalSlug = await service.generateUniqueSlug(
        event.entity.constructor,
        meta.slugField,
        baseSlug,
      );
    }

    event.entity[meta.slugField] = finalSlug;

    this.emit(service, SLUGGABLE_EVENTS.SLUG_GENERATED, {
      entity: event.entity,
      slug: finalSlug,
      sourceFields: meta.from,
      sourceText,
    });
  }

  async beforeUpdate(event: UpdateEvent<any>): Promise<void> {
    if (!event.entity) return;

    const meta = this.getMetadata(event.entity);
    if (!meta) return;

    const service = SluggableService.getInstance();
    if (!service) return;

    const options = service.getOptions();
    const onUpdate = meta.onUpdate ?? options.onUpdate ?? "keep";

    // If "keep" and entity already has a slug, skip
    if (onUpdate === "keep" && event.entity[meta.slugField]) return;

    // Check if any source field has changed
    if (event.databaseEntity && onUpdate === "regenerate") {
      const hasChanged = meta.from.some(
        (field) => event.entity![field] !== event.databaseEntity![field],
      );
      if (!hasChanged) return;
    }

    const sourceText = meta.from
      .map((field) => event.entity![field])
      .filter(Boolean)
      .join(" ");

    if (!sourceText) return;

    const oldSlug = event.entity[meta.slugField] ?? "";

    const baseSlug = service.generateSlug(sourceText, {
      separator: meta.separator,
      maxLength: meta.maxLength,
    });

    let finalSlug = baseSlug;
    if (meta.unique) {
      const entityId = (event.entity as any).id ? String((event.entity as any).id) : undefined;
      finalSlug = await service.generateUniqueSlug(
        event.entity.constructor,
        meta.slugField,
        baseSlug,
        entityId,
      );
    }

    event.entity[meta.slugField] = finalSlug;

    if (oldSlug !== finalSlug) {
      this.emit(service, SLUGGABLE_EVENTS.SLUG_REGENERATED, {
        entity: event.entity,
        oldSlug,
        newSlug: finalSlug,
        sourceFields: meta.from,
      });
    }
  }

  // --- Private ---

  private getMetadata(entity: any): SluggableMetadata | null {
    if (!entity || !entity.constructor) return null;
    return Reflect.getMetadata(SLUGGABLE_METADATA_KEY, entity.constructor) ?? null;
  }

  private emit(service: SluggableService, event: string, payload: any): void {
    (service as any).emit(event, payload);
  }
}
