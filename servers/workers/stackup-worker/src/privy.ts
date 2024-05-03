import { Env } from '.'

const PRIVY_API_URL = 'https://auth.privy.io/api/v1'

interface LinkedAccount {
    type: string
    address: string
    chain_type?: string
    email?: string
    verified_at: number
}

interface UserData {
    id: string
    created_at: number
    linked_accounts: LinkedAccount[]
}

interface PrivyApiResponse {
    data: UserData[]
    next_cursor: string
}

interface PrivySearchRequest {
    // Filter users by email's, phone number's, and wallet address's that contain the term
    searchTerm?: string
    walletAddresses?: string[]
}

// Type guard for Privy search respoonse
// https://auth.privy.io/api/v1/users/search
// see: https://docs.privy.io/guide/backend/api/users/search-users
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isPrivyApiSearchResponse(obj: any): obj is PrivyApiResponse {
    if (typeof obj !== 'object' || obj === null) {
        return false
    }
    if (!('data' in obj)) {
        return false
    }
    if (obj.data === undefined) {
        return false
    }
    if (!Array.isArray(obj.data)) {
        return false
    }

    for (const userData of obj.data) {
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
    }

    if (typeof obj.next_cursor !== 'string') {
        return false
    }

    return true
}

function mockPrivyApiResponse(): PrivyApiResponse {
    return {
        data: [
            {
                id: 'x',
                created_at: 1,
                linked_accounts: [
                    {
                        type: 'privy',
                        address: '0x123',
                        verified_at: 1,
                    },
                ],
            },
        ],
        next_cursor: 'x',
    }
}

export function createPrivSearchRequest(requestObj: PrivySearchRequest, env: Env): RequestInit {
    console.log(env.PRIVY_APP_ID, env.PRIVY_APP_KEY)
    const init = {
        body: JSON.stringify(requestObj),
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            Authorization: `Basic ${btoa(env.PRIVY_APP_ID + ':' + env.PRIVY_APP_KEY)}`,
            'privy-app-id': env.PRIVY_APP_ID,
        },
    }
    return init
}

export async function searchPrivyForUser(
    request: PrivySearchRequest,
    env: Env,
): Promise<PrivyApiResponse | Response> {
    if (env.SKIP_PRIVY_VERIFICATION === 'true') {
        return mockPrivyApiResponse()
    }
    const init = createPrivSearchRequest(request, env)
    const responseFetched = await fetch(`${PRIVY_API_URL}/users/search`, init)
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
