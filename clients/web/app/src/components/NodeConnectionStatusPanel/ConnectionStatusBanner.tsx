import React from 'react'
import { Box, BoxProps, Icon, Text } from '@ui'

type Props = {
    status: 'disconnected' | 'syncing' | 'synced'
} & BoxProps

export const ConnectionStatusBanner = ({ status }: Props) => {
    return status === 'synced' ? (
        <Banner>
            <Icon type="check" color="positive" size="square_xs" />
            <Text truncate>Connected to node and message streams synced.</Text>
        </Banner>
    ) : status === 'syncing' ? (
        <Banner>
            <Icon type="alert" color="positive" size="square_xs" />
            <Text truncate>Retrieving keys and decrypting messages</Text>
        </Banner>
    ) : (
        <Banner background="negativeSubtle">
            <Icon type="alert" color="negative" size="square_xs" />
            <Text truncate>Disconnected</Text>
        </Banner>
    )
}

const Banner = (props: BoxProps) => (
    <Box>
        <Box
            grow
            horizontal
            padding
            gap="sm"
            rounded="sm"
            background="positiveSubtle"
            alignItems="center"
            {...props}
        />
    </Box>
)
