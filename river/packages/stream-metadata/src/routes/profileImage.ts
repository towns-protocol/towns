import { FastifyReply, FastifyRequest } from 'fastify'
import { ChunkedMedia } from '@river-build/proto'
import { StreamPrefix, StreamStateView, makeStreamId } from '@river-build/sdk'
import { z } from 'zod'

import { StreamIdHex } from '../types'
import { getMediaStreamContent, getStream } from '../riverStreamRpcClient'
import { isBytes32String, isValidEthereumAddress } from '../validators'
import { getMediaEncryption } from '../media-encryption'

const paramsSchema = z.object({
	userId: z.string().min(1, 'userId parameter is required'),
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

	if (!isValidEthereumAddress(userId)) {
		logger.info({ userId }, 'Invalid userId')
		return reply.code(400).send({ error: 'Bad Request', message: 'Invalid userId' })
	}

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

	if (!stream) {
		return reply.code(404).send('Stream not found')
	}

	// get the image metadata from the stream
	const profileImage = await getUserProfileImage(stream)

	if (!profileImage) {
		return reply.code(404).send('profileImage not found')
	}

	const fullStreamId: StreamIdHex = `0x${profileImage.streamId}`
	if (!isBytes32String(fullStreamId)) {
		return reply.code(422).send('Invalid stream ID')
	}

	let key: Uint8Array | undefined
	let iv: Uint8Array | undefined
	try {
		const { key: _key, iv: _iv } = getMediaEncryption(logger, profileImage)
		key = _key
		iv = _iv
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

	let data: ArrayBuffer | null
	let mimeType: string | null
	try {
		const { data: _data, mimeType: _mimType } = await getMediaStreamContent(
			logger,
			fullStreamId,
			key,
			iv,
		)
		data = _data
		mimeType = _mimType
		if (!data || !mimeType) {
			logger.error(
				{
					data: data ? 'has data' : 'no data',
					mimeType: mimeType ? mimeType : 'no mimeType',
					userId,
					mediaStreamId: profileImage.streamId,
				},
				'Invalid data or mimeType',
			)
			return reply.code(422).send('Invalid data or mimeTypet')
		}
	} catch (error) {
		logger.error(
			{
				error,
				userId,
				mediaStreamId: profileImage.streamId,
			},
			'Failed to get image content',
		)
		return reply.code(422).send('Failed to get image content')
	}

	// got the image data, send it back
	return reply.header('Content-Type', mimeType).send(Buffer.from(data))
}

async function getUserProfileImage(streamView: StreamStateView): Promise<ChunkedMedia | undefined> {
	if (streamView.contentKind !== 'userMetadataContent') {
		return undefined
	}

	const userImage = await streamView.userMetadataContent.getProfileImage()
	return userImage
}
