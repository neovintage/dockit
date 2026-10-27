import path from "path";

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".webp": "image/webp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
};

export function isSupportedFile(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() in CONTENT_TYPES;
}

export function contentTypeFor(filePath: string): string {
  return (
    CONTENT_TYPES[path.extname(filePath).toLowerCase()] ??
    "application/octet-stream"
  );
}

export function supportedExtensions(): string[] {
  return Object.keys(CONTENT_TYPES);
}
