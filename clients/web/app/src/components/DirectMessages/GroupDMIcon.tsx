import React from 'react'
import { RoomIdentifier } from 'use-zion-client'
import { Box } from '@ui'
import { IconInitials } from '@components/IconInitials/IconInitials'

export const GroupDMIcon = (props: { roomIdentifier: RoomIdentifier }) => {
    const { roomIdentifier } = props
    // We don't have GDM channel names yet. Let's use the 4th character of the id for now.
    // The first three characters will always be `77-` for GDMs.
    const initial = roomIdentifier.networkId.length > 3 ? roomIdentifier.networkId.slice(3, 4) : '-'
    return (
        <Box
            centerContent
            background="level4"
            width="x6"
            height="x6"
            shrink={false}
            rounded="full"
            color="default"
        >
            <IconInitials letterFontSize="h2">{initial}</IconInitials>
        </Box>
    )
}
