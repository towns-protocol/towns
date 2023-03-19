import React from 'react'
import { Link } from 'react-router-dom'
import { avatarSizes } from 'ui/components/Avatar/avatarProperties.css'
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
    return (
        <Stack horizontal>
            {users
                .filter((u) => u.userId)
                .map((u) => (
                    <Link key={u.userId} to={`profile/${u.userId}`}>
                        <Avatar stacked userId={u.userId} size={size} />
                    </Link>
                ))}
        </Stack>
    )
}
