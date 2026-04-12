<p align="center">
    <h1 align="center">@nestbolt/sluggable</h1>
    <p align="center">Auto-generate URL slugs for NestJS with TypeORM — unique slugs, collision handling, and transliteration.</p>
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@nestbolt/sluggable"><img src="https://img.shields.io/npm/v/@nestbolt/sluggable.svg?style=flat-square" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/@nestbolt/sluggable"><img src="https://img.shields.io/npm/dt/@nestbolt/sluggable.svg?style=flat-square" alt="npm downloads"></a>
    <a href="https://github.com/nestbolt/sluggable/actions"><img src="https://img.shields.io/github/actions/workflow/status/nestbolt/sluggable/tests.yml?branch=main&style=flat-square&label=tests" alt="tests"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square" alt="license"></a>
</p>

<hr>

This package provides **automatic URL slug generation** for [NestJS](https://nestjs.com) with TypeORM that generates unique, URL-friendly slugs from entity fields with collision handling and built-in transliteration for Arabic, Cyrillic, and accented characters.

Once installed, using it is as simple as:

```typescript
@Sluggable({ from: 'title' })
@Entity()
class Post {
  @Column() title: string;
  @Column() slug: string;  // Auto-generated: "my-awesome-post"
}
```

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Module Configuration](#module-configuration)
  - [Static Configuration (forRoot)](#static-configuration-forroot)
  - [Async Configuration (forRootAsync)](#async-configuration-forrootasync)
- [Using the Decorator](#using-the-decorator)
- [Using the Mixin](#using-the-mixin)
- [Using the Service Directly](#using-the-service-directly)
- [Collision Handling](#collision-handling)
- [Transliteration](#transliteration)
- [Update Behavior](#update-behavior)
- [Multiple Source Fields](#multiple-source-fields)
- [Events](#events)
- [Configuration Options](#configuration-options)
- [Standalone Usage](#standalone-usage)
- [Testing](#testing)
- [Changelog](#changelog)
- [Contributing](#contributing)
- [Security](#security)
- [Credits](#credits)
- [License](#license)

## Installation

Install the package via npm:

```bash
npm install @nestbolt/sluggable
```

Or via yarn:

```bash
yarn add @nestbolt/sluggable
```

Or via pnpm:

```bash
pnpm add @nestbolt/sluggable
```

### Peer Dependencies

This package requires the following peer dependencies:

```
@nestjs/common    ^10.0.0 || ^11.0.0
@nestjs/core      ^10.0.0 || ^11.0.0
typeorm           ^0.3.0
reflect-metadata  ^0.1.13 || ^0.2.0
```

Optional:

```
@nestjs/event-emitter  ^2.0.0 || ^3.0.0
```

## Quick Start

1. Register the module in your `AppModule`:

```typescript
import { SluggableModule } from '@nestbolt/sluggable';

@Module({
  imports: [
    TypeOrmModule.forRoot({ /* ... */ }),
    SluggableModule.forRoot(),
  ],
})
export class AppModule {}
```

2. Add the decorator to your entity:

```typescript
import { Sluggable } from '@nestbolt/sluggable';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Sluggable({ from: 'title' })
@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  slug: string;  // Auto-generated on insert
}
```

3. Save an entity and the slug is generated automatically:

```typescript
const post = postRepo.create({ title: 'My Awesome Post' });
await postRepo.save(post);
console.log(post.slug); // "my-awesome-post"
```

## Module Configuration

### Static Configuration (forRoot)

```typescript
SluggableModule.forRoot({
  separator: '-',        // Word separator (default: '-')
  maxLength: 255,        // Max slug length (default: 255)
  lowercase: true,       // Lowercase slugs (default: true)
  transliterate: true,   // Enable transliteration (default: true)
  onUpdate: 'keep',      // 'keep' or 'regenerate' (default: 'keep')
  suffixSeparator: '-',  // Collision suffix separator (default: '-')
})
```

### Async Configuration (forRootAsync)

```typescript
SluggableModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    maxLength: config.get('SLUG_MAX_LENGTH', 100),
    onUpdate: config.get('SLUG_ON_UPDATE', 'keep'),
  }),
})
```

The module is registered as **global** — `SluggableService` is available everywhere without re-importing.

## Using the Decorator

The `@Sluggable()` class decorator configures slug generation for an entity:

```typescript
@Sluggable({
  from: 'title',           // Source field(s) — required
  slugField: 'slug',       // Target field (default: 'slug')
  separator: '-',          // Word separator override
  maxLength: 100,          // Max length override
  onUpdate: 'keep',        // 'keep' or 'regenerate'
  unique: true,            // Collision handling (default: true)
})
```

## Using the Mixin

The `SluggableMixin()` adds instance methods to your entity:

```typescript
import { Sluggable, SluggableMixin } from '@nestbolt/sluggable';
import { BaseEntity } from 'typeorm';

@Sluggable({ from: 'title' })
@Entity()
class Post extends SluggableMixin(BaseEntity) { /* ... */ }
```

| Method | Returns | Description |
|--------|---------|-------------|
| `getSlug()` | `string` | Get current slug value |
| `getSlugField()` | `string` | Get slug column name |
| `findBySlug(slug)` | `Promise<any \| null>` | Find entity by slug |
| `regenerateSlug()` | `Promise<string>` | Regenerate and return new slug |

## Using the Service Directly

Inject `SluggableService` for programmatic control:

| Method | Returns | Description |
|--------|---------|-------------|
| `generateSlug(input, overrides?)` | `string` | Generate slug from text |
| `generateUniqueSlug(Entity, field, base, excludeId?)` | `Promise<string>` | Generate unique slug with DB check |
| `findBySlug<T>(Entity, field, slug)` | `Promise<T \| null>` | Find entity by slug |
| `regenerateSlug(entity, fields, slugField, overrides?)` | `Promise<string>` | Regenerate for existing entity |

## Collision Handling

When `unique: true` (default), the package queries the database for existing slugs and appends a numeric suffix:

```
my-post       (first)
my-post-1     (second with same title)
my-post-2     (third with same title)
```

The suffix separator can be customized via `suffixSeparator` in module options.

## Transliteration

Built-in transliteration converts non-Latin characters to ASCII:

```typescript
// Arabic
sluggableService.generateSlug('مرحبا بالعالم');  // "mrhba-balalm"

// Cyrillic
sluggableService.generateSlug('Привет мир');     // "privet-mir"

// Accented Latin
sluggableService.generateSlug('Cafe Resume');     // "cafe-resume"

// German
sluggableService.generateSlug('Uber Munchen');    // "ueber-muenchen"
```

### Custom Transliterator

Provide your own transliteration function:

```typescript
SluggableModule.forRoot({
  transliterator: (input) => myCustomTransliterate(input),
})
```

### Using the Utilities Standalone

The `slugify` and `transliterate` functions are exported for standalone use:

```typescript
import { slugify, transliterate } from '@nestbolt/sluggable';

const slug = slugify(transliterate('Cafe Resume')); // "cafe-resume"
```

## Update Behavior

Control what happens to the slug when an entity is updated:

- **`'keep'`** (default) — Keeps the original slug, even if the source field changes
- **`'regenerate'`** — Generates a new slug when source fields change

```typescript
@Sluggable({ from: 'title', onUpdate: 'regenerate' })
```

You can set the default behavior at the module level and override per entity.

## Multiple Source Fields

Generate slugs from multiple fields:

```typescript
@Sluggable({ from: ['firstName', 'lastName'] })
@Entity()
class User {
  @Column() firstName: string;
  @Column() lastName: string;
  @Column() slug: string;  // "john-doe"
}
```

## Events

When `@nestjs/event-emitter` is installed, the following events are emitted:

| Event | Payload |
|-------|---------|
| `sluggable.slug-generated` | `{ entity, slug, sourceFields, sourceText }` |
| `sluggable.slug-regenerated` | `{ entity, oldSlug, newSlug, sourceFields }` |

## Configuration Options

### Module Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `separator` | `string` | `'-'` | Word separator |
| `maxLength` | `number` | `255` | Maximum slug length |
| `lowercase` | `boolean` | `true` | Lowercase slugs |
| `transliterate` | `boolean` | `true` | Enable transliteration |
| `transliterator` | `Function` | built-in | Custom transliteration function |
| `onUpdate` | `'keep' \| 'regenerate'` | `'keep'` | Slug update behavior |
| `suffixSeparator` | `string` | `'-'` | Collision suffix separator |

### Decorator Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `from` | `string \| string[]` | *required* | Source field(s) |
| `slugField` | `string` | `'slug'` | Target field |
| `separator` | `string` | module default | Word separator override |
| `maxLength` | `number` | module default | Max length override |
| `onUpdate` | `'keep' \| 'regenerate'` | module default | Update behavior override |
| `unique` | `boolean` | `true` | Enable collision handling |

## Standalone Usage

Use `slugify` and `transliterate` without the NestJS module:

```typescript
import { slugify, transliterate } from '@nestbolt/sluggable';

const slug = slugify('Hello World!');                  // "hello-world"
const slug2 = slugify('Hello', { separator: '_' });    // "hello"
const latin = transliterate('Привет');                 // "Privet"
```

## Testing

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:cov
```

## Changelog

Please see [CHANGELOG](CHANGELOG.md) for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](CONTRIBUTING.md) for details.

## Security

If you discover any security-related issues, please report them via [GitHub Issues](https://github.com/nestbolt/sluggable/issues) with the **security** label instead of using the public issue tracker.

## Credits

- Inspired by [spatie/laravel-sluggable](https://github.com/spatie/laravel-sluggable)

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
