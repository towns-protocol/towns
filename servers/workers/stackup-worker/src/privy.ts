import { AuthTokenClaims, PrivyClient } from '@privy-io/server-auth'
import { Env } from '.'
import { durationLogger, WorkerRequest } from './utils'

const PRIVY_API_URL = 'https://auth.privy.io/api/v1'

interface LinkedAccount {
    type: string
    address: string
    chain_type?: string
    email?: string
    verified_at: number
}

interface PrivyApiSingleUserResponse {
    id: string
    created_at: number
    linked_accounts: LinkedAccount[]
}

interface PrivySearchRequest {
    // Filter users by email's, phone number's, and wallet address's that contain the term
    searchTerm?: string
    walletAddresses?: string[]
}

// Type guard for Privy search respoonse
// see: https://docs.privy.io/guide/server/users/get
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isPrivyApiSearchResponse(obj: any): obj is PrivyApiSingleUserResponse {
    if (typeof obj !== 'object' || obj === null) {
        return false
    }
    const userData = obj

    if (
        typeof userData.id !== 'string' ||
        typeof userData.created_at !== 'number' ||
        !Array.isArray(userData.linked_accounts)
    ) {
        return false
    }

    for (const account of userData.linked_accounts) {
        if (
            ('type' in account && typeof account.type !== 'string') ||
            ('address' in account && typeof account.address !== 'string') ||
            ('verified_at' in account && typeof account.verified_at !== 'number')
        ) {
            return false
        }
    }

    return true
}

function mockPrivyApiResponse(): PrivyApiSingleUserResponse {
    return {
        id: 'x',
        created_at: 1,
        linked_accounts: [
            {
                type: 'privy',
                address: '0x123',
                verified_at: 1,
            },
        ],
    }
}

// https://docs.privy.io/guide/server/authorization/verification
export async function verifyPrivyAuthToken(args: {
    request: WorkerRequest
    privyClient: PrivyClient
    env: Env
}): Promise<AuthTokenClaims | undefined> {
    const { privyClient, env, request } = args
    if (env.SKIP_PRIVY_VERIFICATION === 'true') {
        return {
            appId: env.PRIVY_APP_ID,
            issuer: 'privy.io',
            issuedAt: 9999999999,
            expiration: 9999999999,
            sessionId: 'fake-session-id',
            userId: 'did:privy:0x123',
        } satisfies AuthTokenClaims
    }

    const privyToken = request.headers.get('X-PM-Token')

    if (!privyToken || privyToken === '') {
        console.error('Missing Paymaster Token')
        return
    }

    let verifiedClaims: AuthTokenClaims | undefined
    try {
        verifiedClaims = await privyClient.verifyAuthToken(privyToken)
        if (verifiedClaims.appId === env.PRIVY_APP_ID) {
            return verifiedClaims
        }
    } catch (error) {
        console.error(error)
    }
}

export async function searchPrivyForUserByDid(
    privyDid: string, // did:privy:0x123
    env: Env,
): Promise<PrivyApiSingleUserResponse | Response> {
    if (env.SKIP_PRIVY_VERIFICATION === 'true') {
        return mockPrivyApiResponse()
    }
    const completeDuration = durationLogger('searchPrivyForUser')
    const responseFetched = await fetch(`${PRIVY_API_URL}/users/${privyDid}`, {
        method: 'GET',
        headers: {
            'content-type': 'application/json',
            Authorization: `Basic ${btoa(env.PRIVY_APP_ID + ':' + env.PRIVY_APP_KEY)}`,
            'privy-app-id': env.PRIVY_APP_ID,
        },
    })
    completeDuration()
    console.log('responseFetched', responseFetched.status)
    if (responseFetched.status !== 200) {
        return new Response('Invalid Privy Response', {
            status: responseFetched.status,
            statusText: responseFetched.statusText,
        })
    }
    const response = await responseFetched.json()
    if (!isPrivyApiSearchResponse(response)) {
        console.log('invalid privy response', JSON.stringify(response))
        return new Response('Invalid Privy Response Format', { status: 400 })
    }
    return response
}
