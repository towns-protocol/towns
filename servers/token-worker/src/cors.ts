const allowedOrigins = ['http://localhost:3000']

const onRenderOrigin = (origin: string): string | undefined => {
    if (origin.includes('onrender.com') && origin.includes('harmony-web')) {
        return origin
    }
}

const corsHeaders = (origin: string) => ({
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Origin': origin,
})

const checkOrigin = (request: Request) => {
    const origin = request.headers.get('Origin') || ''

    const foundOrigin =
        allowedOrigins.find((allowedOrigin) => allowedOrigin.includes(origin)) ||
        onRenderOrigin(origin)

    return foundOrigin ? foundOrigin : allowedOrigins[0]
}

export const withCorsHeaders = (request: Request) => corsHeaders(checkOrigin(request))
