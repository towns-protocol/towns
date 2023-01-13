import { withCorsHeaders } from './cors'

export const isOptionsRequest = (request: Request) => request.method === 'OPTIONS'

export const getOptionsResponse = (request: Request) =>
    new Response(null, {
        status: 204,
        headers: withCorsHeaders(request),
    })
