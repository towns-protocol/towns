/**
 * Common image mimetypes.
 * Based on https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types#image_types
 * excluding image/svg+xml
 */

const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/avif',
    'image/webp',
    'image/gif',
    'image/apng',
]

export function isMediaMimeType(mimetype: string): boolean {
    return allowedMimeTypes.includes(mimetype)
}
