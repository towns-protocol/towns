import { Request as IttyRequest, Router } from 'itty-router'
import { type Env } from './index'
import { createLinearIssue } from './linearClient'
import { getLinearPayloadFromFormData } from './getLinearPayloadFromFormData'
import { PrivyClient } from '@privy-io/server-auth'
import { LinkedAccountType } from './types'
import { OpenAI } from 'openai'
import { getTipLeaderboard } from './getTipLeaderboard'
import { Address } from 'viem'

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
    const baseUrl = isOmega ? 'https://www.crossmint.com' : 'https://staging.crossmint.com'

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

/**
 * returns the list of accounts linked to the privy user, excluding the privy embedded wallet
 * @param address - the privy embedded wallet address (root key)
 * @param privyToken - the privy token to use for the request
 * @returns the list of linked accounts
 */
router.get(
    '/user/linked-accounts/:address',
    async (request: WorkerRequest, env: Env, ctx: ExecutionContext) => {
        const address = request.params?.address
        const privyToken = request.headers.get('X-User-Token')

        if (!address) {
            return new Response('Missing address', { status: 400 })
        }
        if (!privyToken) {
            return new Response('Missing Privy Token', { status: 400 })
        }
        const privyClient = new PrivyClient(env.PRIVY_APP_ID, env.PRIVY_APP_KEY)

        const verification = await privyClient.verifyAuthToken(privyToken)
        if (!verification.userId) {
            return new Response('Invalid User Token', { status: 400 })
        }

        try {
            const user = await privyClient.getUserByWalletAddress(address)
            if (!user) {
                return new Response('User not found', { status: 404 })
            }

            // filter out privy embedded wallet
            const linkedAccounts: LinkedAccountType[] = user.linkedAccounts
                .filter((account) => {
                    if (account.type === 'wallet' && account.walletClientType === 'privy') {
                        return false
                    }
                    return true
                })
                .map((account) => {
                    let identifier: string | undefined
                    switch (account.type) {
                        case 'google_oauth':
                            identifier = account.email
                            break
                        case 'apple_oauth':
                            identifier = account.email
                            break
                        case 'twitter_oauth':
                            identifier = account.username ?? undefined
                            break
                        case 'farcaster':
                            identifier = account.username
                            break
                        case 'email':
                            identifier = account.address
                            break
                        case 'phone':
                            identifier = account.number
                            break
                        default:
                            identifier = undefined
                            break
                    }
                    return {
                        type: account.type,
                        identifier,
                    }
                })

            return new Response(JSON.stringify(linkedAccounts), { status: 200 })
        } catch (error) {
            console.error('error fetching user by wallet address', error)
            return new Response('Error', { status: 400 })
        }
    },
)

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

router.post('/ai/moderate-review', async (request: WorkerRequest, env: Env) => {
    const body = await request.json()
    const { text, townContext } = body as {
        text: string
        townContext: { name: string; description?: string }
    }

    if (!text || !townContext?.name) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }

    try {
        const openai = new OpenAI({
            apiKey: env.OPENAI_API_KEY,
        })

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a review moderator. Analyze the following review and determine if it's a valid, meaningful review. The user is reviewing a Town called "${
                        townContext.name
                    }"${
                        townContext.description
                            ? ` which is described as: "${townContext.description}"`
                            : ''
                    }. This is a decentralized social network.

                    Important context:
                    - Accept any common crypto terms, memes and slang (e.g. "we cooked", "hodl", "farming", "wen moon", "gm", "wagmi")
                    - Accept ironic/humorous statements that show engagement with the Town's theme/purpose
                    - Accept roleplay or character-based comments that fit the Town's theme
                    - Accept short but meaningful reactions like "based", "bullish", "lets go"
                    - Accept references to the Town's memes, mascots, or inside jokes
                    - If the Town relates to specific tokens/projects, allow discussion and hype about them
                    - Common tokens like ETH, BTC, or the $TOWNS token are always allowed
                    - Don't refer to the town by its name, just say "this Town"
                    
                    A review is valid if it:
                    1. Shows engagement with the Town's theme/purpose (even through memes/humor)
                    2. Expresses any opinion or reaction (even brief ones)
                    3. Contributes to the Town's culture/community
                    4. Makes sense in context of what the Town is about
                    5. Has a sense of humor, it's a joke, it's a meme, it's a pun, it's a play on words, it's a play on the Town's name (example, talking about a character from a movie or tv show that is similar to the Town's name)

                    A review is invalid if it:
                    1. Is pure gibberish or random characters
                    2. Promotes completely unrelated products/tokens/services
                    3. Is clearly spam or automated content
                    4. Has no connection to the Town's purpose

                    When in doubt, err on the side of allowing the review.
                    
                    Respond with a JSON object containing:
                    {
                        "valid": boolean,
                        "reason": string (only if valid is false)
                    }`,
                },
                {
                    role: 'user',
                    content: text,
                },
            ],
            response_format: { type: 'json_object' },
            temperature: 0,
            max_tokens: 50,
            top_p: 1,
            n: 1,
        })

        const result = JSON.parse(
            response.choices[0].message.content || '{"valid": false, "reason": "Invalid response"}',
        )

        return new Response(JSON.stringify(result), { status: 200 })
    } catch (error) {
        console.error('AI validation error:', error)
        return new Response(JSON.stringify({ valid: true }), { status: 200 })
    }
})

router.get('/tips/:spaceAddress/leaderboard', async (request: WorkerRequest, env: Env) => {
    const spaceAddress = request.params?.spaceAddress as Address
    if (!spaceAddress) {
        return new Response(JSON.stringify({ error: 'Missing space address' }), {
            status: 400,
        })
    }

    try {
        const cachedLeaderboard = await env.TIP_LEADERBOARD_KV.get<{
            leaderboard: Record<string, string>
            lastUpdatedAt: number
        }>(spaceAddress, 'json')
        if (cachedLeaderboard) {
            return new Response(JSON.stringify(cachedLeaderboard), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=60',
                },
            })
        }

        const leaderboard = await getTipLeaderboard(
            spaceAddress,
            env.ALCHEMY_RPC_URL,
            env.ENVIRONMENT,
        )
        const lastUpdatedAt = new Date().getTime()

        if (leaderboard.length > 0) {
            await env.TIP_LEADERBOARD_KV.put(
                spaceAddress,
                JSON.stringify({
                    leaderboard: Object.fromEntries(
                        leaderboard.map(({ sender, amount }) => [sender, amount]),
                    ),
                    lastUpdatedAt,
                }),
                {
                    expirationTtl: 15 * 60,
                },
            )
        }

        return new Response(
            JSON.stringify({
                leaderboard: Object.fromEntries(
                    leaderboard.map(({ sender, amount }) => [sender, amount]),
                ),
                lastUpdatedAt,
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=60',
                },
            },
        )
    } catch (error) {
        console.error('Failed to fetch leaderboard:', error)
        return new Response(JSON.stringify({ error: 'Failed to fetch leaderboard data' }), {
            status: 500,
        })
    }
})

router.post('/')

router.get('*', () => new Response('Not Found', { status: 404 }))

export const handleRequest = (request: WorkerRequest, env: Env, ctx?: ExecutionContext) =>
    router.handle(request, env, ctx)
