import React, { useCallback } from 'react'
import { AnimatePresence, LayoutGroup } from 'framer-motion'
import { Address } from 'use-towns-client'
import { useDevice } from 'hooks/useDevice'
import { avatarSizes } from 'components/Avatar/avatarProperties.css'
import { ProfileHoverCard } from 'components/ProfileHoverCard/ProfileHoverCard'
import { Avatar } from 'components/Avatar/Avatar'
import { Box, Stack } from '@ui'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'

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
    const { userId, index, size } = props
    const { data: abstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: userId as Address,
    })
    const { openPanel } = usePanelActions()

    const onClick = useCallback(() => {
        openPanel('profile', { profileId: abstractAccountAddress })
    }, [abstractAccountAddress, openPanel])

    return (
        <Box cursor="pointer" onClick={onClick}>
            <Avatar stacked={index > 0} userId={userId} size={size} />
        </Box>
    )
}
