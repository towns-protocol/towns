import { LinkedAccountType } from '@gateway-worker/types'
import { axiosClient } from 'api/apiClient'
import { env } from 'utils'

export async function getLinkedAccounts(walletAddress: string, accessToken: string | null) {
    if (!accessToken) {
        console.error('[getLinkedAccounts] no access token')
        return []
    }

    try {
        const response = await axiosClient.get<LinkedAccountType[]>(
            `${env.VITE_GATEWAY_URL}/user/linked-accounts/${walletAddress}`,
            {
                headers: {
                    'X-User-Token': accessToken,
                },
            },
        )

        return response.data
    } catch (error) {
        console.error('[getLinkedAccounts]error fetching linked privy accounts', error)
        return []
    }
}
