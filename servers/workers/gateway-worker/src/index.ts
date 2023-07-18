import {
    withCorsHeaders,
    AuthEnv,
    isAuthedRequest,
    isOptionsRequest,
    getOptionsResponse,
    Environment,
} from '../../common'
import { handleRequest } from './handler'

/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// These initial Types are based on bindings that don't exist in the project yet,
// you can follow the links to learn how to implement them.
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
    API_TOKEN: string
    CF_API: string
    ACCOUNT_ID: string
    ENVIRONMENT: Environment
}

// have to use module syntax to gain access to env which contains secret variables for local dev
export default {
    fetch(request: Request, env: Env, ctx: ExecutionContext) {
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
        console.log(`request: ${JSON.stringify(request)}`)
        const corsHeaders = withCorsHeaders(request, env.ENVIRONMENT)
        const resp = await handleRequest(request, env)
        const clone = new Response(resp.body, resp)
        for (const [key, value] of Object.entries(corsHeaders)) {
            clone.headers.set(key, value)
        }

        return clone
    },
}
