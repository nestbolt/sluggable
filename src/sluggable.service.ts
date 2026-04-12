import "reflect-metadata";
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from "@nestjs/common";
import { DataSource } from "typeorm";
import { SLUGGABLE_OPTIONS } from "./sluggable.constants";
import { SLUGGABLE_EVENTS } from "./events/sluggable.events";
import { slugify } from "./utils/slugify";
import { transliterate as defaultTransliterate } from "./utils/transliterate";
import type { SluggableModuleOptions } from "./interfaces";

interface EventEmitterLike {
  emit(event: string, ...args: any[]): boolean;
}

@Injectable()
export class SluggableService implements OnModuleInit, OnModuleDestroy {
  private static instance: SluggableService | null = null;
  private readonly logger = new Logger(SluggableService.name);

  constructor(
    @Inject(SLUGGABLE_OPTIONS) private readonly options: SluggableModuleOptions,
    private readonly dataSource: DataSource,
    @Optional() @Inject("EventEmitter2") private readonly eventEmitter?: EventEmitterLike,
  ) {}

  onModuleInit(): void {
    SluggableService.instance = this;
    this.logger.log("SluggableService initialized");
  }

  onModuleDestroy(): void {
    if (SluggableService.instance === this) {
      SluggableService.instance = null;
    }
  }

  static getInstance(): SluggableService | null {
    return SluggableService.instance;
  }

  // --- Options ---

  getOptions(): SluggableModuleOptions {
    return this.options;
  }

  // --- Slug Generation ---

  generateSlug(
    input: string,
    overrides?: {
      separator?: string;
      maxLength?: number;
      lowercase?: boolean;
      transliterate?: boolean;
    },
  ): string {
    const shouldTransliterate = overrides?.transliterate ?? this.options.transliterate ?? true;
    const separator = overrides?.separator ?? this.options.separator ?? "-";
    const maxLength = overrides?.maxLength ?? this.options.maxLength ?? 255;
    const lowercase = overrides?.lowercase ?? this.options.lowercase ?? true;

    let text = input;

    if (shouldTransliterate) {
      const transliterator = this.options.transliterator ?? defaultTransliterate;
      text = transliterator(text);
    }

    return slugify(text, { separator, maxLength, lowercase });
  }

  async generateUniqueSlug(
    entityConstructor: Function,
    slugField: string,
    baseSlug: string,
    excludeId?: string,
  ): Promise<string> {
    const repo = this.dataSource.getRepository(entityConstructor as any);
    const suffixSeparator = this.options.suffixSeparator ?? "-";

    // Check if base slug is available
    const qb = repo.createQueryBuilder("e").where(`e.${slugField} = :slug`, { slug: baseSlug });

    if (excludeId) {
      qb.andWhere("e.id != :excludeId", { excludeId });
    }

    const existing = await qb.getCount();
    if (existing === 0) return baseSlug;

    // Find all slugs that match the pattern: baseSlug or baseSlug-N
    const pattern = `${baseSlug}${suffixSeparator}%`;
    const collisionQb = repo
      .createQueryBuilder("e")
      .where(`e.${slugField} = :baseSlug OR e.${slugField} LIKE :pattern`, {
        baseSlug,
        pattern,
      });

    if (excludeId) {
      collisionQb.andWhere("e.id != :excludeId", { excludeId });
    }

    const collisions = await collisionQb.select(`e.${slugField}`, "slug").getRawMany();

    // Extract existing suffix numbers
    let maxSuffix = 0;
    const suffixRegex = new RegExp(
      `^${baseSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${suffixSeparator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d+)$`,
    );

    for (const row of collisions) {
      const slug = row.slug ?? row[slugField];
      const match = slug?.match(suffixRegex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSuffix) maxSuffix = num;
      }
    }

    return `${baseSlug}${suffixSeparator}${maxSuffix + 1}`;
  }

  async regenerateSlug(
    entity: any,
    sourceFields: string[],
    slugField: string,
    overrides?: { separator?: string; maxLength?: number },
  ): Promise<string> {
    const sourceText = sourceFields
      .map((field) => entity[field])
      .filter(Boolean)
      .join(" ");

    const baseSlug = this.generateSlug(sourceText, overrides);
    const entityId = entity.id ? String(entity.id) : undefined;

    return this.generateUniqueSlug(entity.constructor, slugField, baseSlug, entityId);
  }

  async findBySlug<T>(
    entityConstructor: new (...args: any[]) => T,
    slugField: string,
    slug: string,
  ): Promise<T | null> {
    const repo = this.dataSource.getRepository(entityConstructor);
    return repo.findOne({ where: { [slugField]: slug } as any }) as Promise<T | null>;
  }

  // --- Private ---

  private emit(event: string, payload: any): void {
    if (this.eventEmitter) {
      this.eventEmitter.emit(event, payload);
    }
  }
}
