import { useQuery } from '@tanstack/react-query'
import { axiosClient } from 'api/apiClient'
import { MINUTE_MS } from 'data/constants'
import { env } from 'utils'

export const queryKeyTipLeaderboard = (spaceAddress: string) => ['tipLeaderboard', spaceAddress]

export const fetchTipLeaderboard = async (spaceAddress: string) => {
    const { data } = await axiosClient.get<{
        leaderboard: Record<string, string>
        lastUpdatedAt: number
    }>(`${env.VITE_GATEWAY_URL}/tips/${spaceAddress}/leaderboard`)
    return data
}

export function useTipLeaderboard(spaceAddress: string | undefined) {
    return useQuery({
        queryKey: queryKeyTipLeaderboard(spaceAddress!),
        queryFn: () => fetchTipLeaderboard(spaceAddress!),
        staleTime: 1 * MINUTE_MS,
        enabled: !!spaceAddress,
    })
}
