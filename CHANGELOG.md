# Changelog

All notable changes to `@nestbolt/sluggable` will be documented in this file.

## v0.1.0 — Initial Release

### Features

- **Auto-slug generation** — TypeORM subscriber automatically generates URL slugs from source fields on insert
- **@Sluggable decorator** — Class decorator with configurable source field(s), slug field, separator, max length, and update behavior
- **Collision handling** — Automatic unique slug generation with numeric suffix (-1, -2, etc.)
- **Transliteration** — Built-in Unicode-to-Latin transliteration for Arabic, Cyrillic, accented Latin, and more
- **Entity mixin** — `SluggableMixin()` adds `getSlug()`, `findBySlug()`, `regenerateSlug()` to entities
- **Update control** — Choose to keep original slug or regenerate on entity updates via `onUpdate` option
- **Custom separators** — Configurable word separator and max slug length
- **Events** — Emits `sluggable.slug-generated` and `sluggable.slug-regenerated` events via optional `@nestjs/event-emitter`
- **Module configuration** — `forRoot()` and `forRootAsync()` with global defaults for separator, max length, transliteration, and update behavior
