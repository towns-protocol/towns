import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { isValidStreamId } from '@towns-protocol/sdk'
import { bin_fromHexString } from '@towns-protocol/dlog'
import sharp from 'sharp'

import { getMediaStreamContent } from '../riverStreamRpcClient'

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
	size: z.enum(['thumbnail', 'small', 'medium', 'original']).optional().default('original'),
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
	logger.info({ mediaStreamId, key, iv, size }, 'Fetching media stream content')

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

		let processedData = Buffer.from(data)
		
		if (size !== 'original' && mimeType.startsWith('image/')) {
			try {
				const dimensions = getSizeDimensions(size)
				processedData = await sharp(processedData)
					.resize(dimensions.width, dimensions.height, { fit: 'cover' })
					.toBuffer()
			} catch (error) {
				logger.warn({ mediaStreamId, size, err: error }, 'Failed to resize image, serving original')
			}
		}

		return reply
			.header('Content-Type', mimeType)
			.header('Cache-Control', CACHE_CONTROL[200])
			.send(processedData)
	} catch (error) {
		logger.error({ mediaStreamId, err: error }, 'Failed to fetch media stream content')

		return reply
			.code(404)
			.header('Cache-Control', CACHE_CONTROL['4xx'])
			.send({ error: 'Not Found', message: 'Failed to fetch media stream content' })
	}
}

function getSizeDimensions(size: string): { width: number; height: number } {
	switch (size) {
		case 'thumbnail':
			return { width: 32, height: 32 }
		case 'small':
			return { width: 64, height: 64 }
		case 'medium':
			return { width: 128, height: 128 }
		default:
			return { width: 256, height: 256 }
	}
}
