import sharp from 'sharp'
import type { FastifyBaseLogger } from 'fastify'

export interface ImageSizeOptions {
	width?: number
	height?: number
}

export interface ProcessedImageResult {
	buffer: Buffer
	mimeType: string
	wasProcessed: boolean
	isAnimated: boolean
}

export interface ParsedSizeParam {
	width?: number
	height?: number
	isValid: boolean
}

/**
 * Parses size parameter in format "WxH", "xH", or "Wx"
 * Examples: "200x200", "x150", "300x"
 */
export function parseSizeParam(size?: string): ParsedSizeParam {
	if (!size) {
		return { isValid: true } // No size param is valid (original size)
	}

	const sizeRegex = /^(\d*)x(\d*)$/i
	const match = size.match(sizeRegex)

	if (!match) {
		return { isValid: false }
	}

	const [, widthStr, heightStr] = match

	// At least one dimension must be specified
	if (!widthStr && !heightStr) {
		return { isValid: false }
	}

	const width = widthStr ? parseInt(widthStr, 10) : undefined
	const height = heightStr ? parseInt(heightStr, 10) : undefined

	// Validate that parsed numbers are positive
	if (width !== undefined && width <= 0) {
		return { isValid: false }
	}
	if (height !== undefined && height <= 0) {
		return { isValid: false }
	}

	// Set reasonable limits
	const MAX_DIMENSION = 4096
	if (width !== undefined && width > MAX_DIMENSION) {
		return { isValid: false }
	}
	if (height !== undefined && height > MAX_DIMENSION) {
		return { isValid: false }
	}

	return {
		width,
		height,
		isValid: true,
	}
}

/**
 * Resizes an image buffer using Sharp and handles animated content properly
 */
export async function processImage(
	logger: FastifyBaseLogger,
	imageBuffer: Buffer,
	originalMimeType: string,
	options: ImageSizeOptions,
): Promise<ProcessedImageResult> {
	try {
		// For GIFs, we need to explicitly handle animation
		const isGif = originalMimeType.toLowerCase() === 'image/gif'
		let sharpInstance = sharp(imageBuffer, isGif ? { animated: true } : {})

		// Get metadata to check for animation
		const metadata = await sharpInstance.metadata()
		const isAnimated = metadata.pages && metadata.pages > 1

		logger.info(
			{
				format: metadata.format,
				pages: metadata.pages,
				isAnimated,
				isGif,
				originalWidth: metadata.width,
				originalHeight: metadata.height,
			},
			'Image metadata detected',
		)

		// For animated images, resize and output as GIF to preserve animation
		if (isAnimated) {
			logger.info('Detected animated image - resizing while preserving animation')

			if (options.width || options.height) {
				sharpInstance = sharpInstance.resize(options.width, options.height, {
					fit: 'inside',
					withoutEnlargement: true,
				})
			}

			// Output as GIF to preserve animation
			const processedBuffer = await sharpInstance.gif().toBuffer()

			return {
				buffer: processedBuffer,
				mimeType: 'image/gif',
				wasProcessed: true,
				isAnimated: true,
			}
		}

		// For static images, resize and convert to WebP
		if (options.width || options.height) {
			sharpInstance = sharpInstance.resize(options.width, options.height, {
				fit: 'inside',
				withoutEnlargement: true, // Don't upscale smaller images
			})
		}

		// Convert static image to WebP
		const processedBuffer = await sharpInstance
			.webp({
				quality: 85,
				effort: 4,
			})
			.toBuffer()

		logger.info(
			{
				originalSize: imageBuffer.length,
				processedSize: processedBuffer.length,
				targetWidth: options.width,
				targetHeight: options.height,
				isAnimated,
				compressionRatio:
					(
						((imageBuffer.length - processedBuffer.length) / imageBuffer.length) *
						100
					).toFixed(1) + '%',
			},
			'Static image processed successfully',
		)

		return {
			buffer: processedBuffer,
			mimeType: 'image/webp',
			wasProcessed: true,
			isAnimated: false,
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)

		logger.error(
			{
				err: error,
				errorMessage,
				targetWidth: options.width,
				targetHeight: options.height,
				bufferSize: imageBuffer.length,
			},
			'Failed to process image',
		)
		throw new Error('Image processing failed')
	}
}

/**
 * Legacy function for backwards compatibility - use processImage instead
 */
export async function resizeImage(
	logger: FastifyBaseLogger,
	imageBuffer: Buffer,
	options: ImageSizeOptions,
): Promise<Buffer> {
	const result = await processImage(logger, imageBuffer, 'image/unknown', options)
	return result.buffer
}

/**
 * Determines if an image should be processed based on its mime type
 */
export function shouldProcessImage(mimeType: string): boolean {
	const processableMimeTypes = [
		'image/jpeg',
		'image/jpg',
		'image/png',
		'image/webp',
		'image/tiff',
		'image/bmp',
		'image/gif', // Sharp can handle GIFs including animated ones
	]

	return processableMimeTypes.includes(mimeType.toLowerCase())
}
