import { withCorsHeaders, AuthEnv, isOptionsRequest, getOptionsResponse } from '../../common'

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
    ENVIRONMENT: string
}

// have to use module syntax to gain access to env which contains secret variables for local dev
export default {
    // eslint-disable-next-line  @typescript-eslint/no-unused-vars
    fetch(request: Request, env: Env, ctx: ExecutionContext) {
        return worker.fetch(request, env)
    },
}

export const worker = {
    // eslint-disable-next-line  @typescript-eslint/no-unused-vars
    async fetch(request: FetchEvent['request'], env: Env): Promise<Response> {
        if (isOptionsRequest(request)) {
            return getOptionsResponse(request)
        }

        try {
            const newRequest = new Request(new URL(AMPLITUDE_API), new Request(request.clone()))
            return await fetch(newRequest)
        } catch (e) {
            console.error(`error: `, e)
            return new Response('Internal Server Error', {
                status: 500,
                headers: {
                    'content-type': 'application/json;charset=UTF-8',
                    ...withCorsHeaders(request),
                },
            })
        }
    },
}
