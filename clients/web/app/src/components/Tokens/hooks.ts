import { useMemo } from 'react'
import {
    Address,
    CheckOperationType,
    VersionedRuleData,
    convertRuleDataV1ToV2,
    createDecodedCheckOperationFromTree,
} from 'use-towns-client'
import { Entitlements } from 'hooks/useEntitlements'
import { Token, TokenEntitlement, TokenWithBigInt } from './TokenSelector/tokenSchemas'
import { TokenType } from './types'
import { convertOperationTypeToTokenType } from './utils'

export function useValidAndSortedTokens(args: {
    tokenMetadata: Token[] | undefined
    allowedTokenTypes: TokenType[]
}) {
    return useMemo(() => {
        if (!args.tokenMetadata) {
            return undefined
        }
        const validTokens = args.tokenMetadata.filter((t) =>
            args.allowedTokenTypes.includes(t.data.type),
        )

        return validTokens.length > 0
            ? validTokens.sort((a, b) => {
                  if (a.data.label && b.data.label) {
                      return a.data.label.localeCompare(b.data.label)
                  }
                  return 1
              })
            : undefined
    }, [args.allowedTokenTypes, args.tokenMetadata])
}

export function useConvertRuleDataToToken(versionedRuleData: VersionedRuleData | undefined): {
    ethBalance: bigint | undefined
    tokens: TokenWithBigInt[]
} {
    const ruleData =
        versionedRuleData?.kind === 'v1'
            ? convertRuleDataV1ToV2(versionedRuleData.rules)
            : versionedRuleData?.rules

    return useMemo(() => {
        if (!ruleData) {
            return { ethBalance: undefined, tokens: [] }
        }
        const decodedOperations = createDecodedCheckOperationFromTree(ruleData)
        const ethBalance = decodedOperations.find(
            (p) => p.type === CheckOperationType.ETH_BALANCE,
        )?.threshold
        const tokens = decodedOperations
            .filter((p) => p.type !== CheckOperationType.ETH_BALANCE)
            .map((p) => {
                const { threshold, tokenId, ...rest } = p
                return {
                    chainId: Number(p.chainId),
                    data: {
                        ...rest,
                        address: p.address as Address,
                        type: convertOperationTypeToTokenType(p.type),
                        name: '',
                        symbol: '',
                        imageUrl: '',
                        openSeaCollectionUrl: '',
                        decimals: undefined,
                        tokenId: tokenId ?? undefined,
                        quantity: threshold ?? undefined,
                    },
                }
            })

        return { ethBalance, tokens }
    }, [ruleData])
}

export function useConvertEntitlementsToTokenWithBigInt(entitlements?: Entitlements) {
    return useMemo(() => {
        if (!entitlements) {
            return []
        }

        return entitlements.tokens.map(
            (tokenEntitlement: TokenEntitlement): TokenWithBigInt => ({
                chainId: tokenEntitlement.chainId,
                data: {
                    address: tokenEntitlement.address,
                    type: tokenEntitlement.type,
                    name: '',
                    symbol: '',
                    imageUrl: '',
                    openSeaCollectionUrl: '',
                    decimals: undefined,
                    quantity: undefined,
                    tokenId: undefined,
                },
            }),
        )
    }, [entitlements])
}
