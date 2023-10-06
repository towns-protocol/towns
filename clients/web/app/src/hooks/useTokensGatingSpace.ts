import { useQuery } from '@tanstack/react-query'
import { BigNumber } from 'ethers'
import { useCallback, useMemo } from 'react'
import { useMultipleRoleDetails, useRoleDetails, useRoles } from 'use-zion-client'
import { Address } from 'wagmi'
import {
    balanceOfErc1155,
    balanceOfErc20,
    balanceOfErc721,
    getTokenType,
} from '@components/Web3/checkTokenType'
import { TokenType } from '@components/Tokens/types'
import { useAuth } from './useAuth'

const QUERY_KEY = 'useTokensGatingSpace'

// returns a map of all token addresses assigned to any role, and their tokenIds if applicable
export function useTokensGatingSpace(spaceId: string | undefined) {
    const { spaceRoles } = useRoles(spaceId)
    const roledIds = useMemo(() => spaceRoles?.map((r) => r.roleId) ?? [], [spaceRoles])
    const { data: _rolesDetails } = useMultipleRoleDetails(spaceId ?? '', roledIds)

    const tokensGatingSpace = useMemo(() => {
        const tokensForAllRoles = _rolesDetails
            // filtering out empty arrays, which is currently the EVERYONE role
            // b/c supposedly we are removing the EVERYONE role and at minimum every space will be gated by at least one token
            ?.filter((r) => r.tokens.length > 0)
            .flatMap((r) => r.tokens)
            .reduce(
                (
                    acc: Record<
                        Address,
                        {
                            tokenIds: number[]
                        }
                    >,
                    t,
                ) => {
                    const contractAddress = t.contractAddress as Address
                    const tokenIds = (t.tokenIds as BigNumber[]).map((b) => b.toNumber())

                    if (!acc[contractAddress]) {
                        acc[contractAddress] = { tokenIds }
                    } else {
                        const newIds = new Set(acc[contractAddress].tokenIds.concat(tokenIds))
                        acc[contractAddress] = { tokenIds: Array.from(newIds) }
                    }
                    return acc
                },
                {},
            )
        return tokensForAllRoles
    }, [_rolesDetails])

    return tokensGatingSpace
}

// checks if user has any balances for any of the tokens assigned to the minter role
export function useMeetsMembershipNftRequirements(spaceId: string | undefined) {
    // TODO: current invite flow requires login first, then shows the join page. That probably needs to be ported to the new join page, TBD the exact flow
    const { loggedInWalletAddress } = useAuth()
    const { roleDetails: minterRoleDetails } = useRoleDetails(spaceId ?? '', 1)

    const checkUserHasToken = useCallback(async () => {
        if (!minterRoleDetails || !loggedInWalletAddress) {
            return false
        }

        if (minterRoleDetails.tokens.length === 0) {
            return true
        }

        if (minterRoleDetails.users.includes(loggedInWalletAddress)) {
            return true
        }

        const walletAddress = loggedInWalletAddress as Address

        for (const token of minterRoleDetails.tokens) {
            const contractAddress = token.contractAddress as Address
            const type = await getTokenType({ address: contractAddress })

            switch (type) {
                case TokenType.ERC1155: {
                    for (const id of token.tokenIds as BigNumber[]) {
                        if (
                            await balanceOfErc1155({
                                contractAddress,
                                id: id.toNumber(),
                                walletAddress,
                            })
                        ) {
                            return true
                        }
                    }
                    break
                }
                case TokenType.ERC721: {
                    if (
                        await balanceOfErc721({
                            contractAddress,
                            walletAddress,
                        })
                    ) {
                        return true
                    }
                    break
                }
                case TokenType.ERC20: {
                    if (await balanceOfErc20({ contractAddress, walletAddress })) {
                        return true
                    }
                    break
                }
                default:
                    // TODO do we need to handle other types?
                    break
            }
        }

        return false
    }, [loggedInWalletAddress, minterRoleDetails])

    return useQuery([QUERY_KEY, spaceId, minterRoleDetails], checkUserHasToken, {
        enabled: Boolean(minterRoleDetails),
        staleTime: Infinity, // never refetch, TBD if we need to
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    })
}
