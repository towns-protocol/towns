import { FastifyReply, FastifyRequest, type FastifyBaseLogger } from 'fastify'
import { ChunkedMedia } from '@river-build/proto'
import { StreamPrefix, StreamStateView, makeStreamId } from '@river-build/sdk'
import { z } from 'zod'
import { bin_toHexString } from '@river-build/dlog'

import { config } from '../environment'
import { getStream } from '../riverStreamRpcClient'
import { isValidEthereumAddress } from '../validators'
import { getMediaEncryption } from '../media-encryption'

const paramsSchema = z.object({
	spaceAddress: z
		.string()
		.min(1, 'spaceAddress parameter is required')
		.refine(isValidEthereumAddress, {
			message: 'Invalid spaceAddress format',
		}),
	eventId: z.string().optional(),
})

const CACHE_CONTROL = {
	// Client caches for 30s, uses cached version for up to 7 days while revalidating in background
	307: 'public, max-age=30, s-maxage=3600, stale-while-revalidate=604800',
	400: 'public, max-age=30, s-maxage=3600',
	404: 'public, max-age=5, s-maxage=3600', // 5s max-age to avoid client's rendering broken images during town creation flow
	422: 'public, max-age=30, s-maxage=3600',
}

export async function fetchSpaceImage(request: FastifyRequest, reply: FastifyReply) {
	const logger = request.log.child({ name: fetchSpaceImage.name })

	const parseResult = paramsSchema.safeParse(request.params)

	if (!parseResult.success) {
		const errorMessage = parseResult.error.errors[0]?.message || 'Invalid parameters'
		logger.info(errorMessage)
		return reply
			.code(400)
			.header('Cache-Control', CACHE_CONTROL[400])
			.send({ error: 'Bad Request', message: errorMessage })
	}

	const { spaceAddress, eventId } = parseResult.data
	logger.info({ spaceAddress, eventId }, 'Fetching space image')

	let stream: StreamStateView
	try {
		const streamId = makeStreamId(StreamPrefix.Space, spaceAddress)
		stream = await getStream(logger, streamId)
	} catch (error) {
		logger.error(
			{
				error,
				spaceAddress,
			},
			'Failed to get stream',
		)
		return reply.code(404).header('Cache-Control', CACHE_CONTROL[404]).send('Stream not found')
	}

	// get the image metatdata from the stream
	const spaceImage = await getSpaceImage(logger, stream)
	if (!spaceImage) {
		logger.error({ spaceAddress, streamId: stream.streamId }, 'spaceImage not found')
		return reply
			.code(404)
			.header('Cache-Control', CACHE_CONTROL[400])
			.send('spaceImage not found')
	}

	try {
		const { key, iv } = getMediaEncryption(logger, spaceImage)
		if (key?.length === 0 || iv?.length === 0) {
			logger.error(
				{
					key: key?.length === 0 ? 'has key' : 'no key',
					iv: iv?.length === 0 ? 'has iv' : 'no iv',
					spaceAddress,
					mediaStreamId: spaceImage.streamId,
				},
				'Invalid key or iv',
			)
			return reply
				.code(422)
				.header('Cache-Control', CACHE_CONTROL[422])
				.send('Failed to get encryption key or iv')
		}
		const redirectUrl = `${config.streamMetadataBaseUrl}/media/${
			spaceImage.streamId
		}?key=${bin_toHexString(key)}&iv=${bin_toHexString(iv)}`

		return reply.header('Cache-Control', CACHE_CONTROL[307]).redirect(redirectUrl, 307)
	} catch (error) {
		logger.error(
			{
				error,
				spaceAddress,
				mediaStreamId: spaceImage.streamId,
			},
			'Failed to get encryption key or iv',
		)
		return reply
			.code(422)
			.header('Cache-Control', CACHE_CONTROL['422'])
			.send('Failed to get encryption key or iv')
	}
}

export async function getSpaceImage(
	logger: FastifyBaseLogger,
	streamView: StreamStateView,
): Promise<ChunkedMedia | undefined> {
	if (streamView.contentKind !== 'spaceContent') {
		logger.error({ streamView }, 'stream view is not a space content')
		return undefined
	}
	return streamView.spaceContent.getSpaceImage()
}
