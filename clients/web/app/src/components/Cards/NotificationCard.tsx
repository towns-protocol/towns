import React from 'react'
import { Card, Heading, Stack, Text } from '@ui'
import { Avatar } from '@components/Avatar/Avatar'

export const NotificationCard = () => {
    return (
        <Card padding="md" gap="md" width="400">
            <Heading color="gray2">Notifications</Heading>
            <Item avatar="/placeholders/nft_30.png" name="Doodles">
                A proposal <strong>100 ETH Donation to RELI3F</strong> is up for voting
            </Item>
            <Item avatar="/placeholders/nft_2.png" name="Doodles">
                34502 received an offer for 2ETH
            </Item>
        </Card>
    )
}

const Item = (props: { name: string; avatar: string; children: React.ReactNode }) => (
    <Stack horizontal gap="md" alignItems="center">
        <Avatar size="avatar_md" src={props.avatar} />
        <Stack gap="sm">
            <Text size="sm" color="gray1">
                Doodles
            </Text>
            <Text size="md" color="default">
                {props.children}
            </Text>
        </Stack>
    </Stack>
)

// 34502 received an offer for 2ETH
