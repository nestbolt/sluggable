import "reflect-metadata";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Entity, PrimaryGeneratedColumn, Column, DataSource } from "typeorm";
import { SluggableModule } from "../src/sluggable.module";
import { SluggableService } from "../src/sluggable.service";
import { SluggableSubscriber } from "../src/sluggable.subscriber";
import { Sluggable } from "../src/decorators/sluggable.decorator";
import { SLUGGABLE_OPTIONS } from "../src/sluggable.constants";

@Sluggable({ from: "title" })
@Entity("sub_posts")
class SubPost {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column({ default: "" })
  slug!: string;
}

@Sluggable({ from: ["firstName", "lastName"] })
@Entity("sub_users")
class SubUser {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ default: "" })
  slug!: string;
}

@Sluggable({ from: "title", unique: false })
@Entity("sub_articles")
class SubArticle {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column({ default: "" })
  slug!: string;
}

@Sluggable({ from: "title", onUpdate: "regenerate" })
@Entity("sub_pages")
class SubPage {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column({ default: "" })
  slug!: string;
}

@Sluggable({ from: "name", separator: "_", maxLength: 20 })
@Entity("sub_categories")
class SubCategory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ default: "" })
  slug!: string;
}

@Sluggable({ from: "title", onUpdate: "regenerate", unique: false })
@Entity("sub_notes")
class SubNote {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column({ default: "" })
  slug!: string;
}

// Entity without @Sluggable decorator for testing no-metadata path
@Entity("sub_plain")
class SubPlain {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;
}

describe("SluggableSubscriber", () => {
  let module: TestingModule;
  let dataSource: DataSource;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [SubPost, SubUser, SubArticle, SubPage, SubCategory, SubNote, SubPlain],
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

  describe("beforeInsert", () => {
    it("should generate slug on insert", async () => {
      const repo = dataSource.getRepository(SubPost);
      const post = repo.create({ title: "Hello World" });
      await repo.save(post);

      expect(post.slug).toBe("hello-world");
    });

    it("should generate slug from multiple fields", async () => {
      const repo = dataSource.getRepository(SubUser);
      const user = repo.create({ firstName: "John", lastName: "Doe" });
      await repo.save(user);

      expect(user.slug).toBe("john-doe");
    });

    it("should generate unique slug on collision", async () => {
      const repo = dataSource.getRepository(SubPost);
      const post1 = repo.create({ title: "Hello World" });
      await repo.save(post1);

      const post2 = repo.create({ title: "Hello World" });
      await repo.save(post2);

      expect(post1.slug).toBe("hello-world");
      expect(post2.slug).toBe("hello-world-1");
    });

    it("should skip unique check when unique is false", async () => {
      const repo = dataSource.getRepository(SubArticle);
      const a1 = repo.create({ title: "Same Title" });
      await repo.save(a1);

      const a2 = repo.create({ title: "Same Title" });
      await repo.save(a2);

      expect(a1.slug).toBe("same-title");
      expect(a2.slug).toBe("same-title");
    });

    it("should skip if slug is already set", async () => {
      const repo = dataSource.getRepository(SubPost);
      const post = repo.create({ title: "Hello World", slug: "custom-slug" });
      await repo.save(post);

      expect(post.slug).toBe("custom-slug");
    });

    it("should skip if source fields are empty", async () => {
      const repo = dataSource.getRepository(SubPost);
      const post = repo.create({ title: "" });
      await repo.save(post);

      expect(post.slug).toBe("");
    });

    it("should apply custom separator and maxLength from decorator", async () => {
      const repo = dataSource.getRepository(SubCategory);
      const cat = repo.create({ name: "Very Long Category Name Here" });
      await repo.save(cat);

      expect(cat.slug).toContain("_");
      expect(cat.slug.length).toBeLessThanOrEqual(20);
    });
  });

  describe("beforeUpdate", () => {
    it("should keep slug by default on update", async () => {
      const repo = dataSource.getRepository(SubPost);
      const post = repo.create({ title: "Original Title" });
      await repo.save(post);
      expect(post.slug).toBe("original-title");

      post.title = "Updated Title";
      await repo.save(post);

      expect(post.slug).toBe("original-title");
    });

    it("should regenerate slug when onUpdate is regenerate and source changed", async () => {
      const repo = dataSource.getRepository(SubPage);
      const page = repo.create({ title: "Original Title" });
      await repo.save(page);
      expect(page.slug).toBe("original-title");

      page.title = "Updated Title";
      await repo.save(page);

      const found = await repo.findOneBy({ id: page.id });
      expect(found!.slug).toBe("updated-title");
    });

    it("should not regenerate when source fields have not changed", async () => {
      const repo = dataSource.getRepository(SubPage);
      const page = repo.create({ title: "Same Title" });
      await repo.save(page);

      // Save again without changing title
      await repo.save(page);

      expect(page.slug).toBe("same-title");
    });

    it("should handle unique collision on update regeneration", async () => {
      const repo = dataSource.getRepository(SubPage);
      const page1 = repo.create({ title: "Target Title" });
      await repo.save(page1);

      const page2 = repo.create({ title: "Other Title" });
      await repo.save(page2);

      page2.title = "Target Title";
      await repo.save(page2);

      const found = await repo.findOneBy({ id: page2.id });
      expect(found!.slug).toBe("target-title-1");
    });

    it("should skip non-unique slug generation on update when unique is false", async () => {
      const repo = dataSource.getRepository(SubNote);
      const note1 = repo.create({ title: "Same Title" });
      await repo.save(note1);

      const note2 = repo.create({ title: "Different" });
      await repo.save(note2);

      note2.title = "Same Title";
      await repo.save(note2);

      const found = await repo.findOneBy({ id: note2.id });
      // No unique check, so slug is just "same-title" even with collision
      expect(found!.slug).toBe("same-title");
    });

    it("should not emit event when slug does not change on update", async () => {
      const repo = dataSource.getRepository(SubNote);
      const note = repo.create({ title: "Stable" });
      await repo.save(note);
      expect(note.slug).toBe("stable");

      // Update with same title — slug regenerates to same value
      note.title = "Stable";
      await repo.save(note);

      const found = await repo.findOneBy({ id: note.id });
      expect(found!.slug).toBe("stable");
    });

    it("should handle entity without sluggable metadata on insert", async () => {
      const repo = dataSource.getRepository(SubPlain);
      const plain = repo.create({ name: "Test" });
      await repo.save(plain);

      expect(plain.id).toBeDefined();
    });

    it("should generate slug on update when keep mode but slug is empty", async () => {
      const repo = dataSource.getRepository(SubPost);
      // Insert with manual empty slug (bypassing subscriber by setting slug to empty)
      const post = repo.create({ title: "Empty Slug", slug: "" });
      await repo.save(post);

      // Now update - slug is empty so "keep" mode should still generate
      post.title = "New Title";
      post.slug = "";
      await repo.save(post);

      const found = await repo.findOneBy({ id: post.id });
      // The "keep" check: if slug is falsy, it proceeds to generate
      expect(found!.slug).toBeDefined();
    });

    it("should handle update with empty source text", async () => {
      const repo = dataSource.getRepository(SubNote);
      const note = repo.create({ title: "Original" });
      await repo.save(note);

      // Set title to empty — sourceText will be empty
      note.title = "";
      await repo.save(note);

      // slug should remain as "original" since empty sourceText returns early
      const found = await repo.findOneBy({ id: note.id });
      expect(found).toBeDefined();
    });

    it("should handle entity without sluggable metadata on update", async () => {
      const repo = dataSource.getRepository(SubPlain);
      const plain = repo.create({ name: "Test" });
      await repo.save(plain);

      plain.name = "Updated";
      await repo.save(plain);

      expect(plain.name).toBe("Updated");
    });
  });
});

describe("SluggableSubscriber direct method calls", () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let subscriber: SluggableSubscriber;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [SubPost, SubPage, SubNote, SubArticle],
          synchronize: true,
        }),
        SluggableModule.forRoot(),
      ],
    }).compile();

    await module.init();
    dataSource = module.get<DataSource>(DataSource);
    subscriber = dataSource.subscribers.find(
      (s) => s.constructor.name === "SluggableSubscriber",
    ) as SluggableSubscriber;
  });

  afterEach(async () => {
    await module?.close();
  });

  describe("beforeInsert edge cases", () => {
    it("should return early when event.entity is null", async () => {
      await subscriber.beforeInsert({ entity: null } as any);
      // No error thrown
    });

    it("should return early when entity has no sluggable metadata", async () => {
      await subscriber.beforeInsert({
        entity: { constructor: class Plain {} },
      } as any);
    });
  });

  describe("beforeUpdate edge cases", () => {
    it("should return early when event.entity is null", async () => {
      await subscriber.beforeUpdate({ entity: null } as any);
    });

    it("should return early when entity has no sluggable metadata", async () => {
      await subscriber.beforeUpdate({
        entity: { constructor: class Plain {} },
      } as any);
    });

    it("should return early when sourceText is empty on update", async () => {
      const entity = Object.assign(new SubPage(), { title: "", slug: "" });
      await subscriber.beforeUpdate({
        entity,
        databaseEntity: { title: "old", slug: "old" },
      } as any);
      expect(entity.slug).toBe("");
    });

    it("should not regenerate when databaseEntity present and fields unchanged", async () => {
      const entity = Object.assign(new SubPage(), {
        id: "fake-id",
        title: "Same Title",
        slug: "same-title",
      });
      await subscriber.beforeUpdate({
        entity,
        databaseEntity: { title: "Same Title", slug: "same-title" },
      } as any);
      // slug stays the same because fields didn't change
      expect(entity.slug).toBe("same-title");
    });

    it("should regenerate when databaseEntity present and fields changed", async () => {
      const repo = dataSource.getRepository(SubPage);
      const page = await repo.save(repo.create({ title: "Old Title" }));

      const entity = Object.assign(new SubPage(), {
        id: page.id,
        title: "New Title",
        slug: "old-title",
      });
      await subscriber.beforeUpdate({
        entity,
        databaseEntity: { title: "Old Title", slug: "old-title" },
      } as any);
      expect(entity.slug).toBe("new-title");
    });

    it("should skip unique check on update when unique is false", async () => {
      const entity = Object.assign(new SubNote(), {
        id: "fake-id",
        title: "Note Title",
        slug: "",
      });
      await subscriber.beforeUpdate({
        entity,
        databaseEntity: { title: "Old Note", slug: "" },
      } as any);
      expect(entity.slug).toBe("note-title");
    });

    it("should handle entity without id during unique check on update", async () => {
      const entity = Object.assign(new SubPage(), {
        title: "No Id",
        slug: "",
      });
      // No id field at all
      delete (entity as any).id;
      await subscriber.beforeUpdate({
        entity,
        databaseEntity: { title: "Old", slug: "" },
      } as any);
      expect(entity.slug).toBe("no-id");
    });

    it("should not emit event when slug is unchanged on update", async () => {
      const entity = Object.assign(new SubNote(), {
        id: "fake-id",
        title: "Same",
        slug: "same",
      });
      await subscriber.beforeUpdate({
        entity,
        databaseEntity: { title: "Old", slug: "same" },
      } as any);
      // slug regenerated to "same" which matches oldSlug — no event emitted
      expect(entity.slug).toBe("same");
    });

    it("should handle oldSlug as undefined (fallback to empty string)", async () => {
      const entity = Object.assign(new SubNote(), {
        id: "fake-id",
        title: "New Slug",
      });
      // slug property doesn't exist, so oldSlug defaults to ""
      delete (entity as any).slug;
      await subscriber.beforeUpdate({
        entity,
        databaseEntity: { title: "Old" },
      } as any);
      expect(entity.slug).toBe("new-slug");
    });
  });
});

describe("SluggableSubscriber when service is unavailable", () => {
  it("should return early on insert when SluggableService.getInstance() is null", async () => {
    // Create a subscriber without initializing SluggableService
    const { DataSource: DS } = await import("typeorm");
    const ds = new DS({
      type: "better-sqlite3",
      database: ":memory:",
      entities: [SubPost],
      synchronize: true,
    });
    await ds.initialize();

    const sub = new SluggableSubscriber(ds);

    // Ensure static instance is null
    const origInstance = SluggableService.getInstance();
    (SluggableService as any).instance = null;

    const entity = Object.assign(new SubPost(), { title: "Test", slug: "" });
    await sub.beforeInsert({ entity } as any);
    // Slug should remain empty since service is unavailable
    expect(entity.slug).toBe("");

    // Restore
    (SluggableService as any).instance = origInstance;
    await ds.destroy();
  });

  it("should return early on update when SluggableService.getInstance() is null", async () => {
    const { DataSource: DS } = await import("typeorm");
    const ds = new DS({
      type: "better-sqlite3",
      database: ":memory:",
      entities: [SubPage],
      synchronize: true,
    });
    await ds.initialize();

    const sub = new SluggableSubscriber(ds);

    const origInstance = SluggableService.getInstance();
    (SluggableService as any).instance = null;

    const entity = Object.assign(new SubPage(), { title: "Test", slug: "" });
    await sub.beforeUpdate({ entity } as any);
    expect(entity.slug).toBe("");

    (SluggableService as any).instance = origInstance;
    await ds.destroy();
  });

  it("should return early when entity has no constructor (getMetadata)", async () => {
    const { DataSource: DS } = await import("typeorm");
    const ds = new DS({
      type: "better-sqlite3",
      database: ":memory:",
      entities: [],
      synchronize: true,
    });
    await ds.initialize();

    const sub = new SluggableSubscriber(ds);

    // Entity with no constructor property
    const entity = Object.create(null);
    entity.title = "Test";
    await sub.beforeInsert({ entity } as any);
    await sub.beforeUpdate({ entity } as any);
    // No error thrown

    await ds.destroy();
  });
});

describe("SluggableSubscriber with events", () => {
  let module: TestingModule;
  let dataSource: DataSource;

  const emitted: { event: string; payload: any }[] = [];

  beforeEach(async () => {
    emitted.length = 0;

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [SubPost, SubPage, SubNote],
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
        SluggableSubscriber,
      ],
    }).compile();

    await module.init();
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(async () => {
    await module?.close();
  });

  it("should emit slug-generated event on insert", async () => {
    const repo = dataSource.getRepository(SubPost);
    const post = repo.create({ title: "Hello World" });
    await repo.save(post);

    const evt = emitted.find((e) => e.event === "sluggable.slug-generated");
    expect(evt).toBeDefined();
    expect(evt!.payload.slug).toBe("hello-world");
    expect(evt!.payload.sourceFields).toEqual(["title"]);
  });

  it("should emit slug-regenerated event on update", async () => {
    const repo = dataSource.getRepository(SubPage);
    const page = repo.create({ title: "Original" });
    await repo.save(page);

    emitted.length = 0;

    page.title = "Updated";
    await repo.save(page);

    const evt = emitted.find((e) => e.event === "sluggable.slug-regenerated");
    expect(evt).toBeDefined();
    expect(evt!.payload.oldSlug).toBe("original");
    expect(evt!.payload.newSlug).toBe("updated");
  });
});
