import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { isValidStreamId } from '@river-build/sdk'
import { bin_fromHexString } from '@river-build/dlog'

import { getMediaStreamContent } from '../riverStreamRpcClient'
import type { StreamIdHex } from '../types'

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
		.min(1, 'iv parameter is required')
		.transform((value) => bin_fromHexString(value)),
})

export async function fetchMedia(request: FastifyRequest, reply: FastifyReply) {
	const logger = request.log.child({ name: fetchMedia.name })

	const paramsResult = paramsSchema.safeParse(request.params)
	const queryResult = querySchema.safeParse(request.query)
	if (!paramsResult.success) {
		const errorMessage = paramsResult.error?.errors[0]?.message || 'Invalid parameters'
		logger.info(errorMessage)
		return reply.code(400).send({ error: 'Bad Request', message: errorMessage })
	}
	if (!queryResult.success) {
		const errorMessage = queryResult.error?.errors[0]?.message || 'Invalid parameters'
		logger.info(errorMessage)
		return reply.code(400).send({ error: 'Bad Request', message: errorMessage })
	}

	const { mediaStreamId } = paramsResult.data
	const { key, iv } = queryResult.data
	logger.info({ mediaStreamId, key, iv }, 'Fetching media stream content')
	const fullStreamId: StreamIdHex = `0x${mediaStreamId}`

	try {
		const { data, mimeType } = await getMediaStreamContent(logger, fullStreamId, key, iv)
		if (!data || !mimeType) {
			logger.error(
				{
					data: data ? 'has data' : 'no data',
					mimeType: mimeType ? mimeType : 'no mimeType',
					mediaStreamId,
				},
				'Invalid data or mimeType',
			)
			return reply.code(422).send('Invalid data or mimeType')
		}

		return (
			reply
				.header('Content-Type', mimeType)
				/**
				 * public: The response may be cached by any cache, including shared caches like a CDN.
				 * max-age=31536000: The response may be cached for up to 1 year. This is the maximum value for max-age.
				 */
				.header('Cache-Control', 'public, max-age=31536000')
				.send(Buffer.from(data))
		)
	} catch (error) {
		logger.error({ mediaStreamId, error }, 'Failed to fetch media stream content')
		// TODO: this should be a 500, not a 404.
		// Handle 404s explicitly in the block above. And give it a proper cache-control header.
		// And return a 500 here, and again, give it a proper cache-control header.
		return reply
			.code(404)
			.send({ error: 'Not Found', message: 'Failed to fetch media stream content' })
	}
}
