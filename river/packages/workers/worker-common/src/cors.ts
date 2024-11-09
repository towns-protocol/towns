import { Environment } from './environment'

export function getAllowedOrigins(env: Environment): string[] {
    switch (env) {
        case 'development':
            return ['http://localhost:8686']
        case 'gamma':
        case 'omega':
            return ['https://river.build']
        default:
            return []
    }
}

export function getLocalDomainOrigin(origin: string, env: Environment): string | undefined {
    // Matches a local domain like https://*.local:3000
    const rExp = /https:\/\/(\w+).local:3000/
    switch (env) {
        case 'development':
        case 'gamma':
            return rExp.test(origin) ? origin : undefined
        default:
            return undefined
    }
}

function getCorsHeaders(origin: string): HeadersInit {
    return {
        'Access-Control-Allow-Headers':
            'Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Authorization, Cache-Control, Baggage, Sentry-Trace, X-PM-Token',
        'Access-Control-Allow-Methods': 'GET, OPTIONS, POST, PUT',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Expose-Headers': 'X-invalid-cookie,X-PM-Token',
    }
}

function getOriginForCors(request: Request, env: Environment): string {
    const origin = request.headers.get('Origin')
    const allowedOrigins = getAllowedOrigins(env)
    let foundOrigin: string | undefined
    // must check for origin. If origin is null, then allowedOrigin.includes(null) returns true for all entries in allowedOrigins
    if (origin) {
        foundOrigin =
            allowedOrigins.find((allowedOrigin) => allowedOrigin.includes(origin)) ||
            getLocalDomainOrigin(origin, env)
    }
    return foundOrigin ?? ''
}

export function isAllowedOrigin(request: Request, env: Environment): boolean {
    const corsOrigin = getOriginForCors(request, env)
    switch (env) {
        case 'development':
        case 'gamma': {
            const origin = request.headers.get('Origin')
            // RFC Origin: https://www.rfc-editor.org/rfc/rfc6454
            // The RFC states that the origin is null is allowed:
            // "Whenever a user agent issues an HTTP request from a "privacy-
            //  sensitive" context, the user agent MUST send the value "null" in
            //  the Origin header field."
            //
            // Researching the topic more, it looks like the origin is null in
            // many scenarios, some of which is exploitable:
            // https://portswigger.net/web-security/cors
            //  * Cross-origin redirects.
            //  * Requests from serialized data.
            //  * Request using the file: protocol.
            //  * Sandboxed cross-origin requests.
            //
            // origin is also null when localhost is used during development
            // only allow origin null for local development or test environments
            return !origin || (corsOrigin ? true : false)
        }
        default:
            // be strict about the allowed origin
            return corsOrigin ? true : false
    }
}

export function withCorsHeaders(request: Request, env: Environment): HeadersInit {
    return getCorsHeaders(getOriginForCors(request, env))
}

export function appendCorsHeaders(response: Response, corsHeaders: HeadersInit): Response {
    Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value as string)
    })
    return response
}
