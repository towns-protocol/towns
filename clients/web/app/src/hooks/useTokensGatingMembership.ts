import { useQuery } from '@tanstack/react-query'
import { BigNumber } from 'ethers'
import { useCallback, useMemo } from 'react'
import { useRoleDetails } from 'use-zion-client'
import { Address } from 'wagmi'
import {
    balanceOfErc1155,
    balanceOfErc20,
    balanceOfErc721,
    getTokenType,
} from '@components/Web3/checkTokenType'
import { TokenType } from '@components/Tokens/types'
import { isEveryoneAddress } from '@components/Web3/utils'
import { useAuth } from './useAuth'

export const checkAnyoneCanJoin = (
    tokensGatingMembership: ReturnType<typeof useTokensGatingMembership>['data'],
) =>
    tokensGatingMembership &&
    tokensGatingMembership.tokens.length === 0 &&
    tokensGatingMembership.users.length === 1 &&
    isEveryoneAddress(tokensGatingMembership.users[0])

// returns a map of all token addresses assigned to any role, and their tokenIds if applicable
export function useTokensGatingMembership(spaceId: string | undefined) {
    const { roleDetails: minterRoleDetails, ...rest } = useRoleDetails(spaceId ?? '', 1)

    return useMemo(() => {
        return {
            data: {
                tokens: minterRoleDetails?.tokens ?? [],
                users: minterRoleDetails?.users ?? [],
            },
            ...rest,
        }
    }, [minterRoleDetails, rest])
}

// checks if user has any balances for any of the tokens assigned to the minter role
export function useMeetsMembershipNftRequirements(spaceId: string | undefined, connected: boolean) {
    const { loggedInWalletAddress } = useAuth()
    const _walletAddress = loggedInWalletAddress as Address | undefined
    const { roleDetails: minterRoleDetails } = useRoleDetails(spaceId ?? '', 1)

    const checkUserHasToken = useCallback(async () => {
        console.log('useMeetsMembershipNftRequirements::startingRequest', {
            minterRoleDetails: !!minterRoleDetails,
            walletAddress: !!_walletAddress,
        })
        if (!minterRoleDetails || !_walletAddress) {
            return false
        }

        console.log('useMeetsMembershipNftRequirements::token length', {
            tokenLength: minterRoleDetails.tokens.length,
        })

        if (minterRoleDetails.tokens.length === 0) {
            return true
        }

        if (minterRoleDetails.users.includes(_walletAddress)) {
            return true
        }

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
                                walletAddress: _walletAddress,
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
                            walletAddress: _walletAddress,
                        })
                    ) {
                        return true
                    }
                    break
                }
                case TokenType.ERC20: {
                    if (await balanceOfErc20({ contractAddress, walletAddress: _walletAddress })) {
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
    }, [_walletAddress, minterRoleDetails])

    console.log('useMeetsMembershipNftRequirements', {
        spaceId,
        walletAddress: _walletAddress,
        minterRoleDetails,
        connected,
        query: ['meetsMembershipNftRequirements', spaceId, minterRoleDetails, { connected }],
        enabledCheck: Boolean(minterRoleDetails) && connected,
    })
    return useQuery(
        ['meetsMembershipNftRequirements', spaceId, minterRoleDetails, { connected }],
        checkUserHasToken,
        {
            enabled: Boolean(minterRoleDetails) && connected,
            staleTime: Infinity, // never refetch, TBD if we need to
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
        },
    )
}
