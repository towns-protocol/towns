import { StandardMerkleTree } from '@openzeppelin/merkle-tree'
import { Claim } from './types'
import {
    Environment,
    isAuthedRequest,
    isAdminAuthedRequest,
    isAllowedOrigin,
    isOptionsRequest,
    getOptionsResponse,
    withCorsHeaders,
    appendCorsHeaders,
    AuthEnv,
} from 'worker-common'
import { handleRequest } from './router'

export interface Env extends AuthEnv {
    ENVIRONMENT: Environment
    MERKLE_OBJECTS_R2: R2Bucket
}

export const worker = {
    async fetch(request: FetchEvent['request'], env: Env): Promise<Response> {
        try {
            if (isOptionsRequest(request)) {
                return getOptionsResponse(request, env.ENVIRONMENT)
            }
            if (env.ENVIRONMENT !== 'development') {
                // auth if admin request
                const path = new URL(request.url).pathname
                if (path.startsWith('/admin')) {
                    if (!isAdminAuthedRequest(request, env)) {
                        return new Response('Unauthorised', {
                            status: 401,
                            headers: withCorsHeaders(request, env.ENVIRONMENT),
                        })
                    }
                } else {
                    // auth if paymaster request
                    if (!isAuthedRequest(request, env)) {
                        return new Response('Unauthorised', {
                            status: 401,
                            headers: withCorsHeaders(request, env.ENVIRONMENT),
                        })
                    }
                    if (env.ENVIRONMENT == 'omega') {
                        if (!isAllowedOrigin(request, env.ENVIRONMENT)) {
                            console.error(`Origin is not allowed in Env: ${env.ENVIRONMENT})`)
                            return new Response('Forbidden', {
                                status: 403,
                                headers: withCorsHeaders(request, env.ENVIRONMENT),
                            })
                        }
                    }
                }
            }

            console.log(`[worker]::fetching ${request.url}`, {
                env,
            })
            const response = await handleRequest(request, env)
            const newResponse = new Response(response.body, response)
            return appendCorsHeaders(newResponse, withCorsHeaders(request, env.ENVIRONMENT))
        } catch (e) {
            console.error('[worker]::', e)
            let errMsg = ''
            switch (env.ENVIRONMENT) {
                case 'omega':
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

export default {
    fetch(request: Request, env: Env, _ctx: ExecutionContext) {
        return worker.fetch(request, env)
    },
}
