import { FastifyReply, FastifyRequest } from 'fastify'
import { StreamPrefix, StreamStateView, makeStreamId } from '@river-build/sdk'

import { getStream } from '../riverStreamRpcClient'
import { isValidEthereumAddress } from '../validators'

export async function fetchUserBio(request: FastifyRequest, reply: FastifyReply) {
	const logger = request.log.child({ name: fetchUserBio.name })
	const { userId } = request.params as { userId?: string }

	if (!userId) {
		logger.info('userId parameter is required')
		return reply
			.code(400)
			.send({ error: 'Bad Request', message: 'userId parameter is required' })
	}

	if (!isValidEthereumAddress(userId)) {
		logger.info({ userId }, 'Invalid userId')
		return reply.code(400).send({ error: 'Bad Request', message: 'Invalid userId' })
	}

	logger.info({ userId }, 'Fetching user bio')

	let stream: StreamStateView | undefined
	try {
		const userMetadataStreamId = makeStreamId(StreamPrefix.UserMetadata, userId)
		stream = await getStream(logger, userMetadataStreamId)
	} catch (error) {
		logger.error(
			{
				error,
				userId,
			},
			'Failed to get stream',
		)
		return reply.code(404).send('Stream not found')
	}

	if (!stream) {
		return reply.code(404).send('Stream not found')
	}

	const bio = await getUserBio(stream)

	if (!bio) {
		return reply.code(404).send('bio not found')
	}

	return reply.header('Content-Type', 'application/json').send({ bio })
}

async function getUserBio(streamView: StreamStateView) {
	if (streamView.contentKind !== 'userMetadataContent') {
		return undefined
	}
	const bio = await streamView.userMetadataContent.getBio()
	return bio?.bio
}
