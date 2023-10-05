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

export function filterAllowedMediaFiles(files: File[]): File[] {
    return files.filter((file) => {
        return allowedMimeTypes.includes(file.type)
    })
}
