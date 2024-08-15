import { FastifyReply, FastifyRequest } from 'fastify'

import { Config } from './environment'
import { getLogger } from './logger'
import { getRiverRegistry } from './evmRpcClient'

const logger = getLogger('handleHealthCheckRequest')

export async function handleHealthCheckRequest(
	config: Config,
	request: FastifyRequest,
	reply: FastifyReply,
) {
	// Do a health check on the river registry
	try {
		const riverRegistry = getRiverRegistry(config)
		await riverRegistry.getAllNodes()
		// healthy
		return reply.code(200).send({ status: 'ok' })
	} catch (e) {
		// unhealthy
		logger.error('Failed to get river registry', { err: e })
		return reply.code(500).send({ status: 'error' })
	}
}
