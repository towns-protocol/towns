import { FastifyReply, FastifyRequest } from 'fastify'
import { StreamPrefix, StreamStateView, makeStreamId, isSpaceStreamId } from '@towns-protocol/sdk'
import { MembershipOp } from '@towns-protocol/proto'
import { z } from 'zod'
import { SpaceAddressFromSpaceId, type ISpaceOwnerBase } from '@towns-protocol/web3'

import { getStream } from '../riverStreamRpcClient'
import { isValidEthereumAddress } from '../validators'
import { config } from '../environment'
import { spaceDapp } from '../contract-utils'

const paramsSchema = z.object({
	userId: z.string().min(1, 'userId parameter is required').refine(isValidEthereumAddress, {
		message: 'Invalid userId',
	}),
})

const CACHE_CONTROL = {
	200: 'public, max-age=30, s-maxage=3600, stale-while-revalidate=3600',
	404: 'public, max-age=5, s-maxage=3600',
}

export async function fetchUserSpaces(request: FastifyRequest, reply: FastifyReply) {
	const logger = request.log.child({ name: fetchUserSpaces.name })
	const parseResult = paramsSchema.safeParse(request.params)

	if (!parseResult.success) {
		const errorMessage = parseResult.error.errors[0]?.message || 'Invalid parameters'
		logger.info(errorMessage)
		return reply.code(400).send({ error: 'Bad Request', message: errorMessage })
	}

	const { userId } = parseResult.data

	logger.info({ userId }, 'Fetching user spaces')

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

	const spaceIds = getUserSpaces(stream)
	if (!spaceIds) {
		logger.info({ userId, streamId: stream.streamId }, 'user spaces not found')
		return reply
			.code(404)
			.header('Cache-Control', CACHE_CONTROL[404])
			.send('user spaces not found')
	}

	const spaceInfoMap = new Map<string, ISpaceOwnerBase.SpaceStructOutput>()
	await Promise.all(
		spaceIds.map(async (spaceId) => {
			const spaceAddress = SpaceAddressFromSpaceId(spaceId)
			const spaceInfo = await spaceDapp.spaceOwner.getSpaceInfo(spaceAddress)
			spaceInfoMap.set(spaceAddress, spaceInfo)
		}),
	)

	const spaces = spaceIds.map((spaceId) => {
		const spaceAddress = SpaceAddressFromSpaceId(spaceId)
		const spaceInfo = spaceInfoMap.get(spaceAddress)

		return {
			spaceId,
			spaceAddress,
			name: spaceInfo?.name,
			description: spaceInfo?.longDescription,
			motto: spaceInfo?.shortDescription,
			image: `${config.streamMetadataBaseUrl}/space/${spaceAddress}/image`,
		}
	})
	return reply
		.header('Content-Type', 'application/json')
		.header('Cache-Control', CACHE_CONTROL[200])
		.send({ spaces })
}

function getUserSpaces(streamView: StreamStateView): string[] | undefined {
	if (streamView.contentKind !== 'userContent') {
		return undefined
	}

	const memberships = streamView.userContent.streamMemberships
	if (!memberships) {
		return []
	}

	// Extract space IDs where user has joined
	const spaceIds = Object.entries(memberships)
		.filter(
			([streamId, membership]) =>
				isSpaceStreamId(streamId) && membership?.op === MembershipOp.SO_JOIN,
		)
		.map(([streamId]) => streamId)
		.sort()

	return spaceIds
}
