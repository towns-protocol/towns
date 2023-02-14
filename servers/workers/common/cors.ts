const allowedOrigins = ['http://localhost:3000', 'towns.com', 'app.towns.com']

const onRenderOrigin = (origin: string): string | undefined => {
    if (origin.includes('onrender.com') && origin.includes('harmony-web')) {
        return origin
    }
}

const corsHeaders = (origin: string) => ({
    'Access-Control-Allow-Headers':
        'Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Authorization, Cache-Control',
    'Access-Control-Allow-Methods': 'GET, OPTIONS, POST',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
})

const checkOrigin = (request: Request) => {
    const origin = request.headers.get('Origin') || ''

    const foundOrigin =
        allowedOrigins.find((allowedOrigin) => allowedOrigin.includes(origin)) ||
        onRenderOrigin(origin)

    return foundOrigin ? foundOrigin : allowedOrigins[0]
}

export const withCorsHeaders = (request: Request) => corsHeaders(checkOrigin(request))
