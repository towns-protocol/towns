import { Request as IttyRequest, Router } from 'itty-router'
import { Env } from '.'
import { sendSnsTopic } from './snsClient'
import { createLinearIssue } from './linearClient'

const IMAGE_OPTIONS_REGEX = '(=|,)+'
const DEFAULT_OPTIONS = 'width=1920,fit=scale-down'
export const IMAGE_DELIVERY_SERVICE = 'https://imagedelivery.net'
const CACHE_TTL = 5

const router = Router()

type WorkerRequest = Request & IttyRequest

router.get('/space-icon-bypass/:id', async (request: WorkerRequest, env) => {
    const { pathname } = new URL(request.url)
    const pathSplit = pathname.split('/')
    const spaceId: string = pathSplit[pathSplit.length - 1]

    if (spaceId === undefined) {
        return new Response('spaceId error', { status: 400 })
    }
    // John's note: bypass CF image resizing worker that uses a custom
    // Worker cache key and does not support cache purge
    // without fetching from a different Zone than the
    // originating request.
    // see: https://community.cloudflare.com/t/purging-image-resizing-cached-images/436250/5
    // and https://developers.cloudflare.com/images/image-resizing/url-format/#caching
    const destinationURL = new URL(
        [IMAGE_DELIVERY_SERVICE, env.IMAGE_HASH, spaceId, 'public'].join('/'),
    )

    const newRequest: Request = new Request(destinationURL, new Request(request.clone()))
    try {
        const response = await fetch(newRequest)
        return response
    } catch (error) {
        console.error(error)
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 400,
        })
    }
})

// /space-icon/<space_id>/<IMAGE_OPTIONS>
// see https://developers.cloudflare.com/images/cloudflare-images/transform/flexible-variants/
// i.e. https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/w=400,sharpen=3
router.get('/space-icon/:id+', async (request: WorkerRequest, env) => {
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
        [IMAGE_DELIVERY_SERVICE, env.IMAGE_HASH, spaceId, 'public'].join('/'),
    )
    const newRequest: Request = new Request(destinationURL, new Request(request.clone()))
    try {
        // cache this fetch for max of CACHE_TTL seconds before revalidation
        const response = await fetch(newRequest, { cf: { cacheTtl: CACHE_TTL } })
        const buffer = await response.arrayBuffer()
        // clone response so it's no longer immutable
        const newResponse = new Response(buffer, response)
        // cache on client, but prefer revalidation when served
        // https://developers.cloudflare.com/cache/about/cache-control/#revalidation
        newResponse.headers.delete('Cache-Control')
        newResponse.headers.set('Cache-Control', 'public, no-cache')
        return newResponse
    } catch (error) {
        console.error(error)
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 400,
        })
    }
})

router.post('/space-icon/:id', async (request: WorkerRequest, env) => {
    // https://linear.app/hnt-labs/issue/HNT-7392/disabling-gateway-worker-post-requests
    return new Response(JSON.stringify({ error: 'Not allowed' }), {
        status: 403,
    })
    // // spaceId is <id>:node1.towns.com
    // const spaceId = request.params?.id
    // const copyRequest: Request = request.clone()
    // const formData = await copyRequest.formData()

    // const formId = formData.get('id')
    // if (formId !== spaceId) {
    //     return new Response(JSON.stringify({ error: 'id mismatch' }), {
    //         status: 400,
    //     })
    // }

    // try {
    //     const destinationURL = new URL([env.CF_API, env.ACCOUNT_ID, 'images/v1', spaceId].join('/'))
    //     // upsert
    //     const getUrl = new URL(
    //         [IMAGE_DELIVERY_SERVICE, env.IMAGE_HASH, spaceId, 'public'].join('/'),
    //     )
    //     return await upsertImage(getUrl, destinationURL, request, env)
    // } catch (error) {
    //     console.error(error)
    //     return new Response(JSON.stringify({ error: (error as Error).message }), {
    //         status: 400,
    //     })
    // }
})

router.post('/user/:id/avatar', async (request: WorkerRequest, env) => {
    // https://linear.app/hnt-labs/issue/HNT-7392/disabling-gateway-worker-post-requests
    return new Response(JSON.stringify({ error: 'Not allowed' }), {
        status: 403,
    })
    // // user id is equivalent to wallet address of the form 0x83..
    // const userId = request.params?.id
    // const copyRequest: Request = request.clone()
    // const formData = await copyRequest.formData()
    // const formId = formData.get('id')
    // if (formId !== userId) {
    //     return new Response(JSON.stringify({ error: 'id mismatch' }), {
    //         status: 400,
    //     })
    // }

    // try {
    //     console.log('env', env)
    //     const destinationURL = new URL([env.CF_API, env.ACCOUNT_ID, 'images/v1', userId].join('/'))
    //     // upsert
    //     const getUrl = new URL([IMAGE_DELIVERY_SERVICE, env.IMAGE_HASH, userId, 'public'].join('/'))
    //     return await upsertImage(getUrl, destinationURL, request, env)
    // } catch (error) {
    //     console.error(error)
    //     return new Response(JSON.stringify({ error: (error as Error).message }), {
    //         status: 400,
    //     })
    // }
})

// /user/<user_id>/avatar/<IMAGE_OPTIONS>
// see https://developers.cloudflare.com/images/cloudflare-images/transform/flexible-variants/
// i.e. https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/w=400,sharpen=3
router.get('/user/:id/avatar', async (request: WorkerRequest, env) => {
    const { pathname } = new URL(request.url)
    const pathSplit = pathname.split('/')
    let options: string = pathSplit[pathSplit.length - 1]
    const userId: string | undefined = request.params?.id
    if (!options.match(IMAGE_OPTIONS_REGEX)) {
        options = DEFAULT_OPTIONS
    }

    if (userId === undefined) {
        return new Response('userId error', { status: 400 })
    }
    try {
        // redirect url
        const destinationURL = new URL(
            [IMAGE_DELIVERY_SERVICE, env.IMAGE_HASH, userId, 'public'].join('/'),
        )
        const newRequest = new Request(destinationURL, request.clone())
        // cache this fetch for max of CACHE_TTL seconds before revalidation
        const response = await fetch(newRequest, { cf: { cacheTtl: CACHE_TTL } })
        // clone response so it's no longer immutable
        const buffer = await response.arrayBuffer()
        const newResponse = new Response(buffer, response)
        // cache on client, but prefer revalidation when served
        // https://developers.cloudflare.com/cache/about/cache-control/#revalidation
        newResponse.headers.delete('Cache-Control')
        newResponse.headers.set('Cache-Control', 'public, no-cache')
        return newResponse
    } catch (error) {
        console.error(error)
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 400,
        })
    }
})

router.post('/user/:id/bio', async (request: WorkerRequest, env) => {
    // https://linear.app/hnt-labs/issue/HNT-7392/disabling-gateway-worker-post-requests
    return new Response(JSON.stringify({ error: 'Not allowed' }), {
        status: 403,
    })
    // // user id is equivalent to wallet address of the form 0x83..
    // const userId = request.params?.id

    // const copyRequest: Request = request.clone()
    // const contentType = copyRequest.headers.get('content-type')
    // if (contentType !== 'application/json') {
    //     return new Response(JSON.stringify({ error: 'invalid content-type' }), {
    //         status: 400,
    //     })
    // }
    // const requestBody = JSON.stringify(await copyRequest.json())
    // const BIO_MAX_SIZE = 280

    // // validate bio length
    // if (!validateLength(JSON.parse(requestBody).bio, BIO_MAX_SIZE)) {
    //     return new Response(
    //         JSON.stringify({ error: `bio must be under ${BIO_MAX_SIZE} characters` }),
    //         { status: 400 },
    //     )
    // }
    // try {
    //     await env.USER.put(userId, requestBody)
    // } catch (error) {
    //     console.error(error)
    //     return new Response(JSON.stringify({ error: (error as Error).message }), {
    //         status: 400,
    //     })
    // }
    // return new Response('ok', { status: 200 })
})

router.get('/user/:id/bio', async (request: WorkerRequest, env) => {
    // user id is equivalent to wallet address of the form 0x83..
    const userId = request.params?.id
    const value = await env.USER.get(userId)
    if (value === null) {
        return new Response(`bio not found for user: ${userId}`, { status: 404 })
    }
    return new Response(JSON.parse(JSON.stringify(value)), { status: 200 })
})

router.post('/space/:id/identity', async (request: WorkerRequest, env) => {
    // https://linear.app/hnt-labs/issue/HNT-7392/disabling-gateway-worker-post-requests
    return new Response(JSON.stringify({ error: 'Not allowed' }), {
        status: 403,
    })

    // const spaceId = request.params?.id

    // const copyRequest: Request = request.clone()
    // const contentType = copyRequest.headers.get('content-type')
    // if (contentType !== 'application/json') {
    //     return new Response(JSON.stringify({ error: 'invalid content-type' }), {
    //         status: 400,
    //     })
    // }
    // const requestBody = JSON.stringify(await copyRequest.json())
    // const BIO_MAX_SIZE = 500

    // // validate bio length
    // if (!validateLength(JSON.parse(requestBody).bio, BIO_MAX_SIZE)) {
    //     return new Response(
    //         JSON.stringify({ error: `bio must be under ${BIO_MAX_SIZE} characters` }),
    //         { status: 400 },
    //     )
    // }
    // // validate motto length
    // if (!validateLength(JSON.parse(requestBody).motto, MOTTO_MAX_SIZE)) {
    //     return new Response(
    //         JSON.stringify({ error: `motto must be under ${MOTTO_MAX_SIZE} characters` }),
    //         { status: 400 },
    //     )
    // }
    // try {
    //     await env.SPACE.put(spaceId, requestBody)
    // } catch (error) {
    //     console.error(error)
    //     return new Response(JSON.stringify({ error: (error as Error).message }), {
    //         status: 400,
    //     })
    // }
    // return new Response('ok', { status: 200 })
})

router.get('/space/:id/identity', async (request: WorkerRequest, env) => {
    const spaceId = request.params?.id
    const value = await env.SPACE.get(spaceId)
    if (value === null) {
        return new Response(`identity not found for space: ${spaceId}`, { status: 404 })
    }
    return new Response(JSON.parse(JSON.stringify(value)), { status: 200 })
})

router.post('/user-feedback', async (request: WorkerRequest, env: Env, ctx) => {
    const uploads = (async () => {
        const formData = await request.formData()
        const requestBody = {
            env: formData.get('env') as string,
            deviceInfo: formData.get('deviceInfo') as string,
            id: formData.get('id') as string,
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            comments: formData.get('comments') as string,
            logJson: formData.get('logs') as string,
            attachments: formData.getAll('attachment[]') as unknown as File[], // Check if this works as expected
        }

        const linearConfig = {
            apiKey: env.LINEAR_API_KEY,
            teamId: env.LINEAR_TEAM_ID,
            graphQLUrl: env.LINEAR_GRAPHQL_URL,
            userFeedbackProjectId: env.LINEAR_USER_FEEDBACK_PROJECT_ID,
        }

        const asyncTasks = [
            async () => {
                try {
                    await createLinearIssue({
                        config: linearConfig,
                        ...requestBody,
                    })
                } catch (error) {
                    console.error(`Failed to create linear issue: ${error}`)
                } finally {
                    console.log('Linear feedback submitted')
                }
            },
            async () => {
                try {
                    await sendSnsTopic(
                        {
                            Message: JSON.stringify({
                                name: requestBody.name,
                                email: requestBody.email,
                                comments: requestBody.comments,
                            }), // MESSAGE_TEXT
                            TopicArn: env.USER_FEEDBACK_TOPIC_ARN, // TOPIC_ARN
                        },
                        env.AWS_ACCESS_KEY_ID,
                        env.AWS_SECRET_ACCESS_KEY,
                    )
                } catch (error) {
                    console.error(`Failed to send SNS topic: ${error}`)
                } finally {
                    console.log('SNS feedback submitted')
                }
            },
        ]

        try {
            await Promise.all(asyncTasks.map((fn) => fn()))
        } catch (error) {
            console.error(`Failed to create linear issue or send SNS topic: ${error}`)
        } finally {
            console.log('User feedback submitted')
        }
    })()

    // Use the waitUntil method to ensure background work continues after the response
    if (ctx && typeof ctx.waitUntil === 'function') {
        ctx.waitUntil(uploads)
        console.log('User feedback queued for processing')
    } else {
        console.error('Context (ctx) is undefined or does not have waitUntil method')
    }

    // Send the response immediately
    return new Response('ok', { status: 200 })
})

router.post('/')

router.get('*', () => new Response('Not Found', { status: 404 }))

export const handleRequest = (request: WorkerRequest, env: Env, ctx: ExecutionContext) =>
    router.handle(request, env, ctx)
