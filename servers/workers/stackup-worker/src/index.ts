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

export interface Env extends AuthEnv {
    ENVIRONMENT: Environment
    PAYMASTER_ADDRESS: string
    SKIP_TOWNID_VERIFICATION: string
    CREATE_TOWN: KVNamespace // KV Namespace for createTowns transactions
    OVERRIDES: KVNamespace // KV Namespace for createTowns transactions
    EMAIL_WHITELIST: KVNamespace
    TOWN_WHITELIST: KVNamespace
    ADDRESS_WHITELIST: KVNamespace
    //JOIN_TOWN: KVNamespace // KV Namespace for joinTowns transactions
    //LINK_WALLET_TO_ROOT_KEY: KVNamespace // KV Namespace for linkWalletToRootKey transactions
    STACKUP_API_TOKEN: string
    PRIVY_APP_KEY: string
    PRIVY_APP_ID: string
    ALCHEMY_API_KEY: string
    SKIP_LIMIT_VERIFICATION: string
    REFUSE_ALL_OPS: string
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
            const response = await handleRequest(request, env)
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
