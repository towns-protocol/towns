import React from 'react'
import { Link } from 'react-router-dom'
import { avatarSizes } from 'ui/components/Avatar/avatarProperties.css'
import { ProfileHoverCard } from '@components/ProfileHoverCard/ProfileHoverCard'
import { useCreateLink } from 'hooks/useCreateLink'
import { Avatar } from '../Avatar/Avatar'
import { Stack } from '../Stack/Stack'
import { Box } from '../Box/Box'
import { TooltipRenderer } from '../Tooltip/TooltipRenderer'

type Props = {
    users: {
        userId?: string
        displayName?: string
    }[]
    size?: keyof typeof avatarSizes
}

export const AvatarStack = (props: Props) => {
    const { size = 'avatar_md', users } = props
    const { createLink } = useCreateLink()

    return (
        <Stack horizontal>
            {users
                .filter((u) => u.userId)
                .map((u, index) => (
                    <TooltipRenderer
                        render={<ProfileHoverCard userId={u.userId ?? ''} />}
                        key={u.userId}
                        trigger="hover"
                        placement="vertical"
                    >
                        {({ triggerProps }) => (
                            <Box {...triggerProps}>
                                <Link key={u.userId} to={createLink({ profileId: u.userId }) ?? ''}>
                                    <Avatar stacked={index > 0} userId={u.userId} size={size} />
                                </Link>
                            </Box>
                        )}
                    </TooltipRenderer>
                ))}
        </Stack>
    )
}
