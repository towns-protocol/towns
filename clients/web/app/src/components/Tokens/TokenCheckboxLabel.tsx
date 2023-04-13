import React from 'react'
import { RoomIdentifier } from 'use-zion-client'
import { Box } from '@ui'
import { FetchedTokenAvatar } from './FetchedTokenAvatar'

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
                        <FetchedTokenAvatar key={address} address={address} />
                    ))}
                </Box>
            )}
        </Box>
    )
}
