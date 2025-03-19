import React, { useCallback } from 'react'
import { useDevice } from 'hooks/useDevice'
import { avatarSizes } from 'components/Avatar/avatarProperties.css'
import { ProfileHoverCard } from 'components/ProfileHoverCard/ProfileHoverCard'
import { AvatarWithoutDot } from 'components/Avatar/Avatar'
import { Box, Stack } from '@ui'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'

type Props = {
    userIds: string[]
    size?: keyof typeof avatarSizes
}

export const AvatarStack = (props: Props) => {
    const { size = 'avatar_md', userIds: users } = props
    const { isTouch } = useDevice()

    return (
        <Stack horizontal insetRight="xxs">
            {users
                .filter((u): u is string => !!u)
                .map((u, index, arr) => (
                    <Box
                        key={u}
                        tooltip={isTouch ? undefined : <ProfileHoverCard userId={u ?? ''} />}
                        tooltipOptions={{ immediate: true }}
                    >
                        <AvatarLink stacked userId={u} size={size} />
                    </Box>
                ))}
        </Stack>
    )
}

function AvatarLink(props: { userId: string; stacked?: boolean; size: Props['size'] }) {
    const { userId, stacked, size } = props
    const { openPanel } = usePanelActions()

    const onClick = useCallback(() => {
        openPanel('profile', { profileId: userId })
    }, [userId, openPanel])

    return (
        <Box cursor="pointer" onClick={onClick}>
            <AvatarWithoutDot userId={userId} size={size} stacked={stacked} />
        </Box>
    )
}
