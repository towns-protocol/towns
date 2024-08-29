import { Request as IttyRequest, Router } from 'itty-router'
import { type Env } from './index'
import { createLinearIssue } from './linearClient'
import { getLinearPayloadFromFormData } from './getLinearPayloadFromFormData'

const router = Router()

type WorkerRequest = Request & IttyRequest

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
    const formData = await request.formData()
    const linearPayload = getLinearPayloadFromFormData(formData)
    const linearTask = () =>
        createLinearIssue({
            config: {
                apiKey: env.LINEAR_API_KEY,
                teamId: env.LINEAR_TEAM_ID,
                graphQLUrl: env.LINEAR_GRAPHQL_URL,
                userFeedbackProjectId: env.LINEAR_USER_FEEDBACK_PROJECT_ID,
            },
            ...linearPayload,
        })

    // Use the waitUntil method to ensure background work continues after the response
    if (ctx && typeof ctx.waitUntil === 'function') {
        ctx.waitUntil(linearTask())
        console.log('User feedback queued for processing')
    } else {
        console.error('Context (ctx) is undefined or does not have waitUntil method')
    }

    // Send the response immediately
    return new Response('ok', { status: 200 })
})

router.post('/')

router.get('*', () => new Response('Not Found', { status: 404 }))

export const handleRequest = (request: WorkerRequest, env: Env, ctx?: ExecutionContext) =>
    router.handle(request, env, ctx)
