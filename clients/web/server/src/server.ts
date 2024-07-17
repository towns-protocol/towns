import fastifyStatic from '@fastify/static'
import fastifyView from '@fastify/view'
import SpaceOwnerAbi from '@river-build/generated/dev/abis/SpaceOwner.abi'
import ejs from 'ejs'
import { ethers } from 'ethers'
import Fastify from 'fastify'
import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '../../app', '.env.local') })

const MODE = process.env.MODE || 'gamma'

// spaceOwner
const CONTRACT_ADDRESS = process.env.VITE_ADDRESS_SPACE_OWNER
const PORT = Number(process.env.PORT) || 3000
const PROVIDER_URL =
    MODE === 'gamma' ? process.env.VITE_BASE_SEPOLIA_RPC_URL : process.env.VITE_BASE_CHAIN_RPC_URL

const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL)

console.log('provider', MODE, CONTRACT_ADDRESS, PROVIDER_URL)

const server = Fastify({
    logger: true,
})

// In-memory cache for file existence checks
const fileCache: { [key: string]: boolean } = {}

// Helper function to check if a file exists and cache the result
const checkFileExists = async (filePath: string): Promise<boolean> => {
    if (fileCache[filePath] !== undefined) {
        return fileCache[filePath]
    }

    try {
        const stats = await fs.stat(filePath)
        fileCache[filePath] = stats.isFile()
    } catch {
        fileCache[filePath] = false
    }

    return fileCache[filePath]
}

// Viem client setup
/*
const client = createPublicClient({
    chain: mainnet,
    transport: http(),
})
*/

// Path to the index.html file
const indexPath = path.join(__dirname, '../../app', 'dist', 'index.html')
const template = fsSync.readFileSync(indexPath, 'utf-8')

// Example route to call a contract method
server.get('/timer', async (_request, _reply) => {
    server.log.info('Timer route hit')
    await new Promise((resolve) => setTimeout(resolve, 5000))
    const result = 'done' // Replace with actual method
    return { result }
})

// Serve static files or index.html for all other routes
server.setNotFoundHandler(async (request, reply) => {
    // strip query params and hash
    const urlPath = new URL(request.raw.url ?? '', `https://${request.headers.host}`).pathname

    const filePath = path.join(__dirname, '..', '..', 'app', 'dist', urlPath)

    if (await checkFileExists(filePath)) {
        // If file exists, serve the static file
        return reply.sendFile(urlPath)
    } else if (urlPath.startsWith('/t/') || urlPath === '/') {
        const townId = urlPath.match(/^\/t\/([0-9a-f]{64})/)?.[1] ?? ''
        const html = await updateTemplate(townId)
        return reply.header('Content-Type', 'text/html').send(html)
    }

    return reply.callNotFound()
})

const start = async () => {
    try {
        // Register the static plugin
        await server.register(fastifyStatic, {
            root: path.join(__dirname, '..', '..', 'app', 'dist'),
            prefix: '/', // optional: default '/'
            index: false,
        })

        // Register view engine for HTML templates
        await server.register(fastifyView, {
            engine: {
                ejs: ejs,
            },
        })

        const address = await server.listen({ port: Number(PORT), host: '::' })
        console.log(`Server running at ${address}`)
    } catch (err) {
        server.log.error(err)
        process.exit(1)
    }
}

void start()

// -----------------------------------------------------------------------------
// Utility functions
// -----------------------------------------------------------------------------

function validateTownId(townId: string) {
    return townId.match(/^[0-9a-f]{64}$/)
}

async function updateTemplate(townId?: string) {
    // default info
    const info: Record<string, string> = {
        title: 'Towns',
        description: 'A new way to connect with your community',
        image: 'https://app.towns.com/favicon.png',
    }

    if (townId && validateTownId(townId)) {
        // default town info
        info.description = ``
        info.image = `https://imagedelivery.net/qaaQ52YqlPXKEVQhjChiDA/${townId}/thumbnail600`

        const townData = await getTownDataFromContract(townId)

        if (townData) {
            info.title = townData.name || info.title
            info.description =
                townData.shortDescription || townData.longDescription || info.description
        }
    }

    return template
        .replace(/__title__/g, info.title)
        .replace(/__description__/g, info.description)
        .replace(/__image__/g, info.image)
}

async function getTownDataFromContract(
    townId: string,
): Promise<{ name: string; shortDescription: string; longDescription: string } | undefined> {
    if (!provider) {
        return
    }

    try {
        const contractAddress = CONTRACT_ADDRESS
        const spaceAddress = ethers.utils.getAddress(townId.slice(2, 42))

        if (!contractAddress) {
            return
        }

        const contract = new ethers.Contract(contractAddress, SpaceOwnerAbi, provider)

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const result = (await contract['getSpaceInfo'](spaceAddress)) as {
            name: string
            shortDescription: string
            longDescription: string
        }

        return result
    } catch (error) {
        server.log.error('Error fetching town name from contract' + JSON.stringify(error))
        return
    }
}
