import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { config } from '../environment'
import { isValidEthereumAddress } from '../validators'
import { spaceDapp } from '../contract-utils'

const paramsSchema = z.object({
	spaceAddress: z
		.string()
		.min(1, 'spaceAddress parameter is required')
		.refine(isValidEthereumAddress, 'Invalid spaceAddress format'),
	tokenId: z.string().min(1, 'tokenId parameter is required'),
})

export interface SpaceMemberMetadataResponse {
	name: string
	description: string
	image: string
	attributes: {
		trait_type: string
		display_type?: 'date' | 'number' | 'string'
		value: string | number
	}[]
}

const CACHE_CONTROL = {
	200: 'public, max-age=30, s-maxage=3600, stale-while-revalidate=3600',
	'4xx': 'public, max-age=30, s-maxage=3600',
}

export async function fetchSpaceMemberMetadata(request: FastifyRequest, reply: FastifyReply) {
	const logger = request.log.child({ name: fetchSpaceMemberMetadata.name })

	const parseResult = paramsSchema.safeParse(request.params)

	if (!parseResult.success) {
		const errorMessage = parseResult.error.errors[0]?.message || 'Invalid parameters'
		logger.info(errorMessage)
		return reply
			.code(400)
			.header('Cache-Control', CACHE_CONTROL['4xx'])
			.send({ error: 'Bad Request', message: errorMessage })
	}

	const { spaceAddress, tokenId } = parseResult.data

	try {
		const metadata = await getSpaceMemberMetadata(spaceAddress, tokenId)
		return reply
			.header('Content-Type', 'application/json')
			.header('Cache-Control', CACHE_CONTROL[200])
			.send(metadata)
	} catch (error) {
		logger.error({ spaceAddress, tokenId, error }, 'Failed to fetch space contract info')
		return reply
			.code(404)
			.header('Cache-Control', CACHE_CONTROL['4xx'])
			.send({ error: 'Not Found', message: 'Space contract not found' })
	}
}

const getSpaceMemberMetadata = async (
	spaceAddress: string,
	tokenId: string,
): Promise<SpaceMemberMetadataResponse> => {
	const space = spaceDapp.getSpace(spaceAddress)
	if (!space) {
		throw new Error('Space contract not found')
	}

	const [name, renewalPrice, membershipExpiration, isBanned] = await Promise.all([
		space.SpaceOwner.read.getSpaceInfo(spaceAddress).then((spaceInfo) => spaceInfo.name),
		space.Membership.read.getMembershipRenewalPrice(tokenId),
		space.Membership.read.expiresAt(tokenId),
		space.Banning.read.isBanned(tokenId),
	])

	return {
		name: `${name} - Member`,
		description: `Member of ${name}`,
		image: `${config.streamMetadataBaseUrl}/space/${spaceAddress}/image`,
		attributes: [
			{
				trait_type: 'Renewal Price',
				display_type: 'number',
				value: renewalPrice.toNumber(),
			},
			{
				trait_type: 'Membership Expiration',
				display_type: 'date',
				value: membershipExpiration.toNumber(),
			},
			{
				trait_type: 'Membership Banned',
				display_type: 'string',
				value: String(isBanned),
			},
		],
	}
}
