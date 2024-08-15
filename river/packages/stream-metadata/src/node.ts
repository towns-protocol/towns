import { Server as HTTPSServer } from 'https'

import Fastify from 'fastify'
import cors from '@fastify/cors'

import { config } from './environment'
import { getLogger } from './logger'
import { handleHealthCheckRequest } from './handleHealthCheckRequest'
import { handleImageRequest } from './handleImageRequest'
import { handleMetadataRequest } from './handleMetadataRequest'

// Set the process title to 'stream-metadata' so it can be easily identified
// or killed with `pkill stream-metadata`
process.title = 'stream-metadata'

const logger = getLogger('server')

logger.info({
	riverEnv: config.riverEnv,
	chainId: config.web3Config.river.chainId,
	port: config.port,
	riverRegistry: config.web3Config.river.addresses.riverRegistry,
	riverChainRpcUrl: config.riverChainRpcUrl,
})

/*
 * Server setup
 */
const server = Fastify({
	logger,
})

async function registerPlugins() {
	await server.register(cors, {
		origin: '*', // Allow any origin
		methods: ['GET'], // Allowed HTTP methods
	})
	logger.info('CORS registered successfully')
}

function setupRoutes() {
	/*
	 * Routes
	 */
	server.get('/health', async (request, reply) => {
		logger.info(`GET /health`)
		return handleHealthCheckRequest(config, request, reply)
	})

	server.get('/space/:spaceAddress', async (request, reply) => {
		const { spaceAddress } = request.params as { spaceAddress?: string }
		logger.info(`GET /space`, { spaceAddress })
		const { protocol, serverAddress } = getServerInfo()
		return handleMetadataRequest(request, reply, `${protocol}://${serverAddress}`)
	})

	server.get('/space/:spaceAddress/image', async (request, reply) => {
		const { spaceAddress } = request.params as { spaceAddress?: string }
		logger.info(`GET /space/../image`, {
			spaceAddress,
		})

		return handleImageRequest(config, request, reply)
	})

	// Generic / route to return 404
	server.get('/', async (request, reply) => {
		return reply.code(404).send('Not found')
	})
}

/*
 * Start the server
 */
function getServerInfo() {
	const addressInfo = server.server.address()
	const protocol = server.server instanceof HTTPSServer ? 'https' : 'http'
	const serverAddress =
		typeof addressInfo === 'string'
			? addressInfo
			: `${addressInfo?.address}:${addressInfo?.port}`
	return { protocol, serverAddress }
}

process.on('SIGTERM', async () => {
	try {
		await server.close()
		logger.info('Server closed gracefully')
		process.exit(0)
	} catch (err) {
		logger.error('Error during server shutdown', err)
		process.exit(1)
	}
})

async function main() {
	try {
		await registerPlugins()
		setupRoutes()
		await server.listen({ port: config.port })
		logger.info('Server started')
	} catch (err) {
		logger.error('Error starting server', err)
		process.exit(1)
	}
}

void main()
