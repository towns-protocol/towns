import React from 'react'
import { TokenInfo, getChainLogoOrFail } from '@decent.xyz/box-common'
import { Stack } from '@ui'

export function NetworkLogo({ token }: { token: TokenInfo | null }) {
    if (!token) {
        return null
    }
    return (
        <Stack position="relative" aspectRatio="1/1" width="x3">
            <Stack aspectRatio="1/1" width="x2.5" as="img" src={token?.logo} alt={token.name} />
            <Stack
                position="absolute"
                rounded="full"
                bottom="none"
                right="none"
                as="img"
                aspectRatio="1/1"
                width="x1.5"
                src={getChainLogoOrFail(token.chainId)}
                alt={`${token.chainId} logo`}
            />
        </Stack>
    )
}
