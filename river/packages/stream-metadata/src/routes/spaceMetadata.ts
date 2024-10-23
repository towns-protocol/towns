import { FastifyReply, FastifyRequest } from 'fastify'
import { SpaceInfo } from '@river-build/web3'
import { z } from 'zod'
import { makeStreamId, StreamPrefix } from '@river-build/sdk'

import { config } from '../environment'
import { isValidEthereumAddress } from '../validators'
import { spaceDapp } from '../contract-utils'
import { getStream } from '../riverStreamRpcClient'

export const spaceMetadataBaseUrl = `${config.streamMetadataBaseUrl}/space`.toLowerCase()

const paramsSchema = z.object({
	spaceAddress: z.string().min(1, 'spaceAddress parameter is required'),
})

export interface SpaceMetadataResponse {
	name: string
	description: string
	image: string
}

const CACHE_CONTROL = {
	200: 'public, max-age=30, s-maxage=3600, stale-while-revalidate=3600',
	'4xx': 'public, max-age=30, s-maxage=3600',
}

export async function fetchSpaceMetadata(request: FastifyRequest, reply: FastifyReply) {
	const logger = request.log.child({ name: fetchSpaceMetadata.name })

	const parseResult = paramsSchema.safeParse(request.params)

	if (!parseResult.success) {
		const errorMessage = parseResult.error.errors[0]?.message || 'Invalid parameters'
		logger.info(errorMessage)
		return reply
			.code(400)
			.header('Cache-Control', CACHE_CONTROL['4xx'])
			.send({ error: 'Bad Request', message: errorMessage })
	}

	const { spaceAddress } = parseResult.data

	// Validate spaceAddress format using the helper function
	if (!isValidEthereumAddress(spaceAddress)) {
		logger.info({ spaceAddress }, 'Invalid spaceAddress format')
		return reply
			.code(400)
			.header('Cache-Control', CACHE_CONTROL['4xx'])
			.send({ error: 'Bad Request', message: 'Invalid spaceAddress format' })
	}

	let spaceInfo: SpaceInfo | undefined
	try {
		spaceInfo = await spaceDapp.getSpaceInfo(spaceAddress)
	} catch (error) {
		logger.error({ spaceAddress, err: error }, 'Failed to fetch space contract info')
		return reply
			.code(404)
			.header('Cache-Control', CACHE_CONTROL['4xx'])
			.send({ error: 'Not Found', message: 'Failed to fetch space contract info' })
	}

	if (!spaceInfo) {
		logger.error({ spaceAddress }, 'Space contract not found')
		return reply
			.code(404)
			.header('Cache-Control', CACHE_CONTROL['4xx'])
			.send({ error: 'Not Found', message: 'Space contract not found' })
	}

	let imageEventId: string = 'default'
	try {
		const streamId = makeStreamId(StreamPrefix.Space, spaceAddress)
		const streamView = await getStream(logger, streamId)
		if (
			streamView.contentKind === 'spaceContent' &&
			streamView.spaceContent.encryptedSpaceImage?.eventId
		) {
			imageEventId = streamView.spaceContent.encryptedSpaceImage.eventId
		}
	} catch (error) {
		// no-op
	}

	// Normalize the contractUri for case-insensitive comparison and handle empty string
	const defaultSpaceTokenUri = `${spaceMetadataBaseUrl}/${spaceAddress}`

	const image = `${defaultSpaceTokenUri}/image/${imageEventId}`
	const spaceMetadata: SpaceMetadataResponse = {
		name: spaceInfo.name,
		description: getSpaceDecription(spaceInfo),
		image,
	}

	return reply
		.header('Content-Type', 'application/json')
		.header('Cache-Control', CACHE_CONTROL[200])
		.send(spaceMetadata)
}

function getSpaceDecription({ shortDescription, longDescription }: SpaceInfo): string {
	if (shortDescription && longDescription) {
		return `${shortDescription}<br><br>${longDescription}`
	}

	if (shortDescription) {
		return shortDescription
	}

	return longDescription || ''
}
