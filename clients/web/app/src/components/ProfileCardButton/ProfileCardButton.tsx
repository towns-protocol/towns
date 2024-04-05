import { default as React, useCallback } from 'react'
import { useMatch } from 'react-router'
import { useMyProfile } from 'use-towns-client'
import { Avatar } from '@components/Avatar/Avatar'
import { Box } from '@ui'
import { useAuth } from 'hooks/useAuth'
import { CHANNEL_INFO_PARAMS, PATHS } from 'routes'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'

export const ProfileCardButton = () => {
    const myProfile = useMyProfile()
    const userId = myProfile?.userId
    const isSpaceCreateRoute = useMatch(`${PATHS.SPACES}/new`)

    const { isAuthenticated } = useAuth()

    const { openPanel, closePanel, isPanelOpen } = usePanelActions()
    const onClick = useCallback(() => {
        isPanelOpen(CHANNEL_INFO_PARAMS.PROFILE)
            ? closePanel()
            : openPanel(CHANNEL_INFO_PARAMS.PROFILE, { profileId: 'me' })
    }, [closePanel, isPanelOpen, openPanel])

    const hasAvatar = isAuthenticated && userId

    return (
        <Box centerContent>
            <Box
                hoverable={!isSpaceCreateRoute}
                cursor="pointer"
                tooltip="Profile Info"
                tooltipOptions={{ placement: 'horizontal' }}
                onClick={onClick}
            >
                {hasAvatar ? (
                    <Avatar size="avatar_x4" userId={userId} />
                ) : (
                    <Box square="square_lg" background="level2" rounded="full" />
                )}
            </Box>
        </Box>
    )
}
