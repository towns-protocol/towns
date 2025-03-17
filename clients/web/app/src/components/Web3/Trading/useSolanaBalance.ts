import { Connection, PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import { env } from 'utils'

export const soalanaBalanceQueryKey = (address: string | undefined) => ['solana-balance', address]

export const useSolanaBalance = (address: string | undefined) => {
    const url = env.VITE_SOLANA_MAINNET_RPC_URL
    const { data, isLoading } = useQuery({
        queryKey: soalanaBalanceQueryKey(address),
        queryFn: async () => {
            if (!url || !address) {
                return 0n
            }
            const connection = new Connection(url)
            const publicKey = new PublicKey(address)
            const balance = await connection.getBalance(publicKey)
            return BigInt(balance)
        },
        enabled: !!address && !!url,
        staleTime: 10_000,
        gcTime: 15_000,
    })
    return { data: data ?? 0n, isLoading }
}
