import React, { useState } from 'react'
import { TokenInfo, getChainLogoOrFail } from '@decent.xyz/box-common'
import { Stack, Text } from '@ui'

export function NetworkLogo({ token }: { token: TokenInfo | null }) {
    const [logoError, setLogoError] = useState(false)

    if (!token) {
        return null
    }
    return (
        <Stack position="relative" aspectRatio="1/1" width="x3">
            {logoError ? (
                <Stack
                    aspectRatio="1/1"
                    width="x2.5"
                    background="level4"
                    alignItems="center"
                    justifyContent="center"
                    rounded="full"
                >
                    <Text size="xs">{token.name.slice(0, 1)}</Text>
                </Stack>
            ) : (
                <Stack
                    aspectRatio="1/1"
                    width="x2.5"
                    as="img"
                    src={token?.logo}
                    alt={token.name}
                    onError={() => setLogoError(true)}
                />
            )}
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
