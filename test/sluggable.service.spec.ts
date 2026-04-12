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
      providers: [{ provide: SLUGGABLE_OPTIONS, useValue: {} }, SluggableService],
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
      expect(service.generateSlug("What's New? #Release!")).toBe("what-s-new-release");
    });

    it("should transliterate by default", () => {
      expect(service.generateSlug("café résumé")).toBe("cafe-resume");
    });

    it("should respect separator override", () => {
      expect(service.generateSlug("Hello World", { separator: "_" })).toBe("hello_world");
    });

    it("should respect maxLength override", () => {
      const slug = service.generateSlug("This is a very long title", { maxLength: 10 });
      expect(slug.length).toBeLessThanOrEqual(10);
    });

    it("should skip transliteration when disabled", () => {
      const slug = service.generateSlug("café", { transliterate: false });
      expect(slug).toBe("caf");
    });
  });

  describe("generateUniqueSlug()", () => {
    it("should return base slug when no collision", async () => {
      const slug = await service.generateUniqueSlug(Post, "slug", "hello-world");
      expect(slug).toBe("hello-world");
    });

    it("should append suffix on collision", async () => {
      const repo = dataSource.getRepository(Post);
      await repo.save(repo.create({ title: "Hello World", slug: "hello-world" }));

      const slug = await service.generateUniqueSlug(Post, "slug", "hello-world");
      expect(slug).toBe("hello-world-1");
    });

    it("should increment suffix for multiple collisions", async () => {
      const repo = dataSource.getRepository(Post);
      await repo.save(repo.create({ title: "Hello World", slug: "hello-world" }));
      await repo.save(repo.create({ title: "Hello World 2", slug: "hello-world-1" }));

      const slug = await service.generateUniqueSlug(Post, "slug", "hello-world");
      expect(slug).toBe("hello-world-2");
    });

    it("should exclude entity by id", async () => {
      const repo = dataSource.getRepository(Post);
      const post = await repo.save(repo.create({ title: "Hello World", slug: "hello-world" }));

      const slug = await service.generateUniqueSlug(Post, "slug", "hello-world", post.id);
      expect(slug).toBe("hello-world");
    });
  });

  describe("findBySlug()", () => {
    it("should find entity by slug", async () => {
      const repo = dataSource.getRepository(Post);
      await repo.save(repo.create({ title: "Hello World", slug: "hello-world" }));

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
});
