import React from 'react'
import { Box, BoxProps, Icon, Text } from '@ui'

type Props = {
    status: 'disconnected' | 'syncing' | 'synced'
} & BoxProps

export const ConnectionStatusBanner = ({ status }: Props) => {
    return status === 'synced' ? (
        <Banner>
            <Icon type="check" color="positive" size="square_xs" insetLeft="xxs" />
            <Text truncate>Connected to node and message streams synced.</Text>
        </Banner>
    ) : status === 'syncing' ? (
        <Banner>
            <Icon type="alert" color="positive" size="square_xs" insetLeft="xxs" />
            <Text truncate>Retrieving keys and decrypting messages</Text>
        </Banner>
    ) : (
        <Banner>
            <Icon type="alert" color="negative" size="square_xs" insetLeft="xxs" />
            <Text truncate>Disconnected</Text>
        </Banner>
    )
}

const Banner = (props: BoxProps) => (
    <Box grow horizontal gap="sm" rounded="sm" alignItems="center" paddingBottom="xs" {...props} />
)
