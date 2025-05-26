import { FastifyReply, FastifyRequest } from 'fastify'

import { getRiverRegistry } from '../evmRpcClient'
import { config } from '../environment'

export async function checkHealth(request: FastifyRequest, reply: FastifyReply) {
	const logger = request.log.child({ name: checkHealth.name })
	// Do a health check on the river registry
	try {
		logger.info('Running riverRegistry health check')
		await Promise.race([
			getRiverRegistry().getAllNodes(),
			new Promise((_, reject) =>
				setTimeout(
					() => reject(new Error('Timed out waiting for the riverRegistry check')),
					config.healthCheck.timeout,
				),
			),
		])
		logger.info('Health check passed')
		// healthy
		return reply.code(200).send({ status: 'ok' })
	} catch (error) {
		// unhealthy
		logger.error(error, 'Health check failed')
		return reply.code(500).send({ status: 'error' })
	}
}
