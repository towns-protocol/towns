import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { isValidEthereumAddress } from '../validators'
import { CloudfrontManager } from '../aws'

const paramsSchema = z.object({
	userId: z.string().min(1, 'userId parameter is required').refine(isValidEthereumAddress, {
		message: 'Invalid userId',
	}),
})

// This route handler validates the refresh request and quickly returns a 200 response.
export async function userRefresh(request: FastifyRequest, reply: FastifyReply) {
	const logger = request.log.child({ name: userRefresh.name })

	const parseResult = paramsSchema.safeParse(request.params)

	if (!parseResult.success) {
		const errorMessage = parseResult.error.errors[0]?.message || 'Invalid parameters'
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

	logger.info({ userId }, 'Refreshing user')

	try {
		const path = `/user/${userId}/image`
		await CloudfrontManager.createCloudfrontInvalidation({ path, logger })
	} catch (error) {
		logger.error(
			{
				error,
				userId,
			},
			'Failed to refresh user',
		)
	}

	done()
}
