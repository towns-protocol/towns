import {
    withCorsHeaders,
    AuthEnv,
    isAuthedRequest,
    isOptionsRequest,
    getOptionsResponse,
    Environment,
    isAllowedOrigin,
    appendCorsHeaders,
    isAdminAuthedRequest,
} from 'worker-common'

import { handleRequest } from './router'
import { durationLogger } from './utils'
import { PrivyClient } from '@privy-io/server-auth'

export interface Env extends AuthEnv {
    ENVIRONMENT: Environment
    PAYMASTER_ADDRESS: string
    SKIP_TOWNID_VERIFICATION: string
    CREATE_TOWN: KVNamespace // KV Namespace for createSpaces transactions
    OVERRIDES: KVNamespace // KV Namespace for createSpaces transactions
    EMAIL_WHITELIST: KVNamespace
    TOWN_WHITELIST: KVNamespace
    ADDRESS_WHITELIST: KVNamespace
    //JOIN_TOWN: KVNamespace // KV Namespace for joinTowns transactions
    //LINK_WALLET_TO_ROOT_KEY: KVNamespace // KV Namespace for linkWalletToRootKey transactions
    PAYMASTER_RPC_URL: string
    PRIVY_APP_KEY: string
    PRIVY_APP_ID: string
    ALCHEMY_API_KEY: string
    SKIP_LIMIT_VERIFICATION: string
    REFUSE_ALL_OPS: string
    // if true, will use fake privy verification
    SKIP_PRIVY_VERIFICATION: string

    LIMIT_CREATE_SPACE?: number
    LIMIT_ROLE_SET?: number
    LIMIT_ENTITLEMENT_SET?: number
    LIMIT_CHANNEL_CREATE?: number
    LIMIT_LINK_WALLET?: number
    LIMIT_UPDATE_SPACE_INFO?: number
    LIMIT_BAN_UNBAN?: number
}

export default {
    fetch(request: Request, env: Env, _ctx: ExecutionContext) {
        return worker.fetch(request, env)
    },
}

export const worker = {
    async fetch(request: FetchEvent['request'], env: Env): Promise<Response> {
        try {
            if (isOptionsRequest(request)) {
                return getOptionsResponse(request, env.ENVIRONMENT)
            }
            if (env.ENVIRONMENT !== 'development') {
                if (!isAuthedRequest(request, env)) {
                    return new Response('Unauthorised', {
                        status: 401,
                        headers: withCorsHeaders(request, env.ENVIRONMENT),
                    })
                }

                if (!isAllowedOrigin(request, env.ENVIRONMENT)) {
                    console.error(`Origin is not allowed in Env: ${env.ENVIRONMENT})`)
                    return new Response('Forbidden', {
                        status: 403,
                        headers: withCorsHeaders(request, env.ENVIRONMENT),
                    })
                }

                // auth if admin request
                const path = new URL(request.url).pathname
                if (path.startsWith('/admin')) {
                    if (!isAdminAuthedRequest(request, env)) {
                        return new Response('Unauthorised', {
                            status: 401,
                            headers: withCorsHeaders(request, env.ENVIRONMENT),
                        })
                    }
                }
            }

            const privyClient = new PrivyClient(env.PRIVY_APP_ID, env.PRIVY_APP_KEY)

            const durationRequest = durationLogger(request.url)
            const response = await handleRequest(request, env, { privyClient })
            durationRequest()
            const newResponse = new Response(response.body, response)
            return appendCorsHeaders(newResponse, withCorsHeaders(request, env.ENVIRONMENT))
        } catch (e) {
            console.error('[worker]::', e)
            let errMsg = ''
            switch (env.ENVIRONMENT) {
                case 'production':
                    errMsg = 'Oh oh... our server has an issue. Please try again later.'
                    break
                default:
                    errMsg = JSON.stringify(e)
                    break
            }
            return new Response(errMsg, {
                status: 500, // Internal Server Error
                headers: withCorsHeaders(request, env.ENVIRONMENT),
            })
        }
    },
}
