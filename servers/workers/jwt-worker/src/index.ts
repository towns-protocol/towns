import {
    withCorsHeaders,
    AuthEnv,
    isAuthedRequest,
    isOptionsRequest,
    getOptionsResponse,
    Environment,
} from 'worker-common'
import { handleRequest } from './handler'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Env extends AuthEnv {
    // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
    // MY_KV_NAMESPACE: KVNamespace
    //
    // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
    // MY_DURABLE_OBJECT: DurableObjectNamespace
    //
    // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
    // MY_BUCKET: R2Bucket
    ENVIRONMENT: Environment
}

export default {
    fetch(request: Request, env: Env, _ctx: ExecutionContext) {
        return worker.fetch(request, env)
    },
}

export const worker = {
    async fetch(request: FetchEvent['request'], env: Env): Promise<Response> {
        if (isOptionsRequest(request)) {
            return getOptionsResponse(request, env.ENVIRONMENT)
        }

        if (!isAuthedRequest(request, env)) {
            return new Response('Unauthorised', {
                status: 401,
                headers: withCorsHeaders(request, env.ENVIRONMENT),
            })
        }
        //console.log(`request: ${JSON.stringify(request)}`)
        const corsHeaders = withCorsHeaders(request, env.ENVIRONMENT)
        const resp = await handleRequest(request, env)
        const clone = new Response(resp.body, resp)
        for (const [key, value] of Object.entries(corsHeaders)) {
            clone.headers.set(key, value)
        }

        return clone
    },
}
