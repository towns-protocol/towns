import React from 'react'
import { TokenType } from '@token-worker/types'
import { CheckOperationType } from 'use-towns-client'
import { convertOperationTypeToTokenType } from '@components/Tokens/utils'
import { Pill, Text } from '@ui'

function isTokenType(type: CheckOperationType | TokenType): type is TokenType {
    return typeof type === 'string'
}

export function TokenTypePill({ type }: { type: CheckOperationType | TokenType }) {
    const _type = isTokenType(type) ? type : convertOperationTypeToTokenType(type)
    return (
        <Pill
            paddingX={{ default: 'xs', mobile: 'xs' }}
            color="default"
            background="level3"
            height={{ default: 'x2', mobile: 'x2' }}
        >
            <Text fontSize="sm">{_type}</Text>
        </Pill>
    )
}
