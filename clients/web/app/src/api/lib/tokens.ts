import { useQuery } from '@tanstack/react-query'
import { TokenProps } from '@components/Tokens'
import { queryClient } from 'api/queryClient'
import { axiosClient } from '../apiClient'

async function getTokensForWallet(wallet: string, zionTokenAddress: string | null) {
    const tokens = await axiosClient.get(`/tokens/${wallet}`)

    if (zionTokenAddress) {
        const zionData: TokenProps = {
            imgSrc: 'https://picsum.photos/id/99/400',
            label: 'Zion',
            contractAddress: zionTokenAddress,
        }
        return {
            data: [zionData, ...tokens.data],
        }
    }
    return tokens
}

const queryKey = 'tokensForWallet'

export function useTokensForWallet(
    wallet: string,
    zionTokenAddress: string | null,
    enabled: boolean,
) {
    return useQuery([queryKey], () => getTokensForWallet(wallet, zionTokenAddress), {
        select: ({ data }) => data,
        enabled,
    })
}

export function getCachedTokensForWallet(): TokenProps[] {
    return (queryClient.getQueryData([queryKey]) as { data: TokenProps[] })?.data || []
}
