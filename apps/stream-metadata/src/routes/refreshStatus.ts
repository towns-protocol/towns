import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { CloudfrontManager } from '../aws'

const paramsSchema = z.object({
	invalidationId: z.string().min(1, 'invalidationId parameter is required'),
})

export async function fetchRefreshStatus(request: FastifyRequest, reply: FastifyReply) {
	const logger = request.log.child({ name: fetchRefreshStatus.name })
	const parseResult = paramsSchema.safeParse(request.params)

	if (!parseResult.success) {
		const errorMessage = parseResult.error.errors[0]?.message || 'Invalid parameters'
		logger.info(errorMessage)
		return reply.code(400).send({ error: 'Bad Request', message: errorMessage })
	}
	const { invalidationId } = parseResult.data
	logger.info({ invalidationId }, 'Fetching invalidation status')

	try {
		const invalidation = await CloudfrontManager.getInvalidation({ logger, invalidationId })
		const status = invalidation
			? invalidation.Invalidation?.Status === 'Completed'
				? 'completed'
				: 'pending'
			: 'unset'
		return reply.code(200).send({ status })
	} catch (error) {
		logger.error(
			{
				err: error,
				invalidationId,
			},
			'Failed to get invalidation status',
		)
		return reply.code(200).send({ status: 'error' })
	}
}
