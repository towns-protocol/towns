import Fastify from 'fastify'
import { Server as HTTPSServer } from 'https'
import { SERVER_PORT } from './environment'
import cors from '@fastify/cors'
import { handleImageRequest } from './handleImageRequest'
import { handleMetadataRequest } from './handleMetadataRequest'

// Set the process title to 'fetch-image' so it can be easily identified
// or killed with `pkill fetch-image`
process.title = 'fetch-image'

const server = Fastify({
	logger: true,
})

server.register(cors, {
	origin: '*', // Allow any origin
	methods: ['GET'], // Allowed HTTP methods
})

server.get('/space/:spaceAddress', async (request, reply) => {
	const { spaceAddress } = request.params as { spaceAddress?: string }
	console.log(`GET /space/${spaceAddress}`)

	const { protocol, serverAddress } = getServerInfo()
	return handleMetadataRequest(request, reply, `${protocol}://${serverAddress}`)
})

server.get('/space/:spaceAddress/image', async (request, reply) => {
	const { spaceAddress } = request.params as { spaceAddress?: string }
	console.log(`GET /space/${spaceAddress}/image`)

	return handleImageRequest(request, reply)
})

// Generic / route to return 404
server.get('/', async (request, reply) => {
	return reply.code(404).send('Not found')
})

function getServerInfo() {
	const addressInfo = server.server.address()
	const protocol = server.server instanceof HTTPSServer ? 'https' : 'http'
	const serverAddress =
		typeof addressInfo === 'string'
			? addressInfo
			: `${addressInfo?.address}:${addressInfo?.port}`
	return { protocol, serverAddress }
}

// Type guard to check if error has code property
function isAddressInUseError(err: any): err is NodeJS.ErrnoException {
	return err && typeof err === 'object' && 'code' in err
}

// Function to start the server on the first available port
async function startServer(port: number) {
	try {
		await server.listen({ port, host: 'localhost' })
		const addressInfo = server.server.address()
		if (addressInfo && typeof addressInfo === 'object') {
			server.log.info(`Server listening on ${addressInfo.address}:${addressInfo.port}`)
		}
	} catch (err) {
		if (isAddressInUseError(err) && err.code === 'EADDRINUSE') {
			server.log.warn(`Port ${port} is in use, trying port ${port + 1}`)
			startServer(port + 1) // Try the next port
		} else {
			server.log.error(err)
			process.exit(1)
		}
	}
}

process.on('SIGTERM', async () => {
	try {
		await server.close()
		console.log('Server closed gracefully')
		process.exit(0)
	} catch (err) {
		console.error('Error during server shutdown', err)
		process.exit(1)
	}
})

// Start the server on the port set in the .env, or the next available port
startServer(SERVER_PORT)
