import {
    isAuthedRequest,
    withCorsHeaders,
    getOptionsResponse,
    isOptionsRequest,
} from 'worker-common'
import { getCollectionMetadata as getCollectionMetadataInfura } from './handlers/infura/getCollectionMetadata'
import { getCollectionMetadata as getCollectionMetadataAlchemy } from './handlers/alchemy/getCollectionMetadata'
import { router } from './router'
import { Env, TokenProviderRequest } from './types'
import { getCollectionsForOwner as getCollectionsForOwnerInfura } from './handlers/infura/getCollectionsForOwner'
import { getCollectionsForOwner as getCollectionsForOwnerAlchemy } from './handlers/alchemy/getCollectionsForOwner'
import { Buffer } from 'buffer'

const alchemyNetworks = {
    mainnet: 'eth-mainnet',
    goerli: 'eth-goerli',
    sepolia: 'eth-sepolia', // not supported as of 3.23.2023
}

const alchemyNetworkMapToChainId = {
    [alchemyNetworks.mainnet]: 1,
    [alchemyNetworks.sepolia]: 11155111,
    [alchemyNetworks.goerli]: 5,
}

enum ProviderAlias {
    Infura = 'in',
    Alchemy = 'al',
}

const withInfuraAuthHeader = (request: TokenProviderRequest, env: Env) => {
    const provider = request.params?.provider

    if (provider === ProviderAlias.Infura) {
        const Auth = Buffer.from(env.INFURA_API_KEY + ':' + env.INFURA_API_SECRET).toString(
            'base64',
        )
        request.authHeader = `Basic ${Auth}`
    }
}

// adds a rpcUrl to the request object
const withNetwork = async (request: TokenProviderRequest, env: Env) => {
    const provider = request.params?.provider
    const network = request.params?.network
    if (provider === ProviderAlias.Infura) {
        const base = `https://nft.api.infura.io/networks`
        switch (network) {
            case alchemyNetworks.mainnet:
                request.rpcUrl = `${base}/${alchemyNetworkMapToChainId[alchemyNetworks.mainnet]}`
                break
            case alchemyNetworks.goerli:
                request.rpcUrl = `${base}/${alchemyNetworkMapToChainId[alchemyNetworks.goerli]}`
                break
            case alchemyNetworks.sepolia:
                request.rpcUrl = `${base}/${alchemyNetworkMapToChainId[alchemyNetworks.sepolia]}`
                break
            default:
                return new Response(`invalid network:: ${network}`, { status: 400 })
        }
    } else if (provider === ProviderAlias.Alchemy) {
        let base
        switch (network) {
            case alchemyNetworks.mainnet:
                base = `https://${alchemyNetworks.mainnet}`
                break
            case alchemyNetworks.goerli:
                base = `https://${alchemyNetworks.goerli}`
                break
            case alchemyNetworks.sepolia:
                base = `https://${alchemyNetworks.sepolia}`
                break
            default:
                return new Response(`invalid network:: ${network}`, { status: 400 })
        }

        request.rpcUrl = `${base}.g.alchemy.com/nft/v2/${env.ALCHEMY_API_KEY}`
    } else {
        return new Response(`invalid provider:: ${provider}`, { status: 400 })
    }
}

router
    /**
     * isHolderOfCollection
     * Not used currently. If needed, must add support for infura
     * .get('/api/isHolderOfCollection/:network', withNetwork, isHolderOfCollection)
     */

    /**
     * getNftsForOwner
     * Not used currently. If needed, must add support for infura
     * .get('/api/getNftsForOwner/:network/:wallet', withNetwork, getNftsForOwner)
     */

    /**
     * getCollectionsForOwner
     * get all collections for a wallet
     *
     * examples
     * ALCHEMY: /api/getCollectionsForOwner/al/eth-mainnet/0x0
     * INFURA: /api/getCollectionsForOwner/in/eth-mainnet/0x0
     */
    .get(
        '/api/getCollectionsForOwner/:provider/:network/:wallet',
        withNetwork,
        withInfuraAuthHeader,
        (request: TokenProviderRequest, env: Env) => {
            if (request.params?.provider === ProviderAlias.Infura) {
                return getCollectionsForOwnerInfura(request, env.ENVIRONMENT)
            } else {
                return getCollectionsForOwnerAlchemy(request, env.ENVIRONMENT)
            }
        },
    )

    /**
     * getCollectionMetadata
     * get metadata for a collection
     *
     * requires a contractAddress query param
     * TODO: change query param to path param
     *
     * examples
     * ALCHEMY: /api/getCollectionMetadata/al/eth-mainnet?contractAddress=0x0
     * INFURA: /api/getCollectionMetadata/in/eth-mainnet?contractAddress=0x0
     */
    .get(
        '/api/getCollectionMetadata/:provider/:network',
        withNetwork,
        withInfuraAuthHeader,
        (request: TokenProviderRequest, env: Env) => {
            if (request.params?.provider === ProviderAlias.Infura) {
                return getCollectionMetadataInfura(request, env)
            } else {
                return getCollectionMetadataAlchemy(request, env.ENVIRONMENT)
            }
        },
    )

    .get('*', () => new Response('Not found', { status: 404 }))

export const worker = {
    async fetch(request: Request, env: Env) {
        return router.handle(request, env)
    },
}

export default {
    fetch(request: Request, env: Env) {
        if (isOptionsRequest(request)) {
            return getOptionsResponse(request, env.ENVIRONMENT)
        }
        if (!isAuthedRequest(request, env)) {
            return new Response('Unauthorized', {
                status: 401,
                headers: withCorsHeaders(request, env.ENVIRONMENT),
            })
        }
        return worker.fetch(request, env)
    },
}
