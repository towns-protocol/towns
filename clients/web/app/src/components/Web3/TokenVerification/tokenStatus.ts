import { z } from 'zod'
import { isAddress } from 'ethers/lib/utils'
import { Address, useConnectivity, useLinkedWallets, useSupportedXChainIds } from 'use-towns-client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import { ArrayElement } from 'types'
import { TokenGatingMembership } from 'hooks/useTokensGatingMembership'
import { env } from 'utils'
import { axiosClient } from 'api/apiClient'

export type TokenStatus = {
    tokenAddress: Address
    status: 'none' | 'loading' | 'success' | 'failure'
}

type TokenBalance = {
    tokenAddress: Address
    tokenIds?: { id: number; balance: number }[] | undefined
    balance?: number | undefined
}

const CHECK_WALLETS_FOR_TOKENS = 'checkWalletsForTokens'

// TODO: somehow w/ xchain this chainId will come into play
const tokenBalanceFromWalletsQuery = (chainId: number, tokenAddress: Address) => [
    CHECK_WALLETS_FOR_TOKENS,
    chainId,
    { tokenAddress },
]

const tokenBalanceSchema: z.ZodType<TokenBalance> = z.object({
    tokenAddress: z.custom<Address>((val) => typeof val === 'string' && isAddress(val)),
    tokenIds: z
        .array(
            z.object({
                id: z.number(),
                balance: z.number(),
            }),
        )
        .optional(),
    balance: z.number().optional(),
})

// broader query to grab all queried tokens
const allTokensBalanceFromWalletsQuery = (chainId: number) =>
    tokenBalanceFromWalletsQuery(chainId, '0x').slice(0, 2)

export const currentWalletLinkingStore = create<{
    noAssets: boolean
    tickNoAssets: () => void
}>((set) => ({
    noAssets: false,
    tickNoAssets: () => {
        set({ noAssets: true })
        setTimeout(() => {
            set({ noAssets: false })
        }, 5_000)
    },
}))

export function useTokenBalances({
    chainId,
    tokensGatingMembership,
}: {
    chainId: number
    tokensGatingMembership: TokenGatingMembership['tokens']
}) {
    const queryClient = useQueryClient()
    const qKey = useMemo(() => allTokensBalanceFromWalletsQuery(chainId), [chainId])
    const [tokenBalances, setTokenBalances] = useState<{
        data: TokenBalance[] | undefined
        isLoading: boolean
        error: unknown | undefined
    }>(() => ({
        data: undefined,
        isLoading: queryClient
            .getQueryCache()
            .getAll()
            .filter((v) => v.queryKey.includes(CHECK_WALLETS_FOR_TOKENS)).length
            ? false
            : true,
        error: undefined,
    }))
    const gatingAddresses = tokensGatingMembership.map((t) => t.address as Address)

    useEffect(() => {
        const unsubscribe = queryClient.getQueryCache().subscribe(({ query, type }) => {
            if (query.queryKey.includes(CHECK_WALLETS_FOR_TOKENS)) {
                setTokenBalances((state) => {
                    if (query.state.status === 'pending') {
                        return { ...state, isLoading: true }
                    }

                    if (query.state.status === 'error') {
                        return { ...state, isLoading: false, error: query.state.error }
                    }

                    const queryData: TokenBalance = query.state.data

                    if (!state.data) {
                        return {
                            data: [queryData],
                            isLoading: false,
                            error: undefined,
                        }
                    }
                    const match = state.data.findIndex(
                        (t) => t.tokenAddress === queryData.tokenAddress,
                    )
                    if (match > -1) {
                        return {
                            isLoading: false,
                            error: undefined,
                            data: [
                                ...state.data.slice(0, match),
                                queryData,
                                ...state.data.slice(match + 1),
                            ],
                        }
                    }
                    return { isLoading: false, error: undefined, data: [...state.data, queryData] }
                })
            }
        })

        return () => {
            unsubscribe()
        }
    }, [gatingAddresses, qKey, queryClient])

    return tokenBalances
}

export function useWatchLinkedWalletsForToken({
    chainId,
    token,
}: {
    chainId: number
    token: ArrayElement<TokenGatingMembership['tokens']>
}) {
    const { data: linkedWallets } = useLinkedWallets()
    const { loggedInWalletAddress } = useConnectivity()
    const { data: supportedXChainIds } = useSupportedXChainIds()

    // state for deterniming if a wallet is freshly linked in this session
    const [seenWallets, setSeenWallets] = useState<Address[] | undefined>(() => {
        if (loggedInWalletAddress && linkedWallets) {
            return [...(linkedWallets as Address[]), loggedInWalletAddress]
        }
        return undefined
    })

    useEffect(() => {
        if (!loggedInWalletAddress || !linkedWallets || !!seenWallets) {
            return
        }
        setSeenWallets([...(linkedWallets as Address[]), loggedInWalletAddress])
    }, [seenWallets, linkedWallets, loggedInWalletAddress])

    const allWallets: Address[] =
        !linkedWallets || !loggedInWalletAddress
            ? []
            : [loggedInWalletAddress, ...(linkedWallets as Address[])]

    const qKey = useMemo(
        () => tokenBalanceFromWalletsQuery(chainId, token.address as Address),
        [chainId, token.address],
    )

    return useQuery({
        queryKey: [...qKey, { wallets: allWallets }],

        queryFn: async () => {
            const store = currentWalletLinkingStore.getState()
            const newWallets = allWallets.filter((item) => !seenWallets?.includes(item))
            if (!supportedXChainIds) {
                throw new Error('missing supportedChainIds')
            }

            const data = await checkWalletsForToken({
                walletAddresses: allWallets,
                token,
                supportedChainIds: supportedXChainIds,
            })

            if (newWallets.length) {
                setSeenWallets(allWallets)
                if (!data.balance) {
                    store.tickNoAssets()
                }
            }

            return data
        },

        select: (data): TokenStatus => {
            return {
                tokenAddress: data.tokenAddress,
                status: !data || data.balance === 0 ? 'failure' : 'success',
            }
        },

        refetchInterval: () => {
            // check every 3 seconds (base mines every 2 seconds)
            // alternative is use useBlockNumber + useEffect + query.reftech() but this is simpler
            return 3_000
        },

        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        enabled: !!supportedXChainIds && (!!seenWallets || !!allWallets.length),
    })
}

async function checkWalletsForToken({
    walletAddresses,
    token,
    supportedChainIds,
}: {
    walletAddresses: Address[]
    token: ArrayElement<TokenGatingMembership['tokens']>
    supportedChainIds: number[]
}): Promise<TokenBalance> {
    const TOKENS_SERVER_URL = env.VITE_TOKEN_SERVER_URL
    // See token-worker README for more information
    const url = `${TOKENS_SERVER_URL}/api/tokenBalance?supportedChainIds=${supportedChainIds.join(
        ',',
    )}`

    const response = await axiosClient.post(url, {
        wallets: walletAddresses,
        token: token,
    })

    const parseResult = tokenBalanceSchema.safeParse(response.data.data)

    if (!parseResult.success) {
        console.error(`Error parsing ${url} results:: ${parseResult.error}`)
        throw new Error(`Error parsing ${url} results:: ${parseResult.error}`)
    }

    return parseResult.data
}
