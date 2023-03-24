import {
    isAuthedRequest,
    withCorsHeaders,
    getOptionsResponse,
    isOptionsRequest,
} from '../../common'
import { getCollectionMetadata as getCollectionMetadataInfura } from './handlers/infura/getCollectionMetadata'
import { getCollectionMetadata as getCollectionMetadataAlchemy } from './handlers/alchemy/getCollectionMetadata'
import { getNftsForOwner } from './handlers/getNfts'
import { isHolderOfCollection } from './handlers/isHolderOfCollection'
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
    }
    // TODO: remove
    else {
        // https://docs.alchemy.com/docs/choosing-a-web3-network
        const url = new URL(request.url)
        if (url.pathname.includes('eth-mainnet')) {
            request.rpcUrl = `https://eth-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`
        } else if (url.pathname.includes('eth-sepolia')) {
            request.rpcUrl = `https://eth-sepolia.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`
        } else {
            request.rpcUrl = `https://eth-goerli.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`
        }
    }
}

// TODO: Alchemy has updated their API to prefix it with /nft/v2 whereas before it was just /v2. All their endpoints seems updaated, with backwards compat for old ones. Should verify and make this the default for alchemy
const withNetworkPrefixedWithNFT = async (request: TokenProviderRequest, env: Env) => {
    // https://docs.alchemy.com/docs/choosing-a-web3-network
    const url = new URL(request.url)
    if (url.pathname.includes('eth-mainnet')) {
        request.rpcUrl = `https://eth-mainnet.g.alchemy.com/nft/v2/${env.ALCHEMY_API_KEY}`
    } else if (url.pathname.includes('eth-sepolia')) {
        request.rpcUrl = `https://eth-sepolia.g.alchemy.com/nft/v2/${env.ALCHEMY_API_KEY}`
    } else {
        request.rpcUrl = `https://eth-goerli.g.alchemy.com/nft/v2/${env.ALCHEMY_API_KEY}`
    }
}

router
    // TODO: remove? if client switches to using balanceOf we don't need this
    // https://docs.alchemy.com/reference/isholderofcollection
    .get('/api/isHolderOfCollection/:network', withNetworkPrefixedWithNFT, isHolderOfCollection)

    // get all NFTs for a wallet
    // ALCHEMY: https://docs.alchemy.com/reference/getnfts
    // TODO: add support for infura if needed
    // NOTE: If used w/ Alchemy, this should be changed to withNetworkPrefixedWithNFT, alchmemy has updated their API, but it works without it
    .get('/api/getNftsForOwner/:network/:wallet', withNetwork, getNftsForOwner)

    // TODO: REMOVE in favor of getCollectionMetadata
    .get('/api/getContractMetadata/:network', withNetwork, getCollectionMetadataAlchemy)

    // get all collections for a wallet
    // examples
    // ALCHEMY: /api/getCollectionsForOwner/al/eth-mainnet/0x0
    // INFURA: /api/getCollectionsForOwner/in/eth-mainnet/0x0
    .get(
        '/api/getCollectionsForOwner/:provider/:network/:wallet',
        withNetwork,
        withInfuraAuthHeader,
        (request: TokenProviderRequest) => {
            if (request.params?.provider === ProviderAlias.Infura) {
                return getCollectionsForOwnerInfura(request)
            } else {
                return getCollectionsForOwnerAlchemy(request)
            }
        },
    )

    // get metadata for a collection
    // examples
    // ALCHEMY: /api/getCollectionMetadata/al/eth-mainnet/0x0
    // INFURA: /api/getCollectionMetadata/in/eth-mainnet/0x0
    .get(
        '/api/getCollectionMetadata/:provider/:network',
        withNetwork,
        withInfuraAuthHeader,
        (request: TokenProviderRequest) => {
            if (request.params?.provider === ProviderAlias.Infura) {
                return getCollectionMetadataInfura(request)
            } else {
                return getCollectionMetadataAlchemy(request)
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
            return getOptionsResponse(request)
        }
        if (!isAuthedRequest(request, env)) {
            return new Response('Unauthorized', { status: 401, headers: withCorsHeaders(request) })
        }
        return worker.fetch(request, env)
    },
}
