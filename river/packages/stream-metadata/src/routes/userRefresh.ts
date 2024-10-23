import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { isValidEthereumAddress } from '../validators'
import { CloudfrontManager } from '../aws'

const paramsSchema = z.object({
	userId: z.string().min(1, 'userId parameter is required').refine(isValidEthereumAddress, {
		message: 'Invalid userId',
	}),
})

const querySchema = z.object({
	target: z.enum(['bio', 'image', 'all']).default('all'),
})

// This route handler validates the refresh request and quickly returns a 200 response.
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

	return reply.code(200).send({ ok: true })
}

// This onResponse hook does the actual heavy lifting of invalidating the CloudFront cache.
export async function userRefreshOnResponse(
	request: FastifyRequest,
	reply: FastifyReply,
	done: () => void,
) {
	const logger = request.log.child({ name: userRefreshOnResponse.name })

	const { userId } = paramsSchema.parse(request.params)
	const { target } = querySchema.parse(request.query)

	logger.info({ userId, target }, 'Refreshing user')

	const imagePath = `/user/${userId}/image`
	const bioPath = `/user/${userId}/bio`
	const paths =
		target === 'image' ? [imagePath] : target === 'bio' ? [bioPath] : [imagePath, bioPath]

	try {
		await CloudfrontManager.createCloudfrontInvalidation({ paths, logger })
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
	}

	done()
}
