import { parse } from 'cookie'
import { Env } from '.'

const COOKIE_NAME = 'zion_siwe'

export const handleCookie = async (request: Request): Promise<string> => {
    const cookie = parse(request.clone().headers.get('Cookie') || '')
    if (cookie[COOKIE_NAME] != null) {
        // Respond with the cookie value
        return cookie[COOKIE_NAME]
    }
    return 'no cookie'
}

export const invalidCookieResponse = () => {
    return new Response(JSON.stringify({ error: 'invalid cookie' }), {
        status: 400,
        headers: {
            'X-invalid-cookie': 'true',
        },
    })
}
