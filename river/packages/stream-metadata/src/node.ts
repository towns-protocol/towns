import { Server as HTTPServer, IncomingMessage, ServerResponse } from 'http'
import { Server as HTTPSServer } from 'https'

import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'

import { config } from './environment'
import { getLogger } from './logger'
import { checkHealth } from './routes/health'
import { fetchSpaceImage } from './routes/spaceImage'
import { fetchSpaceMetadata } from './routes/spaceMetadata'

// Set the process title to 'stream-metadata' so it can be easily identified
// or killed with `pkill stream-metadata`
process.title = 'stream-metadata'

const logger = getLogger('server')

logger.info(
	{
		riverEnv: config.riverEnv,
		chainId: config.web3Config.river.chainId,
		port: config.port,
		riverRegistry: config.web3Config.river.addresses.riverRegistry,
		riverChainRpcUrl: config.riverChainRpcUrl,
	},
	'config',
)

/*
 * Server setup
 */
export type Server = FastifyInstance<
	HTTPServer | HTTPSServer,
	IncomingMessage,
	ServerResponse,
	typeof logger
>

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

export function setupRoutes(srv: Server) {
	/*
	 * Routes
	 */
	srv.get('/health', async (request, reply) => {
		logger.info(`GET /health`)
		return checkHealth(request, reply)
	})

	srv.get('/space/:spaceAddress', async (request, reply) => {
		const { spaceAddress } = request.params as { spaceAddress?: string }
		logger.info({ spaceAddress }, 'GET /space/../metadata')

		const { protocol, serverAddress } = getServerInfo()
		return fetchSpaceMetadata(request, reply, `${protocol}://${serverAddress}`)
	})

	srv.get('/space/:spaceAddress/image', async (request, reply) => {
		const { spaceAddress } = request.params as { spaceAddress?: string }
		logger.info({ spaceAddress }, 'GET /space/../image')

		return fetchSpaceImage(request, reply)
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
	} catch (error) {
		logger.error(error, 'Error during server shutdown')
		process.exit(1)
	}
})

async function main() {
	try {
		await registerPlugins()
		setupRoutes(server)
		await server.listen({ port: config.port })
		logger.info('Server started')
	} catch (error) {
		logger.error(error, 'Error starting server')
		process.exit(1)
	}
}

void main()
