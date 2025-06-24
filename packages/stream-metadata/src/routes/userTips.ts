import { FastifyReply, FastifyRequest } from 'fastify'
import { StreamPrefix, StreamStateView, makeStreamId } from '@towns-protocol/sdk'
import { z } from 'zod'

import { getStream } from '../riverStreamRpcClient'
import { isValidEthereumAddress } from '../validators'

const paramsSchema = z.object({
	userId: z.string().min(1, 'userId parameter is required'),
})

export interface UserTips {
	sent: Record<string, string>
	received: Record<string, string>
	sentCount: Record<string, string>
	receivedCount: Record<string, string>
}

export interface UserTipsResponsePayload {
	tips: UserTips
}

const CACHE_CONTROL = {
	200: 'public, max-age=30, s-maxage=300, stale-while-revalidate=300',
	404: 'public, max-age=5, s-maxage=300',
}

export async function fetchUserTips(request: FastifyRequest, reply: FastifyReply) {
	const logger = request.log.child({ name: fetchUserTips.name })
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

	logger.info({ userId }, 'Fetching user tips')

	let stream: StreamStateView | undefined
	try {
		const userStreamId = makeStreamId(StreamPrefix.User, userId)
		stream = await getStream(logger, userStreamId)
	} catch (error) {
		logger.error(
			{
				err: error,
				userId,
			},
			'Failed to get stream',
		)
		return reply.code(500).send('Failed to get stream')
	}

	if (!stream) {
		return reply.code(404).header('Cache-Control', CACHE_CONTROL[404]).send('Stream not found')
	}

	const tips = getUserTips(stream)
	if (!tips) {
		logger.info({ userId, streamId: stream.streamId }, 'tips not found')
		return reply.code(404).header('Cache-Control', CACHE_CONTROL[404]).send('tips not found')
	}

	return reply
		.header('Content-Type', 'application/json')
		.header('Cache-Control', CACHE_CONTROL[200])
		.send({ tips })
}

function getUserTips(streamView: StreamStateView): UserTips {
	if (streamView.contentKind !== 'userContent') {
		throw new Error('Stream is not a user stream')
	}
	return {
		sent: formatBigIntToString(streamView.userContent.tipsSent),
		received: formatBigIntToString(streamView.userContent.tipsReceived),
		sentCount: formatBigIntToString(streamView.userContent.tipsSentCount),
		receivedCount: formatBigIntToString(streamView.userContent.tipsReceivedCount),
	}
}

function formatBigIntToString(map: Record<string, bigint | undefined>): Record<string, string> {
	return Object.entries(map).reduce(
		(acc, [key, value]) => {
			if (value) {
				acc[key] = value.toString()
			}
			return acc
		},
		{} as Record<string, string>,
	)
}
