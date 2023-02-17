import {
    isAuthedRequest,
    withCorsHeaders,
    getOptionsResponse,
    isOptionsRequest,
} from '../../common'
import { getContractMetadata } from './handlers/getContractMetadata'
import { getNftsForOwner } from './handlers/getNfts'
import { router } from './router'
import { Env, RequestWithAlchemyConfig } from './types'

// can't use Alchmey sdk b/c they use Axios internally and we get an error in worker environment with axios adapter
// https://community.cloudflare.com/t/typeerror-e-adapter-s-adapter-is-not-a-function/166469
// if we want to explore, can open PR with Alchemy SDK where it accepts axios adapter as a param
const withNetwork = async (request: RequestWithAlchemyConfig, env: Env) => {
    // https://docs.alchemy.com/docs/choosing-a-web3-network
    const url = new URL(request.url)
    if (url.pathname.includes('eth-mainnet')) {
        request.rpcUrl = `https://eth-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`
    } else {
        request.rpcUrl = `https://eth-goerli.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`
    }
}

router
    // get high-level metadata for a contract/collection
    // https://docs.alchemy.com/reference/getcontractmetadata
    .get('/api/getContractMetadata/:network', withNetwork, getContractMetadata)
    // get all NFTs for a wallet
    // https://docs.alchemy.com/reference/getnfts
    .get('/api/getNftsForOwner/:network/:wallet', withNetwork, getNftsForOwner)
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
