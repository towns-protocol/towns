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

const querySchema = z.object({
	size: z.enum(['thumbnail', 'small', 'medium', 'original']).optional().default('original'),
})

const CACHE_CONTROL = {
	// Client caches for 30s, uses cached version for up to 7 days while revalidating in background
	307: 'public, max-age=30, s-maxage=3600, stale-while-revalidate=604800',
	400: 'public, max-age=30, s-maxage=3600',
	404: 'public, max-age=5, s-maxage=3600', // 5s max-age to avoid user showing themselves a broken image during client cration flow
	422: 'public, max-age=30, s-maxage=3600',
	200: 'public, max-age=31536000, immutable',
}

function shouldServeThumbnail(size: string): boolean {
	return size === 'thumbnail' || size === 'small'
}

export async function fetchUserProfileImage(request: FastifyRequest, reply: FastifyReply) {
	const logger = request.log.child({ name: fetchUserProfileImage.name })
	const parseResult = paramsSchema.safeParse(request.params)
	const queryResult = querySchema.safeParse(request.query)

	if (!parseResult.success) {
		const errorMessage = parseResult.error.errors[0]?.message || 'Invalid parameters'
		logger.info(errorMessage)
		return reply
			.code(400)
			.header('Cache-Control', CACHE_CONTROL[400])
			.send({ error: 'Bad Request', message: errorMessage })
	}

	if (!queryResult.success) {
		const errorMessage = queryResult.error.errors[0]?.message || 'Invalid query parameters'
		logger.info(errorMessage)
		return reply
			.code(400)
			.header('Cache-Control', CACHE_CONTROL[400])
			.send({ error: 'Bad Request', message: errorMessage })
	}

	const { userId } = parseResult.data
	const { size } = queryResult.data

	logger.info({ userId, size }, 'Fetching user image')
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

	if (shouldServeThumbnail(size) && profileImage.thumbnail?.content) {
		const thumbnailInfo = profileImage.thumbnail.info
		if (thumbnailInfo?.mimetype) {
			logger.info(
				{ userId, size, thumbnailSize: profileImage.thumbnail.content.length },
				'Serving thumbnail directly',
			)
			return reply
				.header('Content-Type', thumbnailInfo.mimetype)
				.header('Cache-Control', CACHE_CONTROL[200])
				.send(Buffer.from(profileImage.thumbnail.content))
		}
	}

	try {
		const { key, iv } = getMediaEncryption(logger, profileImage)
		if (key?.length === 0 || iv?.length === 0) {
			logger.error(
				{
					key: key?.length === 0 ? 'has key' : 'no key',
					iv: iv?.length === 0 ? 'has iv' : 'no iv',
					userId,
					mediaStreamId: profileImage.streamId,
				},
				'Invalid key or iv',
			)
			return reply
				.code(422)
				.header('Cache-Control', CACHE_CONTROL[422])
				.send('Failed to get encryption key or iv')
		}
		const redirectUrl = `${config.streamMetadataBaseUrl}/media/${
			profileImage.streamId
		}?key=${bin_toHexString(key)}&iv=${bin_toHexString(iv)}&size=${size}`

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
			'Failed to get encryption key or iv',
		)
		return reply
			.code(422)
			.header('Cache-Control', CACHE_CONTROL[422])
			.send('Failed to get encryption key or iv')
	}
}

async function getUserProfileImage(streamView: StreamStateView): Promise<ChunkedMedia | undefined> {
	if (streamView.contentKind !== 'userMetadataContent') {
		return undefined
	}

	const userImage = await streamView.userMetadataContent.getProfileImage()
	return userImage
}
