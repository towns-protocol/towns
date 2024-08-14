import React from 'react'
import { FadeInBox } from '@components/Transitions'
import { Icon, Text } from '@ui'

type Props = {
    status: 'disconnected' | 'syncing' | 'synced'
}

export const ConnectionStatusBanner = ({ status }: Props) => {
    const color =
        status === 'disconnected' || status === 'syncing'
            ? 'negative'
            : status === 'synced'
            ? 'positive'
            : undefined

    return status === 'synced' ? (
        <Banner>
            <Icon type="check" color="positive" size="square_xs" insetLeft="xxs" />
            <Text truncate color={color}>
                Connected to River Network Node.
            </Text>
        </Banner>
    ) : status === 'syncing' ? (
        <Banner>
            <Icon type="alert" color="negative" size="square_xs" insetLeft="xxs" />
            <Text truncate color={color}>
                Retrieving keys and decrypting messages
            </Text>
        </Banner>
    ) : (
        <Banner>
            <Icon type="alert" color="negative" size="square_xs" insetLeft="xxs" />
            <Text truncate color={color}>
                Disconnected
            </Text>
        </Banner>
    )
}

const Banner = (props: { children: React.ReactNode }) => (
    <FadeInBox grow horizontal gap="sm" rounded="sm" alignItems="center" paddingBottom="xs">
        {props.children}
    </FadeInBox>
)
