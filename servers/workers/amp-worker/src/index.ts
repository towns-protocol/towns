import {
    withCorsHeaders,
    AuthEnv,
    isOptionsRequest,
    getOptionsResponse,
    Environment,
} from 'worker-common'

// Note: this assumes fetch is made from JS sdk.
// For using Amplitude http api use https://api2.amplitude.com/2/httpapi
// see: https://www.docs.developers.amplitude.com/analytics/apis/http-v2-api-quickstart/
// see: https://community.amplitude.com/building-and-sharing-your-analysis-58/amplitude-is-not-working-when-adblocker-is-enabled-955
const AMPLITUDE_API = 'https://api2.amplitude.com/2/httpapi'

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

const worker: ExportedHandler<Env> = {
    // eslint-disable-next-line  @typescript-eslint/no-unused-vars
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        if (isOptionsRequest(request)) {
            return getOptionsResponse(request, env.ENVIRONMENT)
        }
        if (request.method === 'GET' && new URL(request.url).pathname === '/health') {
            return new Response('OK', {
                status: 200,
                headers: {
                    'content-type': 'application/json;charset=UTF-8',
                    ...withCorsHeaders(request, env.ENVIRONMENT),
                },
            })
        }

        try {
            return await fetch(AMPLITUDE_API, request.clone())
        } catch (e) {
            return new Response('Internal Server Error', {
                status: 500,
                headers: {
                    'content-type': 'application/json;charset=UTF-8',
                    ...withCorsHeaders(request, env.ENVIRONMENT),
                },
            })
        }
    },
}

export default worker
