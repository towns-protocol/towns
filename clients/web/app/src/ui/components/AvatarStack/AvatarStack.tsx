import React from 'react'
import { Link } from 'react-router-dom'
import { useChannelId, useSpaceId } from 'use-zion-client'
import { avatarSizes } from 'ui/components/Avatar/avatarProperties.css'
import { PATHS } from 'routes'
import { Avatar } from '../Avatar/Avatar'
import { Stack } from '../Stack/Stack'

type Props = {
    users: {
        userId?: string
        displayName?: string
    }[]
    size?: keyof typeof avatarSizes
}

export const AvatarStack = (props: Props) => {
    const { size = 'avatar_md', users } = props
    const spaceId = useSpaceId()
    const channelId = useChannelId()
    return (
        <Stack horizontal>
            {users
                .filter((u) => u.userId)
                .map((u, index) => (
                    <Link
                        key={u.userId}
                        to={`/${PATHS.SPACES}/${spaceId?.networkId}/channels/${channelId.networkId}/profile/${u.userId}/`}
                    >
                        <Avatar stacked={index > 0} userId={u.userId} size={size} />
                    </Link>
                ))}
        </Stack>
    )
}
