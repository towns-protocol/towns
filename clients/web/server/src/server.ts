import fastifyStatic from '@fastify/static'
import fastifyView from '@fastify/view'
import SpaceOwnerAbi from '@river-build/generated/dev/abis/SpaceOwner.abi'
import ejs from 'ejs'
import { ethers } from 'ethers'
import Fastify from 'fastify'
import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import NodeCache from 'node-cache'
import { getPackageVersion } from './utils/getPackageVersion'
import { config } from './config'

const { PROVIDER_URL, MODE, PORT, VITE_ADDRESS_SPACE_OWNER } = config

const cache = new NodeCache({ stdTTL: 900 }) // 900 seconds = 15 minutes

// spaceOwner

const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL)

console.log('provider', MODE, VITE_ADDRESS_SPACE_OWNER, PROVIDER_URL)

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
    } else if (urlPath === '/version') {
        const version = await getPackageVersion()
        if (version) {
            return reply.header('Content-Type', 'text/json').send(JSON.stringify({ version }))
        }
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
    const cacheKey = `template-${townId}`
    const cachedTemplate = cache.get<string>(cacheKey)

    if (cachedTemplate) {
        return cachedTemplate
    }

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

    const renderedTemplate = template
        .replace(/__title__/g, info.title)
        .replace(/__description__/g, info.description)
        .replace(/__image__/g, info.image)

    cache.set(cacheKey, renderedTemplate)

    return renderedTemplate
}

async function getTownDataFromContract(
    townId: string,
): Promise<{ name: string; shortDescription: string; longDescription: string } | undefined> {
    if (!provider) {
        return
    }

    try {
        const spaceAddress = ethers.utils.getAddress(townId.slice(2, 42))

        if (!VITE_ADDRESS_SPACE_OWNER) {
            return
        }

        const contract = new ethers.Contract(VITE_ADDRESS_SPACE_OWNER, SpaceOwnerAbi, provider)

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
