import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { isValidEthereumAddress } from '../validators'
import { CloudfrontManager } from '../aws'

const paramsSchema = z.object({
	userId: z.string().min(1, 'userId parameter is required').refine(isValidEthereumAddress, {
		message: 'Invalid userId',
	}),
})

export async function userRefresh(request: FastifyRequest, reply: FastifyReply) {
	const logger = request.log.child({ name: userRefresh.name })

	const parseResult = paramsSchema.safeParse(request.params)

	if (!parseResult.success) {
		const errorMessage = parseResult.error.errors[0]?.message || 'Invalid parameters'
		logger.info(errorMessage)
		return reply.code(400).send({ error: 'Bad Request', message: errorMessage })
	}

	const { userId } = parseResult.data
	logger.info({ userId }, 'Refreshing user')

	try {
		const path = `/user/${userId}/image`

		// Refresh CloudFront cache
		await CloudfrontManager.createCloudfrontInvalidation({ path, logger })

		return reply.code(200).send({ ok: true })
	} catch (error) {
		logger.error(
			{
				error,
			},
			'Failed to refresh user',
		)
		return reply.code(500).send('Failed to refresh user')
	}
}
