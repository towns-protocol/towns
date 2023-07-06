import { default as React, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useMyProfile } from 'use-zion-client'
import { Avatar, Box } from '@ui'
import { useAuth } from 'hooks/useAuth'
import { useCreateLink } from 'hooks/useCreateLink'

export const ProfileCardButton = () => {
    const myProfile = useMyProfile()
    const userId = myProfile?.userId

    const { isAuthenticated } = useAuth()

    const navigate = useNavigate()

    const { createLink: createProfileLink } = useCreateLink()

    const link = userId ? createProfileLink({ profileId: 'me' }) : undefined

    const onClick = useCallback(() => {
        if (link) {
            navigate(link)
        }
    }, [link, navigate])

    const hasAvatar = isAuthenticated && userId

    return (
        <Box centerContent paddingBottom="sm">
            <Box
                hoverable
                cursor="pointer"
                background="level1"
                padding="sm"
                rounded="sm"
                tooltip="Profile Info"
                tooltipOptions={{ placement: 'horizontal' }}
                onClick={hasAvatar ? onClick : undefined}
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
