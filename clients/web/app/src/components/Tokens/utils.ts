import {
    CheckOperationType,
    IRuleEntitlement,
    createContractCheckOperationFromTree,
} from 'use-towns-client'
import { TokenType } from './types'
import { TokenEntitlement } from './TokenSelector/tokenSchemas'

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

export function convertRuleDataToTokenFormSchema(
    ruleData: IRuleEntitlement.RuleDataStruct,
): TokenEntitlement[] {
    return createContractCheckOperationFromTree(ruleData).map((p) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { threshold, ...rest } = p
        return {
            ...rest,
            chainId: Number(p.chainId),
            type: convertOperationTypeToTokenType(p.type),
            quantity: Number(p.threshold),
            tokenIds: [], // todo: add token ids
        }
    })
}
