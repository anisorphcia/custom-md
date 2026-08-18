export interface SafeUrlResult {
  safe: boolean;
  url?: string;
}

const EXPLICIT_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/;
const ALLOWED_SCHEMES = new Set(["http:", "https:"]);

export function sanitizeUrl(rawUrl: string): SafeUrlResult {
  const value = rawUrl.trim();
  // biome-ignore lint/suspicious/noControlCharactersInRegex: URL schemes must be checked without ASCII control characters.
  const schemeProbe = value.replace(/[\u0000-\u0020\u007f]+/g, "");
  if (!value) {
    return { safe: false };
  }

  if (
    value.startsWith("/") ||
    value.startsWith("./") ||
    value.startsWith("../") ||
    value.startsWith("#") ||
    value.startsWith("?")
  ) {
    return { safe: true, url: value };
  }

  if (!EXPLICIT_SCHEME.test(schemeProbe)) {
    return { safe: true, url: value };
  }

  try {
    const parsed = new URL(schemeProbe);
    return ALLOWED_SCHEMES.has(parsed.protocol) ? { safe: true, url: value } : { safe: false };
  } catch {
    return { safe: false };
  }
}
