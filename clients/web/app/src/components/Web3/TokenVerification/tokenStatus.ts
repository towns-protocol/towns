import { Address } from 'wagmi'
import { BigNumber } from 'ethers'
import { useLinkedWallets } from 'use-zion-client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import { TokenGatingMembership } from 'hooks/useTokensGatingMembership'
import { TokenType } from '@components/Tokens/types'
import { useAuth } from 'hooks/useAuth'
import { ArrayElement } from 'types'
import { balanceOfErc1155, balanceOfErc20, balanceOfErc721, getTokenType } from '../checkTokenType'

export type TokenStatus = {
    tokenAddress: Address
    status: 'none' | 'loading' | 'success' | 'failure'
}

type TokenBalance = {
    tokenAddress: Address
    tokenIds?: { id: number; balance: number }[]
    balance?: number
}

export const gatedTokenStatusQueryKey = 'gatedTokenStatusQueryKey'
export const tokenBalancesForWallet = 'tokenBalancesForWallet'

const CHECK_WALLETS_FOR_TOKENS = 'checkWalletsForTokens'

// TODO: somehow w/ xchain this chainId will come into play
const tokenBalanceFromWalletsQuery = (chainId: number, tokenAddress: Address) => [
    CHECK_WALLETS_FOR_TOKENS,
    chainId,
    { tokenAddress },
]

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
    const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([])
    const gatingAddresses = tokensGatingMembership.map((t) => t.contractAddress as Address)

    useEffect(() => {
        const unsubscribe = queryClient.getQueryCache().subscribe(({ query, type }) => {
            if (query.queryKey.includes(CHECK_WALLETS_FOR_TOKENS)) {
                setTokenBalances((state) => {
                    const data: TokenBalance = query.state.data
                    if (!data) {
                        return state
                    }
                    const match = state.findIndex((t) => t.tokenAddress === data.tokenAddress)
                    if (match > -1) {
                        return [...state.slice(0, match), data, ...state.slice(match + 1)]
                    }
                    return [...state, data]
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
    const { loggedInWalletAddress } = useAuth()
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
        () => tokenBalanceFromWalletsQuery(chainId, token.contractAddress as Address),
        [chainId, token.contractAddress],
    )

    return useQuery({
        queryKey: [...qKey, { wallets: allWallets }],

        queryFn: async () => {
            const store = currentWalletLinkingStore.getState()
            const newWallets = allWallets.filter((item) => !seenWallets?.includes(item))

            const data = await checkWalletsForToken({
                walletAddresses: allWallets,
                token,
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
        enabled: !!seenWallets || !!allWallets.length,
    })
}

async function fetchTokenBalance({
    token,
    walletAddress,
}: {
    token: ArrayElement<TokenGatingMembership['tokens']>
    walletAddress: Address
}): Promise<TokenBalance> {
    const tokenContractAddress = token.contractAddress as Address
    const type = await getTokenType({ address: tokenContractAddress })
    switch (type) {
        case TokenType.ERC1155: {
            return {
                tokenAddress: tokenContractAddress,
                tokenIds: await Promise.all(
                    (token.tokenIds as BigNumber[]).map(async (id) => {
                        const _id = id.toNumber()
                        try {
                            return {
                                id: _id,
                                balance: Number(
                                    await balanceOfErc1155({
                                        contractAddress: tokenContractAddress,
                                        id: _id,
                                        walletAddress,
                                    }),
                                ),
                            }
                        } catch (error) {
                            console.error(`[checkWalletForTokens] ERC1155`, error)
                            return {
                                id: _id,
                                balance: 0,
                            }
                        }
                    }),
                ),
            }
        }
        case TokenType.ERC721: {
            try {
                return {
                    tokenAddress: tokenContractAddress,
                    balance: Number(
                        await balanceOfErc721({
                            contractAddress: tokenContractAddress,
                            walletAddress,
                        }),
                    ),
                }
            } catch (error) {
                console.error(`[checkWalletForTokens] ERC721`, error)
                return {
                    tokenAddress: tokenContractAddress,
                    balance: 0,
                }
            }
        }
        case TokenType.ERC20: {
            try {
                return {
                    tokenAddress: tokenContractAddress,
                    balance: Number(
                        await balanceOfErc20({
                            contractAddress: tokenContractAddress,
                            walletAddress,
                        }),
                    ),
                }
            } catch (error) {
                console.error(`[checkWalletForTokens] ERC20`, error)
                return {
                    tokenAddress: tokenContractAddress,
                    balance: 0,
                }
            }
        }
        default:
            console.error(`[checkWalletForTokens] Unknown token type`, type)
            return {
                tokenAddress: tokenContractAddress,
                balance: 0,
            }
    }
}

function checkWalletsForToken({
    walletAddresses,
    token,
}: {
    walletAddresses: Address[]
    token: ArrayElement<TokenGatingMembership['tokens']>
}): Promise<TokenBalance> {
    return Promise.any(
        walletAddresses.map(async (walletAddress) => {
            const data = await fetchTokenBalance({ token, walletAddress: walletAddress as Address })
            if (!data || !data.balance) {
                throw new Error('No balance')
            }
            return data
        }),
    ).catch(() => {
        return {
            tokenAddress: token.contractAddress as Address,
            balance: 0,
        }
    })
}
