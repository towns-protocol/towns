import React from 'react'
import { RoomIdentifier } from 'use-zion-client'
import { Box, BoxProps } from '@ui'
import { IconInitials } from '@components/IconInitials/IconInitials'
import { LetterStylesVariantProps } from '@components/IconInitials/IconInitials.css'

export const GroupDMIcon = (props: {
    roomIdentifier: RoomIdentifier
    letterFontSize?: LetterStylesVariantProps
    width?: BoxProps['width']
}) => {
    const { roomIdentifier, letterFontSize = 'h2', width = 'x6' } = props
    // We don't have GDM channel names yet. Let's use the 4th character of the id for now.
    // The first three characters will always be `77-` for GDMs.
    const initial = roomIdentifier.networkId.length > 3 ? roomIdentifier.networkId.slice(3, 4) : '-'
    return (
        <Box
            centerContent
            background="level4"
            width={width}
            height={width}
            shrink={false}
            rounded="full"
            color="default"
        >
            <IconInitials letterFontSize={letterFontSize}>{initial}</IconInitials>
        </Box>
    )
}
