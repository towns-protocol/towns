import React from 'react'
import { Box } from '@ui'
import { TokenOption } from './TokenOption'
import { Token } from './tokenSchemas'

export function TokenOptions({
    tokens,
    onAddItem,
    headerElement,
}: {
    tokens: Token[]
    onAddItem: (option: Token) => void
    headerElement?: React.ReactNode
}) {
    if (tokens.length === 0 && !headerElement) {
        return null
    }

    return (
        <Box
            padding
            gap
            scroll
            width="100%"
            top="x8"
            position="absolute"
            rounded="sm"
            background="level2"
            style={{ maxHeight: 380 }}
            boxShadow="card"
        >
            {headerElement}
            {tokens.map((token) => (
                <TokenOption
                    key={token.chainId + token.data.address + token.data.tokenId}
                    token={token}
                    onAddItem={(token) => onAddItem(token)}
                />
            ))}
        </Box>
    )
}
