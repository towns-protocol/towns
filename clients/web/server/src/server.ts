import './tracer' // must come before importing any instrumented module.

import fastifyStatic from '@fastify/static'
import fastifyView from '@fastify/view'
import ejs from 'ejs'
import { ethers } from 'ethers'
import Fastify from 'fastify'
import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import NodeCache from 'node-cache'
import { appPackageVersion } from './utils/app-package-version'
import { config } from './config'
import {
    getWeb3Deployment,
    ISpaceOwnerShim,
    SpaceInfo,
    SpaceOwner,
    SpaceAddressFromSpaceId,
} from '@river-build/web3'
import { makeSpaceStreamId } from '@river-build/sdk/src/id'

const { PROVIDER_URL, MODE, PORT, VITE_RIVER_ENV } = config

const cache = new NodeCache({ stdTTL: 900 }) // 900 seconds = 15 minutes

const server = Fastify({
    logger: true,
})

const buildStreamMetadataUrl = (mode: string) => {
    switch (mode) {
        case 'omega':
            return 'https://river.delivery'
        case 'gamma':
            return 'https://gamma.river.delivery'
        case 'alpha':
            return 'https://alpha.river.delivery'
        default:
            return 'http://localhost:3002'
    }
}

const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL)

console.log('provider', MODE, VITE_RIVER_ENV, PROVIDER_URL)

let spaceOwner: ISpaceOwnerShim | undefined

if (VITE_RIVER_ENV) {
    const web3Deployment = getWeb3Deployment(VITE_RIVER_ENV)
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
    const baseUrl = `https://${request.headers.host}`
    let urlPath: string
    try {
        urlPath = new URL(request.raw.url ?? '', baseUrl).pathname
    } catch (error) {
        urlPath = '/'
    }

    const filePath = path.join(__dirname, '..', '..', 'app', 'dist', urlPath)

    if (await checkFileExists(filePath)) {
        // If file exists, serve the static file
        return reply.sendFile(urlPath)
    } else if (urlPath.startsWith('/t/') || urlPath === '/') {
        const townId = getTownIdFromPath(urlPath)
        const exactMatch = townId && isTownPageExactMatch(urlPath)
        const html = await updateTemplate({ townId, route: exactMatch ? 'town-page' : 'page' })
        return reply.header('Content-Type', 'text/html').send(html)
    } else if (urlPath === '/version' || urlPath === '/data/version') {
        return reply.header('Content-Type', 'text/json').send({ version: appPackageVersion })
    } else if (urlPath === '/data/explore') {
        return reply.header('Content-Type', 'text/json').send({
            exploreTowns: config.VITE_EXPLORE_TOWNS,
        })
    }

    const html = await updateTemplate()
    return reply.code(404).header('Content-Type', 'text/html').send(html)
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

type TownData = Partial<SpaceInfo>

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
        image: '/og-image.jpg',
    }

    let townData: TownData | undefined

    if (townId && validateTownId(townId)) {
        const spaceAddress = SpaceAddressFromSpaceId(townId)
        // default town info
        info.description = ``
        info.image = buildStreamMetadataUrl(MODE) + `/space/${spaceAddress}/image`

        townData = await getTownDataFromContract(townId)

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
                  tokenId: result.tokenId.toString(),
                  createdAt: result.createdAt.toString(),
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

// as a transition, this works for both streamId and contract address formats
const townIdRegex = new RegExp('/t/([0-9a-f]{64}|0x[0-9a-f]{40})', 'i')

function getTownIdFromPath(urlPath: string) {
    const match = urlPath.match(townIdRegex)?.[1] ?? ''
    if (match.startsWith('0x')) {
        return makeSpaceStreamId(match)
    }
    return match
}

// matches town landing page segment, used to hint the app to focus
// rendering the public town page
const townPageExactMatch = new RegExp('/t/([0-9a-f]{64}|0x[0-9a-f]{40})/?$', 'i')

function isTownPageExactMatch(urlPath: string) {
    return townPageExactMatch.test(urlPath)
}
