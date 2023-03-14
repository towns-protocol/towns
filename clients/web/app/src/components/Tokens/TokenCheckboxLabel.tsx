import { ContractMetadata } from '@token-worker/types'
import React from 'react'
import { RoomIdentifier } from 'use-zion-client'
import { Box } from '@ui'
import { useRoleTokensMetatdata } from 'api/lib/collectionMetadata'
import { TokenAvatar } from './TokenAvatar'

export function TokenCheckboxLabel(props: {
    spaceId: RoomIdentifier
    tokenAddresses: string[]
    label: string
}): JSX.Element {
    const { data } = useRoleTokensMetatdata(props.spaceId, props.tokenAddresses)
    return (
        <Box>
            <Box>{props.label}</Box>

            {!data ? (
                <Box visibility="hidden">
                    <TokenAvatar size="avatar_md" contractAddress="" />
                </Box>
            ) : !data.length ? null : (
                <Box horizontal gap="lg" paddingTop="md">
                    {data
                        .filter((token): token is ContractMetadata => !!token)
                        .map((token) => {
                            return (
                                <TokenAvatar
                                    key={token.address}
                                    contractAddress={token.address ?? ''}
                                    imgSrc={token.imageUrl}
                                    size="avatar_md"
                                    label={token.name}
                                />
                            )
                        })}
                </Box>
            )}
        </Box>
    )
}
