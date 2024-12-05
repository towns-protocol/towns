import { Request as IttyRequest, Router } from 'itty-router'
import { type Env } from './index'
import { createLinearIssue } from './linearClient'
import { getLinearPayloadFromFormData } from './getLinearPayloadFromFormData'
import { PrivyClient } from '@privy-io/server-auth'

const router = Router()

type WorkerRequest = Request & IttyRequest

interface CrossmintContractRegistrationRequest {
    contractAddress: string
}

router.post('/crossmint/register-contract', async (request: WorkerRequest, env: Env) => {
    const body = (await request.json()) as CrossmintContractRegistrationRequest
    if (!body.contractAddress) {
        return new Response(JSON.stringify({ error: 'Contract address is required' }), {
            status: 400,
        })
    }

    const isOmega = env.ENVIRONMENT === 'omega'

    const chain = isOmega ? 'base' : 'base-sepolia'
    const baseUrl = isOmega ? 'https://crossmint.com' : 'https://staging.crossmint.com'

    const response = await fetch(`${baseUrl}/api/v1-alpha1/collections`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': env.CROSSMINT_API_KEY,
        },
        body: JSON.stringify({
            chain,
            contractType: 'erc-721',
            args: {
                contractAddress: body.contractAddress,
                abi: [
                    {
                        inputs: [
                            {
                                internalType: 'address',
                                name: 'receiver',
                                type: 'address',
                            },
                        ],
                        name: 'joinSpace',
                        outputs: [],
                        stateMutability: 'payable',
                        type: 'function',
                    },
                ],
                mintFunctionName: 'joinSpace(address)',
                toParamName: 'receiver',
            },
            metadata: {
                title: body.contractAddress,
                name: body.contractAddress,
                description: `On Base${env.ENVIRONMENT !== 'omega' ? ' Sepolia' : ''}`,
            },
            ownership: 'self',
            category: 'other',
            scopes: ['payments:credit-card', 'payments:cross-chain'],
        }),
    })

    if (!response.ok) {
        const errorText = await response.text()
        return new Response('helloooo', { status: 504 })
    }

    const responseData = await response.json()
    return new Response(JSON.stringify(responseData), { status: 200 })
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

router.post('/user/delete', async (request: WorkerRequest, env: Env, ctx) => {
    const privyToken = request.headers.get('X-User-Token')
    if (!privyToken || privyToken === '') {
        return new Response('Missing User Token', { status: 400 })
    }

    const privyClient = new PrivyClient(env.PRIVY_APP_ID, env.PRIVY_APP_KEY)
    try {
        const verification = await privyClient.verifyAuthToken(privyToken)
        if (!verification.userId) {
            return new Response('Invalid User Token', { status: 400 })
        }
        await privyClient.deleteUser(verification.userId)
        console.log(`User ${verification.userId} deleted`)
        return new Response('ok', { status: 200 })
    } catch (error) {
        console.error(error)
        return new Response('Error', { status: 400 })
    }
})

router.post('/user-feedback', async (request: WorkerRequest, env: Env, ctx: ExecutionContext) => {
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

router.post('/report-content', async (request: WorkerRequest, env: Env, ctx: ExecutionContext) => {
    const formData = await request.formData()
    const linearPayload = getLinearPayloadFromFormData(formData)
    const linearTask = () =>
        createLinearIssue({
            config: {
                apiKey: env.LINEAR_API_KEY,
                teamId: env.LINEAR_TEAM_ID,
                graphQLUrl: env.LINEAR_GRAPHQL_URL,
                userFeedbackProjectId: env.LINEAR_REPORT_CONTENT_PROJECT_ID,
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
