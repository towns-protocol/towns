import React from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, LayoutGroup } from 'framer-motion'
import { avatarSizes } from 'ui/components/Avatar/avatarProperties.css'
import { useCreateLink } from 'hooks/useCreateLink'
import { useDevice } from 'hooks/useDevice'
import { ProfileHoverCard } from '../../../components/ProfileHoverCard/ProfileHoverCard'
import { Avatar } from '../Avatar/Avatar'
import { Stack } from '../Stack/Stack'
import { TooltipBox as Box } from '../Box/TooltipBox'

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
    const { isTouch } = useDevice()

    return (
        <Stack horizontal>
            <LayoutGroup>
                <AnimatePresence>
                    {users
                        .filter((u) => u.userId)
                        .map((u, index) => (
                            <Box
                                key={u.userId}
                                tooltip={
                                    isTouch ? undefined : (
                                        <ProfileHoverCard userId={u.userId ?? ''} />
                                    )
                                }
                                tooltipOptions={{ immediate: true }}
                            >
                                <Link key={u.userId} to={createLink({ profileId: u.userId }) ?? ''}>
                                    <Avatar stacked={index > 0} userId={u.userId} size={size} />
                                </Link>
                            </Box>
                        ))}
                </AnimatePresence>
            </LayoutGroup>
        </Stack>
    )
}
