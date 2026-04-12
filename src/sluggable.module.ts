import { DynamicModule, Module, type Provider } from "@nestjs/common";
import { SLUGGABLE_OPTIONS } from "./sluggable.constants";
import { SluggableService } from "./sluggable.service";
import { SluggableSubscriber } from "./sluggable.subscriber";
import type {
  SluggableModuleOptions,
  SluggableAsyncOptions,
} from "./interfaces/sluggable-options.interface";

@Module({})
export class SluggableModule {
  static forRoot(options: SluggableModuleOptions = {}): DynamicModule {
    const providers: Provider[] = [
      { provide: SLUGGABLE_OPTIONS, useValue: options },
      SluggableService,
      SluggableSubscriber,
    ];

    return {
      module: SluggableModule,
      global: true,
      providers,
      exports: [SluggableService, SLUGGABLE_OPTIONS],
    };
  }

  static forRootAsync(asyncOptions: SluggableAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: SLUGGABLE_OPTIONS,
        useFactory: asyncOptions.useFactory,
        inject: asyncOptions.inject ?? [],
      },
      SluggableService,
      SluggableSubscriber,
    ];

    return {
      module: SluggableModule,
      global: true,
      imports: [...(asyncOptions.imports ?? [])],
      providers,
      exports: [SluggableService, SLUGGABLE_OPTIONS],
    };
  }
}
