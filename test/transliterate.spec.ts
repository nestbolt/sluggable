import { describe, it, expect } from "vitest";
import { transliterate } from "../src/utils/transliterate";

describe("transliterate()", () => {
  it("should pass through ASCII text unchanged", () => {
    expect(transliterate("Hello World")).toBe("Hello World");
  });

  it("should transliterate accented Latin characters", () => {
    expect(transliterate("café")).toBe("cafe");
    expect(transliterate("über")).toBe("ueber");
    expect(transliterate("naïve")).toBe("naive");
    expect(transliterate("résumé")).toBe("resume");
  });

  it("should transliterate German characters", () => {
    expect(transliterate("Ä")).toBe("Ae");
    expect(transliterate("ö")).toBe("oe");
    expect(transliterate("ü")).toBe("ue");
    expect(transliterate("ß")).toBe("ss");
  });

  it("should transliterate Arabic characters", () => {
    expect(transliterate("مرحبا")).toBe("mrhba");
    expect(transliterate("بسم")).toBe("bsm");
  });

  it("should transliterate Cyrillic characters", () => {
    expect(transliterate("Привет")).toBe("Privet");
    expect(transliterate("Москва")).toBe("Moskva");
  });

  it("should transliterate Eastern European characters", () => {
    expect(transliterate("Łódź")).toBe("Lodz");
    expect(transliterate("České")).toBe("Ceske");
  });

  it("should handle mixed scripts", () => {
    const result = transliterate("Hello مرحبا World");
    expect(result).toBe("Hello mrhba World");
  });

  it("should handle empty string", () => {
    expect(transliterate("")).toBe("");
  });

  it("should preserve non-mapped characters", () => {
    expect(transliterate("Hello 123!")).toBe("Hello 123!");
  });
});
