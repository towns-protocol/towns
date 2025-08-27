import { FastifyReply, FastifyRequest, type FastifyBaseLogger } from 'fastify'
import { ChunkedMedia } from '@towns-protocol/proto'
import { StreamPrefix, StreamStateView, makeStreamId } from '@towns-protocol/sdk'
import { z } from 'zod'

import { getStream, getMediaStreamContent } from '../riverStreamRpcClient'
import { isValidEthereumAddress } from '../validators'
import { getMediaEncryption } from '../media-encryption'
import { parseSizeParam, processImage, shouldProcessImage } from '../imageProcessing'

const paramsSchema = z.object({
	spaceAddress: z
		.string()
		.min(1, 'spaceAddress parameter is required')
		.refine(isValidEthereumAddress, {
			message: 'Invalid spaceAddress format',
		}),
	eventId: z.string().optional(),
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
	404: 'public, max-age=5, s-maxage=3600', // 5s max-age to avoid client's rendering broken images during town creation flow
	422: 'public, max-age=30, s-maxage=3600',
	500: 'public, max-age=30, s-maxage=3600',
}

export async function fetchSpaceImage(request: FastifyRequest, reply: FastifyReply) {
	const logger = request.log.child({ name: fetchSpaceImage.name })

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

	const { spaceAddress, eventId } = paramsResult.data
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

	logger.info(
		{
			spaceAddress,
			eventId,
			size,
			sizeOptions,
			willResize: !!(sizeOptions.width || sizeOptions.height),
		},
		'Fetching space image',
	)

	let stream: StreamStateView | undefined
	const streamId = makeStreamId(StreamPrefix.Space, spaceAddress)
	try {
		stream = await getStream(logger, streamId)
	} catch (error) {
		logger.error(
			{
				err: error,
				spaceAddress,
				streamId,
			},
			'Failed to get stream',
		)
		return reply
			.code(500)
			.header('Cache-Control', CACHE_CONTROL[500])
			.send('Failed to get stream')
	}

	if (!stream) {
		return reply.code(404).header('Cache-Control', CACHE_CONTROL[404]).send('Stream not found')
	}

	// get the image metadata from the stream
	const spaceImage = await getSpaceImage(logger, stream)
	if (!spaceImage) {
		logger.info({ spaceAddress, streamId: stream.streamId }, 'spaceImage not found')
		return reply
			.code(404)
			.header('Cache-Control', CACHE_CONTROL[404])
			.send('spaceImage not found')
	}

	try {
		const { key, iv } = getMediaEncryption(logger, spaceImage)
		if (key?.length === 0) {
			logger.error(
				{
					key: 'no key',
					spaceAddress,
					mediaStreamId: spaceImage.streamId,
				},
				'Invalid key',
			)
			return reply
				.code(422)
				.header('Cache-Control', CACHE_CONTROL[422])
				.send('Failed to get encryption key')
		}

		// Get the media content
		const mediaContent = await getMediaStreamContent(logger, spaceImage.streamId, key, iv)
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
					mediaStreamId: spaceImage.streamId,
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

		logger.info(
			{
				mimeType,
				shouldProcess: shouldProcessImage(mimeType),
				hasSize: !!(sizeOptions.width || sizeOptions.height),
				sizeOptions,
				originalBufferSize: processedImageBuffer.length,
			},
			'Image processing decision',
		)

		// Process image if size parameters provided and image type is processable
		if ((sizeOptions.width || sizeOptions.height) && shouldProcessImage(mimeType)) {
			logger.info('Attempting to process image...')
			try {
				const result = await processImage(logger, processedImageBuffer, mimeType, {
					width: sizeOptions.width,
					height: sizeOptions.height,
				})

				processedImageBuffer = result.buffer
				outputMimeType = result.mimeType

				logger.info(
					{
						originalSize: Buffer.from(data).length,
						processedSize: processedImageBuffer.length,
						outputMimeType,
						wasProcessed: result.wasProcessed,
						isAnimated: result.isAnimated,
					},
					result.isAnimated
						? 'Animated GIF resized with animation preserved'
						: 'Static image processed to WebP successfully',
				)
			} catch (error) {
				logger.error(
					{
						err: error,
						spaceAddress,
						mediaStreamId: spaceImage.streamId,
						targetWidth: sizeOptions.width,
						targetHeight: sizeOptions.height,
					},
					'Failed to process image, serving original',
				)
				// Continue with original image if processing fails
			}
		} else {
			logger.info(
				{
					hasSize: !!(sizeOptions.width || sizeOptions.height),
					shouldProcess: shouldProcessImage(mimeType),
					mimeType,
				},
				'Skipping image processing - conditions not met',
			)
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
				spaceAddress,
				mediaStreamId: spaceImage.streamId,
			},
			'Failed to process image',
		)
		return reply
			.code(500)
			.header('Cache-Control', CACHE_CONTROL[500])
			.send('Failed to process image')
	}
}

export async function getSpaceImage(
	logger: FastifyBaseLogger,
	streamView: StreamStateView,
): Promise<ChunkedMedia | undefined> {
	if (streamView.contentKind !== 'spaceContent') {
		logger.error({ streamView }, 'stream view is not a space content')
		return undefined
	}
	return streamView.spaceContent.getSpaceImage()
}
