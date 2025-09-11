import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { isValidStreamId } from '@towns-protocol/sdk'
import { bin_fromHexString } from '@towns-protocol/dlog'

import { getMediaStreamContent } from '../riverStreamRpcClient'
import { parseSizeParam, processImage, shouldProcessImage } from '../imageProcessing'

const paramsSchema = z.object({
	mediaStreamId: z
		.string()
		.min(1, 'mediaStreamId parameter is required')
		.refine(isValidStreamId, {
			message: 'Invalid mediaStreamId format',
		}),
})

const querySchema = z.object({
	key: z
		.string()
		.min(1, 'key parameter is required')
		.transform((value) => bin_fromHexString(value)),
	iv: z
		.string()
		.transform((value) => bin_fromHexString(value))
		.optional(),
	size: z.string().optional(),
})

const CACHE_CONTROL = {
	200: 'public, max-age=31536000, immutable',
	'4xx': 'public, max-age=30, s-maxage=3600',
}

export async function fetchMedia(request: FastifyRequest, reply: FastifyReply) {
	const logger = request.log.child({ name: fetchMedia.name })

	const paramsResult = paramsSchema.safeParse(request.params)
	const queryResult = querySchema.safeParse(request.query)
	if (!paramsResult.success) {
		const errorMessage = paramsResult.error?.errors[0]?.message || 'Invalid parameters'
		logger.info(errorMessage)
		return reply
			.code(400)
			.header('Cache-Control', CACHE_CONTROL['4xx'])
			.send({ error: 'Bad Request', message: errorMessage })
	}
	if (!queryResult.success) {
		const errorMessage = queryResult.error?.errors[0]?.message || 'Invalid parameters'
		logger.info(errorMessage)
		return reply
			.code(400)
			.header('Cache-Control', CACHE_CONTROL['4xx'])
			.send({ error: 'Bad Request', message: errorMessage })
	}

	const { mediaStreamId } = paramsResult.data
	const { key, iv, size } = queryResult.data

	// Parse and validate size parameter
	const sizeOptions = parseSizeParam(size)
	if (!sizeOptions.isValid) {
		logger.info({ size }, 'Invalid size parameter format')
		return reply
			.code(400)
			.header('Cache-Control', CACHE_CONTROL['4xx'])
			.send({ error: 'Bad Request', message: 'Size must be in format WxH, xH, or Wx' })
	}

	logger.info({ mediaStreamId, key, iv, size, sizeOptions }, 'Fetching media stream content')

	try {
		const mediaContent = await getMediaStreamContent(logger, mediaStreamId, key, iv)
		if (!mediaContent) {
			return reply
				.code(404)
				.header('Cache-Control', CACHE_CONTROL['4xx'])
				.send('Media content not found')
		}
		const { data, mimeType } = mediaContent
		if (!data || !mimeType) {
			logger.error(
				{
					data: data ? 'has data' : 'no data',
					mimeType: mimeType ? mimeType : 'no mimeType',
					mediaStreamId,
				},
				'Invalid data or mimeType',
			)
			return reply
				.code(422)
				.header('Cache-Control', CACHE_CONTROL['4xx'])
				.send('Invalid data or mimeType')
		}

		let processedImageBuffer = Buffer.from(data)
		let outputMimeType = mimeType

		// Process image if size parameters provided and image type is processable
		if ((sizeOptions.width || sizeOptions.height) && shouldProcessImage(mimeType)) {
			try {
				const result = await processImage(logger, processedImageBuffer, mimeType, {
					width: sizeOptions.width,
					height: sizeOptions.height,
				})

				processedImageBuffer = result.buffer
				outputMimeType = result.mimeType

				logger.info(
					{
						wasProcessed: result.wasProcessed,
						isAnimated: result.isAnimated,
						outputMimeType,
					},
					result.isAnimated
						? 'Animated media GIF resized with animation preserved'
						: 'Static media processed to WebP successfully',
				)
			} catch (error) {
				logger.error(
					{
						err: error,
						mediaStreamId,
						targetWidth: sizeOptions.width,
						targetHeight: sizeOptions.height,
					},
					'Failed to process image, serving original',
				)
				// Continue with original image if processing fails
			}
		}

		// Determine cache control based on whether image was resized
		const cacheControl = CACHE_CONTROL[200]

		return reply
			.header('Content-Type', outputMimeType)
			.header('Cache-Control', cacheControl)
			.send(processedImageBuffer)
	} catch (error) {
		logger.error({ mediaStreamId, err: error }, 'Failed to fetch media stream content')

		return reply
			.code(404)
			.header('Cache-Control', CACHE_CONTROL['4xx'])
			.send({ error: 'Not Found', message: 'Failed to fetch media stream content' })
	}
}
