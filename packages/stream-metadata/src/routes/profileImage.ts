import { FastifyReply, FastifyRequest } from 'fastify'
import { ChunkedMedia } from '@towns-protocol/proto'
import { StreamPrefix, StreamStateView, makeStreamId } from '@towns-protocol/sdk'
import { z } from 'zod'
import { bin_toHexString } from '@towns-protocol/dlog'

import { getStream } from '../riverStreamRpcClient'
import { isValidEthereumAddress } from '../validators'
import { getMediaEncryption } from '../media-encryption'
import { config } from '../environment'

const paramsSchema = z.object({
	userId: z.string().min(1, 'userId parameter is required').refine(isValidEthereumAddress, {
		message: 'Invalid userId',
	}),
})

const CACHE_CONTROL = {
	// Client caches for 30s, uses cached version for up to 7 days while revalidating in background
	307: 'public, max-age=30, s-maxage=3600, stale-while-revalidate=604800',
	400: 'public, max-age=30, s-maxage=3600',
	404: 'public, max-age=5, s-maxage=3600', // 5s max-age to avoid user showing themselves a broken image during client creation flow
	422: 'public, max-age=30, s-maxage=3600',
}

export async function fetchUserProfileImage(request: FastifyRequest, reply: FastifyReply) {
	const logger = request.log.child({ name: fetchUserProfileImage.name })
	const parseResult = paramsSchema.safeParse(request.params)

	if (!parseResult.success) {
		const errorMessage = parseResult.error.errors[0]?.message || 'Invalid parameters'
		logger.info(errorMessage)
		return reply
			.code(400)
			.header('Cache-Control', CACHE_CONTROL[400])
			.send({ error: 'Bad Request', message: errorMessage })
	}

	const { userId } = parseResult.data

	logger.info({ userId }, 'Fetching user image')
	let stream: StreamStateView | undefined
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
		return reply.code(500).send('Failed to get stream')
	}

	if (!stream) {
		logger.info({ userId }, 'Stream not found')
		return reply.code(404).header('Cache-Control', CACHE_CONTROL[404]).send('Stream not found')
	}

	// get the image metadata from the stream
	const profileImage = await getUserProfileImage(stream)
	if (!profileImage) {
		logger.info({ userId, streamId: stream.streamId }, 'profileImage not found')
		return reply
			.code(404)
			.header('Cache-Control', CACHE_CONTROL[404])
			.send('profileImage not found')
	}

	try {
		const { key, iv } = getMediaEncryption(logger, profileImage)
		if (key?.length === 0) {
			logger.error(
				{
					key: 'no key',
					userId,
					mediaStreamId: profileImage.streamId,
				},
				'Invalid key',
			)
			return reply
				.code(422)
				.header('Cache-Control', CACHE_CONTROL[422])
				.send('Failed to get encryption key')
		}

		// Construct redirect URL with preserved query parameters
		const queryParams = new URLSearchParams(request.query as Record<string, string>)
		queryParams.set('key', bin_toHexString(key))
		queryParams.set('iv', bin_toHexString(iv))

		const redirectUrl = `${config.streamMetadataBaseUrl}/media/${profileImage.streamId}?${queryParams.toString()}`

		return (
			reply
				// client should cache the image for 30 seconds, and the CDN for 5 minutes
				// after 30 seconds, the client will check the CDN for a new image
				.header('Cache-Control', CACHE_CONTROL[307])
				.redirect(redirectUrl, 307)
		)
	} catch (error) {
		logger.error(
			{
				err: error,
				userId,
				mediaStreamId: profileImage.streamId,
			},
			'Failed to get encryption key',
		)
		return reply
			.code(422)
			.header('Cache-Control', CACHE_CONTROL[422])
			.send('Failed to get encryption key')
	}
}

async function getUserProfileImage(streamView: StreamStateView): Promise<ChunkedMedia | undefined> {
	if (streamView.contentKind !== 'userMetadataContent') {
		return undefined
	}

	const userImage = await streamView.userMetadataContent.getProfileImage()
	return userImage
}
