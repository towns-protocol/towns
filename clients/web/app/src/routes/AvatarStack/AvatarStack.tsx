import React from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, LayoutGroup } from 'framer-motion'
import { Address } from 'use-towns-client'
import { useCreateLink } from 'hooks/useCreateLink'
import { useDevice } from 'hooks/useDevice'
import { avatarSizes } from 'components/Avatar/avatarProperties.css'
import { ProfileHoverCard } from 'components/ProfileHoverCard/ProfileHoverCard'
import { Avatar } from 'components/Avatar/Avatar'
import { Box, Stack } from '@ui'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'

type Props = {
    users: {
        userId?: string
        displayName?: string
    }[]
    size?: keyof typeof avatarSizes
}

export const AvatarStack = (props: Props) => {
    const { size = 'avatar_md', users } = props
    const { isTouch } = useDevice()

    return (
        <Stack horizontal>
            <LayoutGroup>
                <AnimatePresence>
                    {users
                        .filter(
                            (
                                u,
                            ): u is {
                                userId: string
                                displayName?: string
                            } => !!u.userId,
                        )
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
                                <AvatarLink userId={u.userId} index={index} size={size} />
                            </Box>
                        ))}
                </AnimatePresence>
            </LayoutGroup>
        </Stack>
    )
}

function AvatarLink(props: { userId: string; index: number; size: Props['size'] }) {
    const { createLink } = useCreateLink()
    const { userId, index, size } = props
    const { data: abstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: userId as Address,
    })
    return (
        <Link key={userId} to={createLink({ profileId: abstractAccountAddress }) ?? ''}>
            <Avatar stacked={index > 0} userId={userId} size={size} />
        </Link>
    )
}
