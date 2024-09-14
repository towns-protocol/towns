import { FastifyReply, FastifyRequest } from 'fastify'
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
})

const CACHE_CONTROL = {
	307: 'public, max-age=30, s-maxage=3600',
	'4xx': 'public, max-age=30, s-maxage=3600',
}

export async function fetchSpaceImage(request: FastifyRequest, reply: FastifyReply) {
	const logger = request.log.child({ name: fetchSpaceImage.name })

	const parseResult = paramsSchema.safeParse(request.params)

	if (!parseResult.success) {
		const errorMessage = parseResult.error.errors[0]?.message || 'Invalid parameters'
		logger.info(errorMessage)
		return reply
			.code(400)
			.header('Cache-Control', CACHE_CONTROL['4xx'])
			.send({ error: 'Bad Request', message: errorMessage })
	}

	const { spaceAddress } = parseResult.data
	logger.info({ spaceAddress }, 'Fetching space image')

	let stream: StreamStateView | undefined
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
		return reply
			.code(404)
			.header('Cache-Control', CACHE_CONTROL['4xx'])
			.send('Stream not found')
	}

	if (!stream) {
		return reply
			.code(404)
			.header('Cache-Control', CACHE_CONTROL['4xx'])
			.send('Stream not found')
	}

	// get the image metatdata from the stream
	const spaceImage = await getSpaceImage(stream)
	if (!spaceImage) {
		return reply
			.code(404)
			.header('Cache-Control', CACHE_CONTROL['4xx'])
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
				.header('Cache-Control', CACHE_CONTROL['4xx'])
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
			.header('Cache-Control', CACHE_CONTROL['4xx'])
			.send('Failed to get encryption key or iv')
	}
}

export async function getSpaceImage(
	streamView: StreamStateView,
): Promise<ChunkedMedia | undefined> {
	if (streamView.contentKind !== 'spaceContent') {
		return undefined
	}
	return streamView.spaceContent.getSpaceImage()
}
