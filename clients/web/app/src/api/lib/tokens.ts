import { useQuery } from '@tanstack/react-query'

async function getTokensForWallet(_wallet: string) {
    // TODO: get tokens from API
    // const response = await axiosClient.get(url)
    return { data: [] }
}

const queryKey = 'tokensForWallet'

export function useTokensForWallet(wallet: string, enabled: boolean) {
    return useQuery([queryKey, wallet], () => getTokensForWallet(wallet), {
        select: ({ data }) => data,
        enabled,
    })
}
