import createCorsConfig from 'cors'
import {
    getAllowedOrigins,
    getLocalDomainOrigin,
    getOnRenderOrigin,
    getTownsOrigin,
} from 'worker-common/src/cors'
import { Environment } from 'worker-common/src/environment'

const cors = createCorsConfig({
    origin: (origin, callback) => {
        const env = process.env.NODE_ENV as Environment

        if (isAllowedOrigin(origin, env)) {
            callback(null, true)
        } else {
            callback(
                new Error(`Origin "${origin}" is not allowed in Env: ${process.env.NODE_ENV})`),
            )
        }
    },
})

export function isAllowedOrigin(origin: string | undefined, env: Environment): boolean {
    const corsOrigin = getOriginForCors(origin, env)
    switch (env) {
        // case 'production': TODO: test in production
        case 'development':
        case 'test-beta':
        case 'test': {
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

function getOriginForCors(origin: string | undefined, env: Environment): string {
    const allowedOrigins = getAllowedOrigins(env)
    let foundOrigin: string | undefined
    // must check for origin. If origin is null, then allowedOrigin.includes(null) returns true for all entries in allowedOrigins
    if (origin) {
        foundOrigin =
            allowedOrigins.find((allowedOrigin) => allowedOrigin.includes(origin)) ||
            getOnRenderOrigin(origin) ||
            getTownsOrigin(origin) ||
            getLocalDomainOrigin(origin, env)
    }
    return foundOrigin ?? ''
}

export { cors }
