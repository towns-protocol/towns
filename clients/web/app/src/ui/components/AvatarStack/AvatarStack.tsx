import React from 'react'
import { avatarSizes } from 'ui/components/Avatar/avatarProperties.css'
import { Avatar } from '../Avatar/Avatar'
import { Stack } from '../Stack/Stack'

type Props = {
    users: {
        avatarUrl?: string
        userId?: string
        displayName?: string
    }[]
    size?: keyof typeof avatarSizes
}

export const AvatarStack = (props: Props) => {
    const { size = 'avatar_md', users } = props
    return (
        <Stack horizontal>
            {users.map((u) => (
                <Avatar stacked key={u.userId ?? u.avatarUrl} src={u.avatarUrl} size={size} />
            ))}
        </Stack>
    )
}
