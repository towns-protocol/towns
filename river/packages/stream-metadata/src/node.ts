import './tracer' // must come before importing any instrumented module.

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
import { spaceRefresh, spaceRefreshOnResponse } from './routes/spaceRefresh'
import { userRefresh, userRefreshOnResponse } from './routes/userRefresh'
import { addCacheControlCheck } from './check-cache-control'
import { fetchSpaceMemberMetadata } from './routes/spaceMemberMetadata'

// Set the process title to 'stream-metadata' so it can be easily identified
// or killed with `pkill stream-metadata`
process.title = 'stream-metadata'

const logger = getLogger('server')

logger.info(
	{
		instance: config.instance,
		apm: config.apm,
		version: config.version,
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
export type Server = FastifyInstance<HTTPServer | HTTPSServer, IncomingMessage, ServerResponse>

const server = Fastify({
	logger: false,
	genReqId: () => uuidv4(),
})

server.addHook('onRequest', (request, reply, done) => {
	request.log = logger.child({
		req: {
			id: request.id,
			url: request.url,
			query: request.query,
			params: request.params,
			routerPath: request.routerPath,
			method: request.method,
			ip: request.ip,
			ips: request.ips,
		},
	})

	request.log.info('incoming request')

	done()
})

server.addHook('onResponse', (request, reply, done) => {
	request.log.info(
		{
			res: {
				statusCode: reply.statusCode,
				elapsedTime: reply.elapsedTime,
				headers: {
					'cache-control': reply.getHeader('cache-control'),
				},
			},
		},
		'request completed',
	)

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
	srv.get('/space/:spaceAddress/image/:eventId', fetchSpaceImage)
	srv.get('/space/:spaceAddress', fetchSpaceMetadata)
	srv.get('/space/:spaceAddress/token/:tokenId', fetchSpaceMemberMetadata)
	srv.get('/user/:userId/bio', fetchUserBio)

	// not cached
	srv.get('/health', checkHealth)

	// should be rate-limited, but not yet
	srv.get('/space/:spaceAddress/refresh', { onResponse: spaceRefreshOnResponse }, spaceRefresh)
	srv.get('/user/:userId/refresh', { onResponse: userRefreshOnResponse }, userRefresh)

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
		logger.warn('Received SIGTERM, shutting down server')
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
