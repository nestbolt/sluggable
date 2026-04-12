import { describe, it, expect } from "vitest";
import { slugify } from "../src/utils/slugify";

describe("slugify()", () => {
  it("should convert simple text to slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("should handle multiple spaces", () => {
    expect(slugify("Hello   World")).toBe("hello-world");
  });

  it("should remove special characters", () => {
    expect(slugify("Hello! World? #Test")).toBe("hello-world-test");
  });

  it("should trim leading/trailing separators", () => {
    expect(slugify("  Hello World  ")).toBe("hello-world");
  });

  it("should handle empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("should handle string with only special characters", () => {
    expect(slugify("!@#$%")).toBe("");
  });

  it("should use custom separator", () => {
    expect(slugify("Hello World", { separator: "_" })).toBe("hello_world");
  });

  it("should respect maxLength", () => {
    const slug = slugify("This is a very long title that should be truncated", {
      maxLength: 20,
    });
    expect(slug.length).toBeLessThanOrEqual(20);
    expect(slug).not.toMatch(/-$/);
  });

  it("should preserve case when lowercase is false", () => {
    expect(slugify("Hello World", { lowercase: false })).toBe("Hello-World");
  });

  it("should handle numbers", () => {
    expect(slugify("Version 2.0 Release")).toBe("version-2-0-release");
  });

  it("should collapse consecutive separators", () => {
    expect(slugify("Hello---World")).toBe("hello-world");
  });

  it("should handle mixed content", () => {
    expect(slugify("NestJS + TypeORM = Awesome!")).toBe("nestjs-typeorm-awesome");
  });
});
