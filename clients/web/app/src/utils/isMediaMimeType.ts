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
    'video/mp4',
    'video/webm',
    'video/mpeg',
    'video/ogg',
    'video/quicktime',
]

export function isMediaMimeType(mimetype: string): boolean {
    return isImageMimeType(mimetype) || isVideoMimeType(mimetype)
}

export function isImageMimeType(mimetype: string): boolean {
    return mimetype?.startsWith('image/') && allowedMimeTypes.includes(mimetype)
}

export function isVideoMimeType(mimetype: string): boolean {
    return mimetype?.startsWith('video/') //&& allowedMimeTypes.includes(mimetype)
}
