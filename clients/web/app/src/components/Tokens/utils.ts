import {
    Address,
    CheckOperationType,
    IRuleEntitlementV2Base,
    createDecodedCheckOperationFromTree,
} from 'use-towns-client'
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
        default:
            throw new Error('convertOperationTypeToTokenType: Invalid operation type')
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

export function convertRuleDataToTokenSchema(
    ruleData: IRuleEntitlementV2Base.RuleDataV2Struct,
): Token[] {
    return createDecodedCheckOperationFromTree(ruleData).map((p) => {
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
                quantity: threshold ?? 1n,
            },
        }
    })
}

export function convertTokenEntitlementToTokenSchema(tokenEntitlement: TokenEntitlement): Token {
    return {
        chainId: tokenEntitlement.chainId,
        data: {
            address: tokenEntitlement.address,
            type: tokenEntitlement.type,
            name: '',
            symbol: '',
            imageUrl: '',
            openSeaCollectionUrl: '',
            decimals: undefined,
        },
    }
}
