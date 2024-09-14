import { Server as HTTPServer, IncomingMessage, ServerResponse } from 'http'
import { Server as HTTPSServer } from 'https'

import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import { v4 as uuidv4 } from 'uuid'

import { config } from './environment'
import { getLogger } from './logger'
import { checkHealth } from './routes/health'
import { fetchSpaceImage } from './routes/spaceImage'
import { fetchSpaceMetadata } from './routes/spaceMetadata'
import { fetchUserProfileImage } from './routes/profileImage'
import { fetchUserBio } from './routes/userBio'
import { fetchMedia } from './routes/media'
import { spaceRefresh } from './routes/spaceRefresh'
import { userRefresh } from './routes/userRefresh'
import { addCacheControlCheck } from './check-cache-control'

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
		baseChainRpcUrl: config.baseChainRpcUrl,
		streamMetadataBaseUrl: config.streamMetadataBaseUrl,
		cloudfront: config.cloudfront,
		openSea: config.openSea ? { ...config.openSea, apiKey: '***' } : undefined,
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
	genReqId: () => uuidv4(),
})

server.addHook('onRequest', (request, reply, done) => {
	const reqId = request.id // Use Fastify's generated reqId, which is now a UUID
	request.log = request.log.child({ reqId })
	done()
})

// for testability, pass server instance as an argument
export async function registerPlugins(srv: Server) {
	await srv.register(cors, {
		origin: '*', // Allow any origin
		methods: ['GET'], // Allowed HTTP methods
	})
	logger.info('CORS registered successfully')
}

// for testability, pass server instance as an argument
export function setupRoutes(srv: Server) {
	/*
	 * Routes
	 */

	// cached
	srv.get('/media/:mediaStreamId', fetchMedia)
	srv.get('/user/:userId/image', fetchUserProfileImage)
	srv.get('/space/:spaceAddress/image', fetchSpaceImage)
	srv.get('/space/:spaceAddress', fetchSpaceMetadata)

	// not cached
	srv.get('/health', checkHealth)

	// should be cached, but not before implementing /refresh on metadata routes
	srv.get('/user/:userId/bio', fetchUserBio)

	// should be rate-limited, but not yet
	srv.get('/space/:spaceAddress/refresh', spaceRefresh)
	srv.get('/user/:userId/refresh', userRefresh)

	// Fastify will return 404 for any unmatched routes
}

// for testability, pass server instance as an argument
export function getServerUrl(srv: Server) {
	const addressInfo = srv.server.address()
	const protocol = srv.server instanceof HTTPSServer ? 'https' : 'http'
	const serverAddress =
		typeof addressInfo === 'string'
			? addressInfo
			: `${addressInfo?.address}:${addressInfo?.port}`
	return `${protocol}://${serverAddress}`
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
		await registerPlugins(server)
		setupRoutes(server)
		addCacheControlCheck(server, {
			skippedRoutes: ['/refresh', '/health'],
		})
		await server.listen({
			port: config.port,
			host: config.host,
		})
		logger.info('Server started')
	} catch (error) {
		logger.error(error, 'Error starting server')
		process.exit(1)
	}
}

void main()
