import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { isValidEthereumAddress } from '../validators'
import { CloudfrontManager } from '../aws'
import { HEADER_INVALIDATION_ID } from '../constants'

const paramsSchema = z.object({
	userId: z.string().min(1, 'userId parameter is required').refine(isValidEthereumAddress, {
		message: 'Invalid userId',
	}),
})

const querySchema = z.object({
	target: z.enum(['bio', 'image', 'all']).default('all'),
})

// This route handler validates the refresh request, initiates the CloudFront invalidation, and returns a 200 response.
export async function userRefresh(request: FastifyRequest, reply: FastifyReply) {
	const logger = request.log.child({ name: userRefresh.name })

	const paramsParseResult = paramsSchema.safeParse(request.params)
	if (!paramsParseResult.success) {
		const errorMessage = paramsParseResult.error.errors[0]?.message || 'Invalid parameters'
		logger.info(errorMessage)
		return reply.code(400).send({ error: 'Bad Request', message: errorMessage })
	}

	const queryParamResult = querySchema.safeParse(request.query)
	if (!queryParamResult.success) {
		const errorMessage = queryParamResult.error.errors[0]?.message || 'Invalid query parameters'
		logger.info(errorMessage)
		return reply.code(400).send({ error: 'Bad Request', message: errorMessage })
	}

	const { userId } = paramsParseResult.data
	const { target } = queryParamResult.data

	logger.info({ userId, target }, 'Refreshing user')

	const paths =
		target === 'image'
			? [`/user/${userId}/image`]
			: target === 'bio'
			? [`/user/${userId}/bio`]
			: [`/user/${userId}/*`]

	try {
		const invalidation = await CloudfrontManager.createCloudfrontInvalidation({ paths, logger })
		const invalidationId = invalidation?.Invalidation?.Id
		return reply
			.code(200)
			.header(HEADER_INVALIDATION_ID, invalidationId)
			.send({ ok: true, invalidationId })
	} catch (error) {
		logger.error(
			{
				err: error,
				userId,
				target,
				paths,
			},
			'Failed to refresh user',
		)
		return reply.code(500).send({ ok: false })
	}
}
