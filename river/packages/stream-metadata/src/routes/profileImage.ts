import { FastifyReply, FastifyRequest } from 'fastify'
import { ChunkedMedia } from '@river-build/proto'
import { StreamPrefix, StreamStateView, makeStreamId } from '@river-build/sdk'
import { z } from 'zod'
import { bin_toHexString } from '@river-build/dlog'

import { getStream } from '../riverStreamRpcClient'
import { isValidEthereumAddress } from '../validators'
import { getMediaEncryption } from '../media-encryption'
import { config } from '../environment'

const paramsSchema = z.object({
	userId: z.string().min(1, 'userId parameter is required').refine(isValidEthereumAddress, {
		message: 'Invalid userId',
	}),
})

export async function fetchUserProfileImage(request: FastifyRequest, reply: FastifyReply) {
	const logger = request.log.child({ name: fetchUserProfileImage.name })
	const parseResult = paramsSchema.safeParse(request.params)

	if (!parseResult.success) {
		const errorMessage = parseResult.error.errors[0]?.message || 'Invalid parameters'
		logger.info(errorMessage)
		return reply.code(400).send({ error: 'Bad Request', message: errorMessage })
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
				error,
				userId,
			},
			'Failed to get stream',
		)
		return reply.code(404).send('Stream not found')
	}

	// get the image metadata from the stream
	const profileImage = await getUserProfileImage(stream)
	if (!profileImage) {
		return reply.code(404).send('profileImage not found')
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
			return reply.code(422).send('Failed to get encryption key or iv')
		}
		const redirectUrl = `${config.streamMetadataBaseUrl}/media/${
			profileImage.streamId
		}?key=${bin_toHexString(key)}&iv=${bin_toHexString(iv)}`

		return reply.redirect(redirectUrl)
	} catch (error) {
		logger.error(
			{
				error,
				userId,
				mediaStreamId: profileImage.streamId,
			},
			'Failed to get encryption key or iv',
		)
		return reply.code(422).send('Failed to get encryption key or iv')
	}
}

async function getUserProfileImage(streamView: StreamStateView): Promise<ChunkedMedia | undefined> {
	if (streamView.contentKind !== 'userMetadataContent') {
		return undefined
	}

	const userImage = await streamView.userMetadataContent.getProfileImage()
	return userImage
}
