import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { SluggableModule } from "../src/sluggable.module";
import { SluggableService } from "../src/sluggable.service";
import { SLUGGABLE_OPTIONS } from "../src/sluggable.constants";

@Entity("test_posts")
class TestPost {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column({ default: "" })
  slug!: string;
}

describe("SluggableModule", () => {
  describe("forRoot()", () => {
    let module: TestingModule;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "better-sqlite3",
            database: ":memory:",
            entities: [TestPost],
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

    it("should provide SluggableService", () => {
      const service = module.get<SluggableService>(SluggableService);
      expect(service).toBeDefined();
    });

    it("should export SLUGGABLE_OPTIONS", () => {
      const options = module.get(SLUGGABLE_OPTIONS);
      expect(options).toEqual({});
    });
  });

  describe("forRoot() with options", () => {
    let module: TestingModule;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "better-sqlite3",
            database: ":memory:",
            entities: [TestPost],
            synchronize: true,
          }),
          SluggableModule.forRoot({
            separator: "_",
            maxLength: 100,
            lowercase: true,
            transliterate: true,
            onUpdate: "regenerate",
          }),
        ],
      }).compile();

      await module.init();
    });

    afterEach(async () => {
      await module?.close();
    });

    it("should store options correctly", () => {
      const service = module.get<SluggableService>(SluggableService);
      const options = service.getOptions();
      expect(options.separator).toBe("_");
      expect(options.maxLength).toBe(100);
      expect(options.onUpdate).toBe("regenerate");
    });
  });

  describe("forRootAsync()", () => {
    let module: TestingModule;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "better-sqlite3",
            database: ":memory:",
            entities: [TestPost],
            synchronize: true,
          }),
          SluggableModule.forRootAsync({
            useFactory: () => ({
              separator: "-",
              maxLength: 200,
            }),
          }),
        ],
      }).compile();

      await module.init();
    });

    afterEach(async () => {
      await module?.close();
    });

    it("should provide SluggableService", () => {
      const service = module.get<SluggableService>(SluggableService);
      expect(service).toBeDefined();
    });

    it("should resolve options from factory", () => {
      const service = module.get<SluggableService>(SluggableService);
      expect(service.getOptions().maxLength).toBe(200);
    });
  });
});
