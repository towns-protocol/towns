import { z } from 'zod'
import { isAddress } from 'ethers/lib/utils'
import {
    Address,
    queryClient,
    useConnectivity,
    useLinkedWallets,
    useSupportedXChainIds,
} from 'use-towns-client'
import { useQueries } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import { isEqual } from 'lodash'
import { ArrayElement } from 'types'
import { TokenGatingMembership } from 'hooks/useTokensGatingMembership'
import { env } from 'utils'
import { axiosClient } from 'api/apiClient'
import { TokenEntitlement } from '@components/Tokens/TokenSelector/tokenSchemas'

type TokenBalance = {
    tokenAddress: Address
    tokenIds?: { id: number; balance: number }[] | undefined
    balance?: number | undefined
}

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

export const currentWalletLinkingStore = create<{
    noAssets: boolean
    tickNoAssets: () => void
}>((set) => ({
    noAssets: false,
    tickNoAssets: () => {
        set({ noAssets: true })
        setTimeout(() => {
            set({ noAssets: false })
        }, 3_000)
    },
}))

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

const tokenBalanceFromWalletsQuery2 = (props: {
    chainId: number
    tokenAddress: Address
    wallets: string[]
}) => [
    'CHECK_WALLETS_FOR_TOKENS_2',
    props.chainId,
    { tokenAddress: props.tokenAddress, wallets: props.wallets },
]

export function checkWalletsForTokens2QueryDataBalances() {
    const tokenBalanceQueryData = queryClient.getQueriesData<TokenBalance>({
        queryKey: ['CHECK_WALLETS_FOR_TOKENS_2'],
    })
    const tokenBalances: { [x: string]: number } = {}

    tokenBalanceQueryData.forEach(([qKey, qResult]) => {
        if (qResult) {
            if (!tokenBalances[qResult.tokenAddress]) {
                tokenBalances[qResult.tokenAddress] = 0
            }

            const balance = qResult.balance ?? 0
            tokenBalances[qResult.tokenAddress] += balance
        }
    })
    return tokenBalances
}

export function useTokenBalances(props: { tokens: TokenEntitlement[]; refetchInterval?: number }) {
    const { data: linkedWallets } = useLinkedWallets()
    const { loggedInWalletAddress } = useConnectivity()
    const { data: supportedXChainIds } = useSupportedXChainIds()

    const allWallets: Address[] = (
        !linkedWallets || !loggedInWalletAddress
            ? []
            : [loggedInWalletAddress, ...(linkedWallets as Address[])]
    ).sort()

    const previousWalletsValue = usePrevious(allWallets)
    const walletsChanged =
        !!allWallets.length && previousWalletsValue && !isEqual(allWallets, previousWalletsValue)

    const _enabledCondition = !!supportedXChainIds && (!!props.refetchInterval || walletsChanged)

    const query = (token: TokenEntitlement) => {
        const qKey = tokenBalanceFromWalletsQuery2({
            chainId: token.chainId,
            tokenAddress: token.address as Address,
            wallets: allWallets,
        })

        return {
            queryKey: [...qKey, { wallets: allWallets }],

            queryFn: async () => {
                const store = currentWalletLinkingStore.getState()
                if (!supportedXChainIds) {
                    throw new Error('missing supportedChainIds')
                }

                const data = await checkWalletsForToken({
                    walletAddresses: allWallets,
                    token,
                    supportedChainIds: supportedXChainIds,
                })
                if (walletsChanged) {
                    store.tickNoAssets()
                }
                return {
                    ...data,
                    status: data.balance === 0 ? 'failure' : 'success',
                }
            },
            refetchInterval: props.refetchInterval,
            staleTime: props.refetchInterval ? undefined : 30_000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            enabled: _enabledCondition,
        }
    }

    return useQueries({
        queries: props.tokens.map((token) => query(token)),
        combine: (results) => {
            const definedResults = results.filter((r) => r.data)
            return {
                isLoading: results.some((r) => r.isLoading),
                data: definedResults.length ? definedResults : undefined,
            }
        },
    })
}

export default function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T>()
    useEffect(() => {
        ref.current = value
    })
    return ref.current
}
