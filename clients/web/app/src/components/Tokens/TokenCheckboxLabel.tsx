import React from 'react'
import { RoomIdentifier } from 'use-zion-client'
import { Box } from '@ui'
import { useTokenMetadata } from 'api/lib/collectionMetadata'
import { TokenAvatar } from './TokenAvatar'

function FetchedAvatar({ address }: { address: string }) {
    const { data, isFetched, failureCount } = useTokenMetadata(address)
    // if there's a single failure, show the fallback content
    // a subsequent success will re-render the component and show the correct data
    const isLoading = isFetched ? false : failureCount === 0

    return (
        <Box>
            <TokenAvatar
                key={address}
                contractAddress={address ?? ''}
                isLoading={isLoading}
                imgSrc={data?.imageUrl}
                size="avatar_md"
                label={data?.name}
            />
        </Box>
    )
}

export function TokenCheckboxLabel(props: {
    spaceId: RoomIdentifier
    tokenAddresses: string[]
    label: string
}): JSX.Element {
    return (
        <Box>
            <Box>{props.label}</Box>
            {props.tokenAddresses.length > 0 && (
                <Box horizontal gap="lg" paddingTop="md">
                    {props.tokenAddresses.map((address) => (
                        <FetchedAvatar key={address} address={address} />
                    ))}
                </Box>
            )}
        </Box>
    )
}
