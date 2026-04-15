import "reflect-metadata";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Entity, PrimaryGeneratedColumn, Column, DataSource } from "typeorm";
import { SluggableService } from "../src/sluggable.service";
import { Sluggable } from "../src/decorators/sluggable.decorator";
import { SLUGGABLE_OPTIONS } from "../src/sluggable.constants";

@Sluggable({ from: "title" })
@Entity("posts")
class Post {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column({ default: "" })
  slug!: string;
}

describe("SluggableService", () => {
  let module: TestingModule;
  let service: SluggableService;
  let dataSource: DataSource;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [Post],
          synchronize: true,
        }),
      ],
      providers: [
        { provide: SLUGGABLE_OPTIONS, useValue: {} },
        SluggableService,
      ],
    }).compile();

    await module.init();
    service = module.get<SluggableService>(SluggableService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(async () => {
    await module?.close();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should have static instance after init", () => {
    expect(SluggableService.getInstance()).toBe(service);
  });

  describe("generateSlug()", () => {
    it("should generate a basic slug", () => {
      expect(service.generateSlug("Hello World")).toBe("hello-world");
    });

    it("should handle special characters", () => {
      expect(service.generateSlug("What's New? #Release!")).toBe(
        "what-s-new-release",
      );
    });

    it("should transliterate by default", () => {
      expect(service.generateSlug("café résumé")).toBe("cafe-resume");
    });

    it("should respect separator override", () => {
      expect(service.generateSlug("Hello World", { separator: "_" })).toBe(
        "hello_world",
      );
    });

    it("should respect maxLength override", () => {
      const slug = service.generateSlug("This is a very long title", {
        maxLength: 10,
      });
      expect(slug.length).toBeLessThanOrEqual(10);
    });

    it("should skip transliteration when disabled", () => {
      const slug = service.generateSlug("café", { transliterate: false });
      expect(slug).toBe("caf");
    });
  });

  describe("generateUniqueSlug()", () => {
    it("should return base slug when no collision", async () => {
      const slug = await service.generateUniqueSlug(
        Post,
        "slug",
        "hello-world",
      );
      expect(slug).toBe("hello-world");
    });

    it("should append suffix on collision", async () => {
      const repo = dataSource.getRepository(Post);
      await repo.save(
        repo.create({ title: "Hello World", slug: "hello-world" }),
      );

      const slug = await service.generateUniqueSlug(
        Post,
        "slug",
        "hello-world",
      );
      expect(slug).toBe("hello-world-1");
    });

    it("should increment suffix for multiple collisions", async () => {
      const repo = dataSource.getRepository(Post);
      await repo.save(
        repo.create({ title: "Hello World", slug: "hello-world" }),
      );
      await repo.save(
        repo.create({ title: "Hello World 2", slug: "hello-world-1" }),
      );

      const slug = await service.generateUniqueSlug(
        Post,
        "slug",
        "hello-world",
      );
      expect(slug).toBe("hello-world-2");
    });

    it("should exclude entity by id", async () => {
      const repo = dataSource.getRepository(Post);
      const post = await repo.save(
        repo.create({ title: "Hello World", slug: "hello-world" }),
      );

      const slug = await service.generateUniqueSlug(
        Post,
        "slug",
        "hello-world",
        post.id,
      );
      expect(slug).toBe("hello-world");
    });
  });

  describe("findBySlug()", () => {
    it("should find entity by slug", async () => {
      const repo = dataSource.getRepository(Post);
      await repo.save(
        repo.create({ title: "Hello World", slug: "hello-world" }),
      );

      const found = await service.findBySlug(Post, "slug", "hello-world");
      expect(found).not.toBeNull();
      expect(found!.title).toBe("Hello World");
    });

    it("should return null when not found", async () => {
      const found = await service.findBySlug(Post, "slug", "nonexistent");
      expect(found).toBeNull();
    });
  });

  describe("regenerateSlug()", () => {
    it("should regenerate slug from source fields", async () => {
      const repo = dataSource.getRepository(Post);
      const post = await repo.save(
        repo.create({ title: "Original Title", slug: "original-title" }),
      );
      post.title = "Updated Title";

      const newSlug = await service.regenerateSlug(post, ["title"], "slug");
      expect(newSlug).toBe("updated-title");
    });
  });

  describe("generateUniqueSlug() with excludeId and collisions", () => {
    it("should exclude entity by id when finding collision suffixes", async () => {
      const repo = dataSource.getRepository(Post);
      // p1 has slug "test", p2 also has slug "test-1"
      await repo.save(repo.create({ title: "Test", slug: "test" }));
      const p2 = await repo.save(
        repo.create({ title: "Test 2", slug: "test-1" }),
      );

      // Generating unique slug for "test" excluding p2 — "test" exists (not excluded), so collision logic runs
      // In collision query, p2 is excluded, so only "test" is found (no suffix match), maxSuffix=0
      const slug = await service.generateUniqueSlug(
        Post,
        "slug",
        "test",
        p2.id,
      );
      expect(slug).toBe("test-1");
    });

    it("should find max suffix when multiple numbered collisions exist", async () => {
      const repo = dataSource.getRepository(Post);
      // Insert test-2 before test-1 so the loop processes higher suffix first,
      // then test-1 hits the `num > maxSuffix` false branch
      await repo.save(repo.create({ title: "Test", slug: "test" }));
      await repo.save(repo.create({ title: "Test", slug: "test-2" }));
      await repo.save(repo.create({ title: "Test", slug: "test-1" }));

      const slug = await service.generateUniqueSlug(Post, "slug", "test");
      expect(slug).toBe("test-3");
    });
  });

  describe("generateSlug() with module-level options", () => {
    let customModule: TestingModule;
    let customService: SluggableService;

    afterEach(async () => {
      await customModule?.close();
    });

    it("should use custom transliterator from options", async () => {
      customModule = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "better-sqlite3",
            database: ":memory:",
            entities: [Post],
            synchronize: true,
          }),
        ],
        providers: [
          {
            provide: SLUGGABLE_OPTIONS,
            useValue: {
              transliterator: (input: string) => input.replace(/ö/g, "o"),
            },
          },
          SluggableService,
        ],
      }).compile();

      await customModule.init();
      customService = customModule.get<SluggableService>(SluggableService);

      expect(customService.generateSlug("böök")).toBe("book");
    });

    it("should disable transliteration when option is false", async () => {
      customModule = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "better-sqlite3",
            database: ":memory:",
            entities: [Post],
            synchronize: true,
          }),
        ],
        providers: [
          {
            provide: SLUGGABLE_OPTIONS,
            useValue: { transliterate: false },
          },
          SluggableService,
        ],
      }).compile();

      await customModule.init();
      customService = customModule.get<SluggableService>(SluggableService);

      // Without transliteration, non-ASCII chars get stripped by slugify
      expect(customService.generateSlug("café")).toBe("caf");
    });

    it("should use custom suffixSeparator", async () => {
      customModule = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "better-sqlite3",
            database: ":memory:",
            entities: [Post],
            synchronize: true,
          }),
        ],
        providers: [
          {
            provide: SLUGGABLE_OPTIONS,
            useValue: { suffixSeparator: "_" },
          },
          SluggableService,
        ],
      }).compile();

      await customModule.init();
      customService = customModule.get<SluggableService>(SluggableService);

      const ds = customModule.get<DataSource>(DataSource);
      const repo = ds.getRepository(Post);
      await repo.save(repo.create({ title: "Hello", slug: "hello" }));

      const slug = await customService.generateUniqueSlug(
        Post,
        "slug",
        "hello",
      );
      expect(slug).toBe("hello_1");
    });
  });

  describe("static instance lifecycle", () => {
    it("should clear instance on module destroy", async () => {
      expect(SluggableService.getInstance()).toBe(service);
      await module.close();
      expect(SluggableService.getInstance()).toBeNull();
      module = undefined as any;
    });
  });

  describe("regenerateSlug() without entity id", () => {
    it("should handle entity without id field", async () => {
      const entity = { constructor: Post, title: "No Id Entity" };
      const slug = await service.regenerateSlug(entity, ["title"], "slug");
      expect(slug).toBe("no-id-entity");
    });
  });

  describe("emit with eventEmitter", () => {
    it("should emit events when eventEmitter is available", async () => {
      const emitted: { event: string; payload: any }[] = [];
      const customModule = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "better-sqlite3",
            database: ":memory:",
            entities: [Post],
            synchronize: true,
          }),
        ],
        providers: [
          { provide: SLUGGABLE_OPTIONS, useValue: {} },
          {
            provide: "EventEmitter2",
            useValue: {
              emit(event: string, payload: any) {
                emitted.push({ event, payload });
                return true;
              },
            },
          },
          SluggableService,
        ],
      }).compile();

      await customModule.init();
      const svc = customModule.get<SluggableService>(SluggableService);

      // Access private emit via casting
      (svc as any).emit("test.event", { data: "test" });
      expect(emitted).toHaveLength(1);
      expect(emitted[0].event).toBe("test.event");

      await customModule.close();
    });
  });
});
