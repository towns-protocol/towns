import { FastifyReply, FastifyRequest } from 'fastify'
import { SpaceInfo } from '@river-build/web3'
import { z } from 'zod'

import { config } from '../environment'
import { isValidEthereumAddress } from '../validators'
import { spaceDapp } from '../contract-utils'

export const spaceMetadataBaseUrl = `${config.streamMetadataBaseUrl}space`.toLowerCase()

const paramsSchema = z.object({
	spaceAddress: z.string().min(1, 'spaceAddress parameter is required'),
})

export interface SpaceMetadataResponse {
	name: string
	description: string
	image: string
}

export async function fetchSpaceMetadata(request: FastifyRequest, reply: FastifyReply) {
	const logger = request.log.child({ name: fetchSpaceMetadata.name })

	const parseResult = paramsSchema.safeParse(request.params)

	if (!parseResult.success) {
		const errorMessage = parseResult.error.errors[0]?.message || 'Invalid parameters'
		logger.info(errorMessage)
		return reply.code(400).send({ error: 'Bad Request', message: errorMessage })
	}

	const { spaceAddress } = parseResult.data

	// Validate spaceAddress format using the helper function
	if (!isValidEthereumAddress(spaceAddress)) {
		logger.info({ spaceAddress }, 'Invalid spaceAddress format')
		return reply
			.code(400)
			.send({ error: 'Bad Request', message: 'Invalid spaceAddress format' })
	}

	let spaceInfo: SpaceInfo | undefined
	try {
		spaceInfo = await spaceDapp.getSpaceInfo(spaceAddress)
	} catch (error) {
		logger.error({ spaceAddress, error }, 'Failed to fetch space contract info')
		return reply
			.code(404)
			.send({ error: 'Not Found', message: 'Failed to fetch space contract info' })
	}

	if (!spaceInfo) {
		logger.error({ spaceAddress }, 'Space contract not found')
		return reply.code(404).send({ error: 'Not Found', message: 'Space contract not found' })
	}

	// Normalize the contractUri for case-insensitive comparison and handle empty string
	const normalizedContractUri = spaceInfo.uri.toLowerCase().trim() || ''
	const defaultSpaceTokenUri = `${spaceMetadataBaseUrl}/${spaceAddress}`

	// handle the case where the space uses our default stream-metadata service
	// or the contractUri is not set or is an empty string
	if (!normalizedContractUri || normalizedContractUri === defaultSpaceTokenUri.toLowerCase()) {
		const image = `${defaultSpaceTokenUri}/image`
		const spaceMetadata: SpaceMetadataResponse = {
			name: spaceInfo.name,
			description: getSpaceDecription(spaceInfo),
			image,
		}

		return reply.header('Content-Type', 'application/json').send(spaceMetadata)
	}

	// Not using the default space image service
	// redirect to the space contract's uri
	return reply.redirect(spaceInfo.uri)
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
