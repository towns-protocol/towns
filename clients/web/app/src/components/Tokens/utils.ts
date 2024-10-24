import {
    Address,
    CheckOperationType,
    DecodedCheckOperation,
    IRuleEntitlementV2Base,
    NoopRuleData,
    createDecodedCheckOperationFromTree,
    createOperationsTree,
} from 'use-towns-client'
import { constants } from 'ethers'
import { formatUnits, parseUnits } from 'hooks/useBalance'
import { EVERYONE_ADDRESS } from 'utils'
import { TokenType } from './types'
import { Token, TokenEntitlement } from './TokenSelector/tokenSchemas'

export function convertTokenTypeToOperationType(type: TokenType) {
    switch (type) {
        case TokenType.ERC1155:
            return CheckOperationType.ERC1155 as const
        case TokenType.ERC721:
            return CheckOperationType.ERC721 as const
        case TokenType.ERC20:
            return CheckOperationType.ERC20 as const
        default:
            throw new Error('convertTokenTypeToOperationType: Invalid token type')
    }
}

export function convertOperationTypeToTokenType(type: CheckOperationType) {
    switch (type) {
        case CheckOperationType.ERC1155:
            return TokenType.ERC1155
        case CheckOperationType.ERC721:
            return TokenType.ERC721
        case CheckOperationType.ERC20:
            return TokenType.ERC20
        // Placeholder, needs fixing
        // https://linear.app/hnt-labs/issue/TOWNS-14181/handle-towns-that-are-gated-by-eth-balance
        case CheckOperationType.ETH_BALANCE:
            return TokenType.UNKNOWN
        default:
            console.error('convertOperationTypeToTokenType: Invalid operation type', type)
            return TokenType.UNKNOWN
    }
}

export function convertRuleDataToTokenEntitlementSchema(
    ruleData: IRuleEntitlementV2Base.RuleDataV2Struct,
): TokenEntitlement[] {
    return createDecodedCheckOperationFromTree(ruleData).map((p) => {
        const { threshold, tokenId, ...rest } = p
        return {
            ...rest,
            chainId: Number(p.chainId),
            type: convertOperationTypeToTokenType(p.type),
            quantity: threshold ?? 1n,
            tokenIds: tokenId ? [Number(tokenId)] : [],
        }
    })
}

export const transformQuantityForSubmit = (
    quantity: string,
    tokenType: TokenType,
    decimals: number = 18,
) => {
    return tokenType === TokenType.ERC20 ? parseUnits(quantity, decimals) : BigInt(quantity)
}

export const transformQuantityForDisplay = (
    quantity: bigint,
    tokenType: TokenType,
    decimals: number = 18,
) => {
    if (tokenType === TokenType.ERC20) {
        return formatUnits(quantity, decimals)
    } else {
        return quantity.toString()
    }
}

export const prepareGatedDataForSubmit = (
    gatingType: string,
    tokensGatedBy: Token[],
    usersGatedBy: string[],
    ethBalanceGatedBy: string,
) => {
    const finalUsersGatedBy = gatingType === 'everyone' ? [EVERYONE_ADDRESS] : usersGatedBy
    const finalTokensGatedBy = gatingType === 'everyone' ? [] : tokensGatedBy

    const tokensGatedByOps: DecodedCheckOperation[] = finalTokensGatedBy.map((t) => ({
        address: t.data.address as Address,
        chainId: BigInt(t.chainId),
        type: convertTokenTypeToOperationType(t.data.type),
        threshold: t.data.quantity
            ? transformQuantityForSubmit(t.data.quantity, t.data.type, t.data.decimals)
            : 1n,
        tokenId: t.data.tokenId ? BigInt(t.data.tokenId) : undefined,
    }))

    const ethBalanceOps: DecodedCheckOperation = {
        type: CheckOperationType.ETH_BALANCE,
        threshold: transformQuantityForSubmit(ethBalanceGatedBy, TokenType.ERC20, 18),
        chainId: 0n,
        address: constants.AddressZero,
    }

    const ruleData =
        finalTokensGatedBy.length > 0 || ethBalanceGatedBy
            ? createOperationsTree([
                  ...(finalTokensGatedBy.length > 0 ? tokensGatedByOps : []),
                  ...(ethBalanceGatedBy ? [ethBalanceOps] : []),
              ])
            : NoopRuleData

    return { tokensGatedBy: finalTokensGatedBy, usersGatedBy: finalUsersGatedBy, ruleData }
}
