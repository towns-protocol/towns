import { FastifyReply, FastifyRequest } from 'fastify'
import { ChunkedMedia } from '@towns-protocol/proto'
import { StreamPrefix, StreamStateView, makeStreamId } from '@towns-protocol/sdk'
import { z } from 'zod'

import { getStream, getMediaStreamContent } from '../riverStreamRpcClient'
import { isValidEthereumAddress } from '../validators'
import { getMediaEncryption } from '../media-encryption'
import { parseSizeParam, processImage, shouldProcessImage } from '../imageProcessing'

const paramsSchema = z.object({
	userId: z.string().min(1, 'userId parameter is required').refine(isValidEthereumAddress, {
		message: 'Invalid userId',
	}),
})

const querySchema = z.object({
	size: z.string().optional(),
})

const CACHE_CONTROL = {
	// Original size - longer cache since immutable
	200: 'public, max-age=31536000, immutable',
	// Resized images - shorter cache but still long-term for CDN
	'200-resized': 'public, max-age=86400, s-maxage=31536000',
	400: 'public, max-age=30, s-maxage=3600',
	404: 'public, max-age=5, s-maxage=3600', // 5s max-age to avoid user showing themselves a broken image during client creation flow
	422: 'public, max-age=30, s-maxage=3600',
	500: 'public, max-age=30, s-maxage=3600',
}

export async function fetchUserProfileImage(request: FastifyRequest, reply: FastifyReply) {
	const logger = request.log.child({ name: fetchUserProfileImage.name })

	const paramsResult = paramsSchema.safeParse(request.params)
	const queryResult = querySchema.safeParse(request.query)

	if (!paramsResult.success) {
		const errorMessage = paramsResult.error.errors[0]?.message || 'Invalid parameters'
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

	const { userId } = paramsResult.data
	const { size } = queryResult.data

	// Parse and validate size parameter
	const sizeOptions = parseSizeParam(size)
	if (!sizeOptions.isValid) {
		logger.info({ size }, 'Invalid size parameter format')
		return reply
			.code(400)
			.header('Cache-Control', CACHE_CONTROL[400])
			.send({ error: 'Bad Request', message: 'Size must be in format WxH, xH, or Wx' })
	}

	logger.info({ userId, size, sizeOptions }, 'Fetching user profile image')

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
		return reply
			.code(500)
			.header('Cache-Control', CACHE_CONTROL[500])
			.send('Failed to get stream')
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

		// Get the media content
		const mediaContent = await getMediaStreamContent(logger, profileImage.streamId, key, iv)
		if (!mediaContent) {
			return reply
				.code(404)
				.header('Cache-Control', CACHE_CONTROL[404])
				.send('Media content not found')
		}

		const { data, mimeType } = mediaContent
		if (!data || !mimeType) {
			logger.error(
				{
					data: data ? 'has data' : 'no data',
					mimeType: mimeType ? mimeType : 'no mimeType',
					mediaStreamId: profileImage.streamId,
				},
				'Invalid data or mimeType',
			)
			return reply
				.code(422)
				.header('Cache-Control', CACHE_CONTROL[422])
				.send('Invalid data or mimeType')
		}

		let processedImageBuffer = Buffer.from(data)
		let outputMimeType = mimeType

		// Process image if size parameters provided and image type is processable
		if ((sizeOptions.width || sizeOptions.height) && shouldProcessImage(mimeType)) {
			try {
				const result = await processImage(logger, processedImageBuffer, mimeType, {
					width: sizeOptions.width,
					height: sizeOptions.height,
				})

				processedImageBuffer = result.buffer
				outputMimeType = result.mimeType

				logger.info(
					{
						wasProcessed: result.wasProcessed,
						isAnimated: result.isAnimated,
						outputMimeType,
					},
					result.isAnimated
						? 'Animated profile GIF resized with animation preserved'
						: 'Static profile image processed to WebP successfully',
				)
			} catch (error) {
				logger.error(
					{
						err: error,
						userId,
						mediaStreamId: profileImage.streamId,
						targetWidth: sizeOptions.width,
						targetHeight: sizeOptions.height,
					},
					'Failed to process image, serving original',
				)
				// Continue with original image if processing fails
			}
		}

		// Determine cache control based on whether image was resized
		const cacheControl =
			sizeOptions.width || sizeOptions.height
				? CACHE_CONTROL['200-resized']
				: CACHE_CONTROL[200]

		return reply
			.header('Content-Type', outputMimeType)
			.header('Cache-Control', cacheControl)
			.send(processedImageBuffer)
	} catch (error) {
		logger.error(
			{
				err: error,
				userId,
				mediaStreamId: profileImage.streamId,
			},
			'Failed to process image',
		)
		return reply
			.code(500)
			.header('Cache-Control', CACHE_CONTROL[500])
			.send('Failed to process image')
	}
}

async function getUserProfileImage(streamView: StreamStateView): Promise<ChunkedMedia | undefined> {
	if (streamView.contentKind !== 'userMetadataContent') {
		return undefined
	}

	const userImage = await streamView.userMetadataContent.getProfileImage()
	return userImage
}
