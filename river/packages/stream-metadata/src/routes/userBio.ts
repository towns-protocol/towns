import { FastifyReply, FastifyRequest } from 'fastify'
import { StreamPrefix, StreamStateView, makeStreamId } from '@river-build/sdk'
import { z } from 'zod'

import { getStream } from '../riverStreamRpcClient'
import { isValidEthereumAddress } from '../validators'

const paramsSchema = z.object({
	userId: z.string().min(1, 'userId parameter is required'),
})

const CACHE_CONTROL = {
	// cache for 1 year, allow data usage for 1 hour while revalidating
	200: 'public, max-age=31536000, stale-while-revalidate=3600',
	404: 'public, max-age=5, s-maxage=3600',
}

export async function fetchUserBio(request: FastifyRequest, reply: FastifyReply) {
	const logger = request.log.child({ name: fetchUserBio.name })
	const parseResult = paramsSchema.safeParse(request.params)

	if (!parseResult.success) {
		const errorMessage = parseResult.error.errors[0]?.message || 'Invalid parameters'
		logger.info(errorMessage)
		return reply.code(400).send({ error: 'Bad Request', message: errorMessage })
	}

	const { userId } = parseResult.data

	if (!isValidEthereumAddress(userId)) {
		logger.info({ userId }, 'Invalid userId')
		return reply.code(400).send({ error: 'Bad Request', message: 'Invalid userId' })
	}

	logger.info({ userId }, 'Fetching user bio')

	let stream: StreamStateView
	try {
		const userMetadataStreamId = makeStreamId(StreamPrefix.UserMetadata, userId)
		stream = await getStream(logger, userMetadataStreamId)
	} catch (error) {
		logger.error(
			{
				err: error,
				userId,
			},
			'Failed to get stream',
		)
		return reply.code(404).header('Cache-Control', CACHE_CONTROL[404]).send('Stream not found')
	}

	const protobufBio = await getUserBio(stream)
	if (!protobufBio) {
		logger.info({ userId, streamId: stream.streamId }, 'bio not found')
		return reply.code(404).header('Cache-Control', CACHE_CONTROL[404]).send('bio not found')
	}
	const bio = protobufBio.bio

	return reply
		.header('Content-Type', 'application/json')
		.header('Cache-Control', CACHE_CONTROL[200])
		.send({ bio })
}

async function getUserBio(streamView: StreamStateView) {
	if (streamView.contentKind !== 'userMetadataContent') {
		return undefined
	}
	return streamView.userMetadataContent.getBio()
}
