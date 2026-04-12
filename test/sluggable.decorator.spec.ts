import "reflect-metadata";
import { describe, it, expect } from "vitest";
import { Sluggable } from "../src/decorators/sluggable.decorator";
import { SLUGGABLE_METADATA_KEY } from "../src/sluggable.constants";

describe("@Sluggable()", () => {
  it("should set metadata with single source field", () => {
    @Sluggable({ from: "title" })
    class TestEntity {}

    const meta = Reflect.getMetadata(SLUGGABLE_METADATA_KEY, TestEntity);
    expect(meta).toBeDefined();
    expect(meta.from).toEqual(["title"]);
    expect(meta.slugField).toBe("slug");
    expect(meta.unique).toBe(true);
  });

  it("should set metadata with multiple source fields", () => {
    @Sluggable({ from: ["firstName", "lastName"] })
    class TestEntity {}

    const meta = Reflect.getMetadata(SLUGGABLE_METADATA_KEY, TestEntity);
    expect(meta.from).toEqual(["firstName", "lastName"]);
  });

  it("should store custom slug field", () => {
    @Sluggable({ from: "title", slugField: "permalink" })
    class TestEntity {}

    const meta = Reflect.getMetadata(SLUGGABLE_METADATA_KEY, TestEntity);
    expect(meta.slugField).toBe("permalink");
  });

  it("should store custom separator", () => {
    @Sluggable({ from: "title", separator: "_" })
    class TestEntity {}

    const meta = Reflect.getMetadata(SLUGGABLE_METADATA_KEY, TestEntity);
    expect(meta.separator).toBe("_");
  });

  it("should store maxLength", () => {
    @Sluggable({ from: "title", maxLength: 50 })
    class TestEntity {}

    const meta = Reflect.getMetadata(SLUGGABLE_METADATA_KEY, TestEntity);
    expect(meta.maxLength).toBe(50);
  });

  it("should store onUpdate setting", () => {
    @Sluggable({ from: "title", onUpdate: "regenerate" })
    class TestEntity {}

    const meta = Reflect.getMetadata(SLUGGABLE_METADATA_KEY, TestEntity);
    expect(meta.onUpdate).toBe("regenerate");
  });

  it("should store unique setting", () => {
    @Sluggable({ from: "title", unique: false })
    class TestEntity {}

    const meta = Reflect.getMetadata(SLUGGABLE_METADATA_KEY, TestEntity);
    expect(meta.unique).toBe(false);
  });
});
