import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import { ETH_ADDRESS, SpaceAddressFromSpaceId, TipParams } from 'use-towns-client'
import { axiosClient } from 'api/apiClient'
import { MINUTE_MS } from 'data/constants'
import { env } from 'utils'

export type TipLeaderboardData = {
    leaderboard: Record<string, string>
    lastUpdatedAt: number
}

export const queryKeyTipLeaderboard = (spaceAddress: string, currency = ETH_ADDRESS) => [
    'tipLeaderboard',
    spaceAddress,
    currency,
]

export const optimisticallyUpdateTipLeaderboard = (qc: QueryClient, tip: TipParams) => {
    const { senderAddress: userAddress, amount, spaceId, currency } = tip
    const spaceAddress = SpaceAddressFromSpaceId(spaceId)
    return qc.setQueryData(
        queryKeyTipLeaderboard(spaceAddress, currency),
        (old: TipLeaderboardData | undefined) => {
            if (!old) {
                return {
                    leaderboard: {
                        [userAddress]: amount.toString(),
                    },
                    lastUpdatedAt: Date.now(),
                }
            }
            return {
                ...old,
                leaderboard: {
                    ...old.leaderboard,
                    [userAddress]: (
                        BigInt(old.leaderboard[userAddress] || '0') + amount
                    ).toString(),
                },
                lastUpdatedAt: Date.now(),
            }
        },
    )
}

const buildRankedLeaderboard = (
    leaderboard: Record<string, string>,
): { userAddress: string; totalTipped: string; rank: number }[] => {
    let currentRank = 0
    let lastUserTotalTipped = ''

    return Object.entries(leaderboard).map(([userAddress, totalTipped]) => {
        // If its a tie with the previous user, dont increment the rank
        if (totalTipped === lastUserTotalTipped) {
            return {
                userAddress,
                totalTipped,
                rank: currentRank,
            }
        }
        currentRank++
        lastUserTotalTipped = totalTipped

        return {
            userAddress,
            totalTipped,
            rank: currentRank,
        }
    })
}

export const fetchTipLeaderboard = async (spaceAddress: string, qc: QueryClient) => {
    const { data } = await axiosClient.get<{
        leaderboard: Record<string, string>
        lastUpdatedAt: number
    }>(`${env.VITE_GATEWAY_URL}/tips/${spaceAddress}/leaderboard`)
    const cachedData = qc.getQueryData<TipLeaderboardData>(queryKeyTipLeaderboard(spaceAddress))
    if (cachedData && cachedData.lastUpdatedAt >= data.lastUpdatedAt) {
        const mergedLeaderboard = { ...data.leaderboard }
        Object.entries(cachedData.leaderboard).forEach(([userAddress, cachedAmount]) => {
            const serverAmount = mergedLeaderboard[userAddress]
            if (!serverAmount || BigInt(cachedAmount) > BigInt(serverAmount)) {
                mergedLeaderboard[userAddress] = cachedAmount
            }
        })
        return {
            leaderboard: mergedLeaderboard,
            lastUpdatedAt: cachedData.lastUpdatedAt,
        }
    }
    return data
}

export function useTipLeaderboard(spaceAddress: string | undefined) {
    const queryClient = useQueryClient()

    return useQuery({
        queryKey: queryKeyTipLeaderboard(spaceAddress!),
        queryFn: () => fetchTipLeaderboard(spaceAddress!, queryClient),
        staleTime: 1 * MINUTE_MS,
        select: (data) => ({
            ...data,
            leaderboard: buildRankedLeaderboard(data.leaderboard),
        }),
    })
}
