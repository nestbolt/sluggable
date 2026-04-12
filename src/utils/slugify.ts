export interface SlugifyOptions {
  /** Word separator. Default: '-' */
  separator?: string;
  /** Max length for the slug. Default: 255 */
  maxLength?: number;
  /** Lowercase the slug. Default: true */
  lowercase?: boolean;
}

/**
 * Convert a string into a URL-friendly slug.
 *
 * Assumes input has already been transliterated if needed.
 * Replaces non-alphanumeric characters with separator, collapses runs,
 * trims edges, and truncates to maxLength without splitting mid-word.
 */
export function slugify(input: string, options?: SlugifyOptions): string {
  const separator = options?.separator ?? "-";
  const maxLength = options?.maxLength ?? 255;
  const lowercase = options?.lowercase ?? true;

  let slug = input;

  if (lowercase) {
    slug = slug.toLowerCase();
  }

  // Replace non-alphanumeric characters with separator
  slug = slug.replace(/[^a-zA-Z0-9]+/g, separator);

  // Collapse consecutive separators
  if (separator) {
    const escaped = separator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    slug = slug.replace(new RegExp(`${escaped}+`, "g"), separator);
  }

  // Trim leading/trailing separators
  if (separator) {
    const escaped = separator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    slug = slug.replace(new RegExp(`^${escaped}|${escaped}$`, "g"), "");
  }

  // Truncate to maxLength without splitting mid-word
  if (slug.length > maxLength) {
    slug = slug.substring(0, maxLength);
    // Don't leave a trailing separator
    if (separator) {
      const lastSep = slug.lastIndexOf(separator);
      if (lastSep > 0 && slug.length === maxLength) {
        slug = slug.substring(0, lastSep);
      }
    }
  }

  return slug;
}
