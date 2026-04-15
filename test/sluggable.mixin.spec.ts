import "reflect-metadata";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Entity, PrimaryGeneratedColumn, Column, DataSource } from "typeorm";
import { SluggableModule } from "../src/sluggable.module";
import { SluggableService } from "../src/sluggable.service";
import { Sluggable } from "../src/decorators/sluggable.decorator";
import { SluggableMixin } from "../src/mixins/sluggable.mixin";
import { SluggableNotInitializedException } from "../src/exceptions/sluggable-not-initialized.exception";

@Sluggable({ from: "title", slugField: "permalink" })
@Entity("mixin_posts")
class MixinPost extends SluggableMixin(
  class {
    id!: string;
    title!: string;
    permalink!: string;
  },
) {
  @PrimaryGeneratedColumn("uuid")
  declare id: string;

  @Column()
  declare title: string;

  @Column({ default: "" })
  declare permalink: string;
}

@Entity("mixin_plain")
class MixinPlain extends SluggableMixin(
  class {
    id!: string;
    slug!: string;
  },
) {
  @PrimaryGeneratedColumn("uuid")
  declare id: string;

  @Column({ default: "" })
  declare slug: string;
}

describe("SluggableMixin", () => {
  let module: TestingModule;
  let dataSource: DataSource;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [MixinPost, MixinPlain],
          synchronize: true,
        }),
        SluggableModule.forRoot(),
      ],
    }).compile();

    await module.init();
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(async () => {
    await module?.close();
  });

  describe("getSlug()", () => {
    it("should return the slug value using custom slugField", async () => {
      const repo = dataSource.getRepository(MixinPost);
      const post = repo.create({
        title: "Hello World",
        permalink: "hello-world",
      });
      await repo.save(post);

      expect(post.getSlug()).toBe("hello-world");
    });

    it("should return empty string when slug is not set", () => {
      const post = new MixinPost();
      expect(post.getSlug()).toBe("");
    });

    it("should default to slug field when no metadata", () => {
      const plain = new MixinPlain();
      plain.slug = "test-slug";
      expect(plain.getSlug()).toBe("test-slug");
    });
  });

  describe("getSlugField()", () => {
    it("should return custom slug field name from metadata", () => {
      const post = new MixinPost();
      expect(post.getSlugField()).toBe("permalink");
    });

    it("should default to slug when no metadata", () => {
      const plain = new MixinPlain();
      expect(plain.getSlugField()).toBe("slug");
    });
  });

  describe("findBySlug()", () => {
    it("should find entity by slug", async () => {
      const repo = dataSource.getRepository(MixinPost);
      const post = repo.create({ title: "Find Me", permalink: "find-me" });
      await repo.save(post);

      const found = await post.findBySlug("find-me");
      expect(found).not.toBeNull();
      expect(found.title).toBe("Find Me");
    });

    it("should return null when not found", async () => {
      const post = new MixinPost();
      const found = await post.findBySlug("nonexistent");
      expect(found).toBeNull();
    });
  });

  describe("regenerateSlug()", () => {
    it("should regenerate slug from source fields", async () => {
      const repo = dataSource.getRepository(MixinPost);
      const post = repo.create({
        title: "Original Title",
        permalink: "original-title",
      });
      await repo.save(post);

      post.title = "New Title";
      const newSlug = await post.regenerateSlug();

      expect(newSlug).toBe("new-title");
      expect(post.permalink).toBe("new-title");
    });
  });
});

describe("SluggableMixin without @Sluggable metadata", () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [MixinPost, MixinPlain],
          synchronize: true,
        }),
        SluggableModule.forRoot(),
      ],
    }).compile();

    await module.init();
  });

  afterEach(async () => {
    await module?.close();
  });

  it("should use defaults in regenerateSlug when no metadata", async () => {
    const plain = new MixinPlain();
    // No @Sluggable metadata — from defaults to [], slugField to "slug"
    const newSlug = await plain.regenerateSlug();
    expect(newSlug).toBe("");
    expect(plain.slug).toBe("");
  });
});

describe("SluggableMixin without service", () => {
  it("should throw SluggableNotInitializedException when service is not available", () => {
    // Ensure static instance is null
    const instance = SluggableService.getInstance();
    expect(instance).toBeNull();

    const post = new MixinPost();
    expect(() => post.findBySlug("test")).rejects.toThrow(
      SluggableNotInitializedException,
    );
  });
});

describe("SluggableNotInitializedException", () => {
  it("should have correct message and name", () => {
    const error = new SluggableNotInitializedException();
    expect(error.message).toContain("SluggableModule has not been initialized");
    expect(error.name).toBe("SluggableNotInitializedException");
    expect(error).toBeInstanceOf(Error);
  });
});
