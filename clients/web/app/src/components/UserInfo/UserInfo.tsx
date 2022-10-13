import React from 'react'
import { Avatar, Heading, Icon, Paragraph, Stack } from '@ui'
import { fakeUserCache } from 'data/UserData'
import { AvatarStack } from 'ui/components/AvatarStack'

type Props = {
    userId: string
}

export const UserInfo = ({ userId }: Props) => {
    const { spaceIds, avatarSrc, ...userData } = fakeUserCache[userId]
    const { displayName } = userData
    const numSpaces = spaceIds?.length ?? 0

    return (
        <Stack gap="md">
            <Avatar src={avatarSrc} size="avatar_xl" />
            <Heading level={2}>{displayName}</Heading>
            <Stack horizontal alignItems="center" gap="sm" color="gray2">
                {userData.tokens}
                <Icon type="token" />
                {numSpaces && (
                    <Paragraph size="md">
                        &#8226; {numSpaces} {numSpaces > 1 ? 'Spaces' : 'Space'} in common
                    </Paragraph>
                )}
                <AvatarStack userIds={['1', '2', '3', '9', '10']} />
            </Stack>
        </Stack>
    )
}
