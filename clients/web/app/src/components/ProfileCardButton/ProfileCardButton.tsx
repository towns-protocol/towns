import { default as React, useCallback } from 'react'
import { useLocation, useMatch, useNavigate } from 'react-router'
import { useMyProfile } from 'use-zion-client'
import { Box } from '@ui'
import { useAuth } from 'hooks/useAuth'
import { useCreateLink } from 'hooks/useCreateLink'
import { PATHS } from 'routes'
import { Avatar } from '@components/Avatar/Avatar'

export const ProfileCardButton = () => {
    const myProfile = useMyProfile()
    const userId = myProfile?.userId
    const isSpaceCreateRoute = useMatch(`${PATHS.SPACES}/new`)

    const { isAuthenticated } = useAuth()

    const navigate = useNavigate()
    const location = useLocation()

    const { createLink: createProfileLink } = useCreateLink()

    const link = userId ? createProfileLink({ profileId: 'me' }) : undefined

    const onClick = useCallback(() => {
        if (location.pathname.match(/profile\/me/)) {
            navigate('../../', { relative: 'path' })
        } else if (link) {
            navigate(link)
        }
    }, [link, navigate, location.pathname])

    const hasAvatar = isAuthenticated && userId

    return (
        <Box centerContent>
            <Box
                hoverable={!isSpaceCreateRoute}
                cursor={isSpaceCreateRoute ? 'auto' : 'pointer'}
                padding="sm"
                rounded="sm"
                tooltip={isSpaceCreateRoute ? undefined : 'Profile Info'}
                tooltipOptions={{ placement: 'horizontal', immediate: true }}
                onClick={!isSpaceCreateRoute && hasAvatar ? onClick : undefined}
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
