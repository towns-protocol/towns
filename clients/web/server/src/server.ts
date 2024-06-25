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

// spaceOwner
const CONTRACT_ADDRESS = '0x9dEdb330A126C6dF2893a33018bb81aFE8573805'

const PORT = Number(process.env.PORT) || 3000
const PROVIDER_URL = process.env.VITE_BASE_SEPOLIA_RPC_URL
const GATEWAY_URL = process.env.VITE_GATEWAY_URL
const GATEWAY_SECRET = process.env.VITE_AUTH_WORKER_HEADER_SECRET

const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL)

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
    const urlPath = request.raw.url || ''
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

        const [townDataFromGateway, townName] = await Promise.all([
            fetchDataPlaceholder(townId),
            getTownNameFromContract(townId),
        ])

        // if applicable, ammend with fetched data
        if (townDataFromGateway) {
            server.log.info('townDataFromGateway : ' + JSON.stringify(townDataFromGateway))
            info.description = townDataFromGateway.bio
        }
        if (townName) {
            info.title = townName
        }
    }

    return template
        .replace(/__title__/g, info.title)
        .replace(/__description__/g, info.description)
        .replace(/__image__/g, info.image)
}

async function getTownNameFromContract(townId: string): Promise<string | undefined> {
    if (!provider) {
        return
    }

    try {
        const contractAddress = CONTRACT_ADDRESS
        const spaceAddress = ethers.utils.getAddress(townId.slice(2, 42))
        const contract = new ethers.Contract(contractAddress, SpaceOwnerAbi, provider)

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const result = (await contract['getSpaceInfo'](spaceAddress)) as string[]

        return Array.isArray(result) && result.length ? result?.[0] : undefined
    } catch (error) {
        server.log.error('Error fetching town name from contract' + JSON.stringify(error))
        return
    }
}

// This calls the Cloudflare gateway and fetches the information about the town
// stored in the KVM in the format of { bio: string; motto: string }
async function fetchDataPlaceholder(
    townId: string,
): Promise<{ bio: string; motto: string } | undefined> {
    if (!validateTownId(townId) || !GATEWAY_URL || !GATEWAY_SECRET) {
        return
    }
    const response = await fetch(`${GATEWAY_URL}/${townId}/identity`, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GATEWAY_SECRET}`,
        },
    })

    if (response.status !== 200) {
        return
    }

    const data = (await response.json()) as { bio: string; motto: string }

    return typeof data === 'object' ? data : undefined
}
