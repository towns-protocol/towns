import { FastifyReply, FastifyRequest } from 'fastify'

import { getRiverRegistry } from '../evmRpcClient'

export async function checkHealth(request: FastifyRequest, reply: FastifyReply) {
	const logger = request.log.child({ name: checkHealth.name })
	// Do a health check on the river registry
	try {
		await getRiverRegistry().getAllNodes()
		// healthy
		return reply.code(200).send({ status: 'ok' })
	} catch (error) {
		// unhealthy
		logger.error(error, 'Failed to get river registry')
		return reply.code(500).send({ status: 'error' })
	}
}
