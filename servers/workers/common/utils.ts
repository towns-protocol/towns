import { Environment } from './environment'
import { withCorsHeaders } from './cors'

export function isOptionsRequest(request: Request): boolean {
    return request.method === 'OPTIONS'
}

export function getOptionsResponse(request: Request, env: Environment): Response {
    return new Response(null, {
        status: 204,
        headers: withCorsHeaders(request, env),
    })
}
