import {
    withCorsHeaders,
    AuthEnv,
    isAuthedRequest,
    isOptionsRequest,
    getOptionsResponse,
    Environment,
} from 'worker-common'
import { handleRequest } from './handler'

export interface Env extends AuthEnv {
    API_TOKEN: string
    CF_API: string
    ACCOUNT_ID: string
    ENVIRONMENT: Environment
    LINEAR_API_KEY: string
    LINEAR_TEAM_ID: string
    LINEAR_GRAPHQL_URL: string
    LINEAR_USER_FEEDBACK_PROJECT_ID: string
    USER_FEEDBACK_TOPIC_ARN: string
}

export default {
    fetch(request: Request, env: Env, ctx: ExecutionContext) {
        return worker.fetch(request, env, ctx)
    },
}

export const worker = {
    async fetch(
        request: FetchEvent['request'],
        env: Env,
        ctx?: ExecutionContext,
    ): Promise<Response> {
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
        const resp = await handleRequest(request, env, ctx) // Pass the context here
        const clone = new Response(resp.body, resp)
        for (const [key, value] of Object.entries(corsHeaders)) {
            clone.headers.set(key, value)
        }

        return clone
    },
}
