export interface SluggableModuleOptions {
  /** Default separator between words. Default: '-' */
  separator?: string;
  /** Max length for generated slugs. Default: 255 */
  maxLength?: number;
  /** Lowercase the slug. Default: true */
  lowercase?: boolean;
  /** Enable transliteration of non-Latin characters. Default: true */
  transliterate?: boolean;
  /** Custom transliteration function override. */
  transliterator?: (input: string) => string;
  /** Whether to regenerate slug on entity update. Default: 'keep' */
  onUpdate?: "regenerate" | "keep";
  /** Suffix separator for collision handling. Default: '-' */
  suffixSeparator?: string;
}

export interface SluggableAsyncOptions {
  imports?: any[];
  inject?: any[];
  useFactory: (...args: any[]) => Promise<SluggableModuleOptions> | SluggableModuleOptions;
}
