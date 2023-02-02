import { Buffer } from 'buffer'
import { Router } from 'itty-router'
import { Env } from '.'
import { upsertImage } from './upsert'
import { handleCookie } from './cookie'

const CDN_CGI_PATH = 'cdn-cgi/image'
const CDN_CGI_PATH_ID = 'cdn-cgi/imagedelivery'
const IMAGE_OPTIONS_REGEX = '(=|,)+'
const DEFAULT_OPTIONS = 'width=1920,fit=scale-down'

const router = Router()

// /space-icon/<space_id>/<IMAGE_OPTIONS>
// see https://developers.cloudflare.com/images/image-resizing/url-format/
// for IMAGE_OPTIONS available
router.get('/space-icon/:id+', async (request, env) => {
    const { pathname } = new URL(request.url)
    const pathSplit = pathname.split('/')
    let options: string = pathSplit[pathSplit.length - 1]
    let spaceId: string

    if (options.match(IMAGE_OPTIONS_REGEX)) {
        spaceId = pathSplit[pathSplit.length - 2]
    } else {
        spaceId = pathSplit[pathSplit.length - 1]
        // John's notes 01/23:
        // optimized for desktop browsers,
        // optimize this for device in the future
        // by examining CF-device-id
        options = DEFAULT_OPTIONS
    }

    if (spaceId === undefined) {
        return new Response('spaceId error', { status: 400 })
    }
    // redirect url
    const destinationURL = new URL(
        [
            env.IMAGE_SERVICE,
            CDN_CGI_PATH,
            options,
            env.IMAGE_SERVICE,
            CDN_CGI_PATH_ID,
            env.IMAGE_HASH,
            spaceId,
            'public',
        ].join('/'),
    )

    const newRequest: Request = new Request(destinationURL, new Request(request.clone()))
    try {
        const response = await fetch(newRequest)
        return response
    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
        })
    }
})

router.post('/space-icon/:id', async (request, env) => {
    // spaceId should not include any file suffix
    const spaceId = request.params.id.split('.')[0]

    if (env.ENVIRONMENT !== 'development') {
        const cookie = await handleCookie(request.clone())
        const encodedCookie = Buffer.from(cookie, 'base64')
        const decodedCookie = encodedCookie.toString('utf8')
        const [signature, message] = decodedCookie.split('-')
        const messageJSON = JSON.parse(message)

        const newBody = {
            signature: signature,
            message: JSON.stringify(messageJSON),
            chainId: messageJSON?.chainID || 5,
            spaceId: spaceId,
        }
        const newRequestInit = {
            method: 'PUT',
            body: JSON.stringify(newBody),
        }
        const newRequest = new Request(new Request(request.clone(), newRequestInit))
        // Use a Service binding to fetch to another worker
        const authResponse = await env.authz.fetch(newRequest)
        if (authResponse.status !== 200) {
            console.log(`authResponse: ${JSON.stringify(authResponse)}`)
            return authResponse
        }
    }

    const copyRequest: Request = request.clone()
    const formData = await copyRequest.formData()
    const formId: string | null = formData.get('id')
    if ((formId as string).split('.')[0] !== spaceId) {
        return new Response(JSON.stringify({ error: 'id mismatch' }), {
            status: 400,
        })
    }

    const destinationURL = new URL([env.CF_API, env.ACCOUNT_ID, 'images/v1', spaceId].join('/'))
    // upsert
    const getUrl = new URL(
        [
            env.IMAGE_SERVICE,
            CDN_CGI_PATH,
            DEFAULT_OPTIONS,
            env.IMAGE_SERVICE,
            CDN_CGI_PATH_ID,
            env.IMAGE_HASH,
            spaceId,
            'public',
        ].join('/'),
    )
    return await upsertImage(getUrl, destinationURL, spaceId, request, env)
})

router.get('*', () => new Response('Not Found', { status: 404 }))

export const handleRequest = (request: Request, env: Env) => router.handle(request, env)
