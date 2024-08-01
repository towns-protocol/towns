import fastifyStatic from '@fastify/static'
import fastifyView from '@fastify/view'
import ejs from 'ejs'
import { ethers } from 'ethers'
import Fastify, { FastifyReply } from 'fastify'
import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import NodeCache from 'node-cache'
import { getPackageVersion } from './utils/getPackageVersion'
import { config } from './config'
import { getWeb3Deployment, ISpaceOwnerShim, SpaceOwner } from '@river-build/web3'

const { PROVIDER_URL, MODE, PORT, VITE_RIVER_DEFAULT_ENV } = config

const cache = new NodeCache({ stdTTL: 900 }) // 900 seconds = 15 minutes

const server = Fastify({
    logger: true,
})

const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL)

console.log('provider', MODE, VITE_RIVER_DEFAULT_ENV, PROVIDER_URL)

let spaceOwner: ISpaceOwnerShim | undefined

if (VITE_RIVER_DEFAULT_ENV) {
    const web3Deployment = getWeb3Deployment(VITE_RIVER_DEFAULT_ENV)
    const contract = new SpaceOwner(web3Deployment.base, provider)
    spaceOwner = contract.spaceOwner
}

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
        const exactMatch = townId && urlPath.match(new RegExp(`^/t/[0-9a-f]{64}/?$`))
        const html = await updateTemplate({ townId, route: exactMatch ? 'town-page' : 'page' })
        return reply.header('Content-Type', 'text/html').send(html)
    } else if (urlPath === '/version') {
        const version = await getPackageVersion()
        if (version) {
            return reply.header('Content-Type', 'text/json').send(JSON.stringify({ version }))
        }
    }

    const html = await updateTemplate()
    return reply.code(404).header('Content-Type', 'text/html').send(html)
})

const start = async () => {
    try {
        const hours = 60 * 60
        // Register the static plugin
        await server.register(fastifyStatic, {
            root: path.join(__dirname, '..', '..', 'app', 'dist'),
            prefix: '/', // optional: default '/'
            index: false,
            setHeaders: (res: FastifyReply['raw'], _path: string, _stat: Stats) => {
                res.setHeader(
                    'Cache-Control',
                    `max-age=${1 * hours}, s-maxage=${1 * hours}, public`,
                )
                res.setHeader(
                    'CDN-Cache-Control',
                    `max-age=${1 * hours}, s-maxage=${1 * hours}, public`,
                )
            },
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

type TownData = {
    name?: string
    shortDescription?: string
    longDescription?: string
    uri?: string
    tokenId?: number
    createdAt?: number
    networkId?: string
    address?: string
    owner?: string
    disabled?: boolean
}

async function updateTemplate({
    townId,
    route,
}: { townId?: string; route?: 'town-page' | 'page' } = {}) {
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

    let townData: TownData | undefined

    if (townId && validateTownId(townId)) {
        // default town info
        info.description = ``
        info.image = `https://imagedelivery.net/qaaQ52YqlPXKEVQhjChiDA/${townId}/thumbnail600`

        townData = await getTownDataFromContract(townId)

        console.log({ townData })

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
        .replace(/__ssr__/g, townId ? JSON.stringify({ townData, route }) : '')

    cache.set(cacheKey, renderedTemplate)

    return renderedTemplate
}

async function getTownDataFromContract(townId: string): Promise<TownData | undefined> {
    if (!spaceOwner) {
        return
    }

    try {
        const spaceAddress = ethers.utils.getAddress(townId.slice(2, 42))

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const result = await spaceOwner.read.getSpaceInfo(spaceAddress)

        return result
            ? {
                  address: spaceAddress,
                  name: result.name,
                  shortDescription: result.shortDescription,
                  longDescription: result.longDescription,
                  tokenId: Number(result.tokenId),
                  createdAt: Number(result.createdAt),
                  uri: result.uri,
                  networkId: townId,
                  disabled: true, // TODO: pausable
                  owner: '', // TODO: ownable
              }
            : undefined
    } catch (error) {
        server.log.error('Error fetching town name from contract' + JSON.stringify(error))
        return
    }
}
