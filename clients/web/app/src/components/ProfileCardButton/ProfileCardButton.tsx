import { default as React, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useMyProfile } from 'use-zion-client'
import { Avatar, Box } from '@ui'
import { useAuth } from 'hooks/useAuth'
import { useCreateLink } from 'hooks/useCreateLink'

type Props = {
    expanded?: boolean
}

export const ProfileCardButton = (props: Props) => {
    const myProfile = useMyProfile()
    const userId = myProfile?.userId

    const { isAuthenticated } = useAuth()

    // const { expanded: isExpanded } = props
    const navigate = useNavigate()

    const { createLink: createProfileLink } = useCreateLink()

    const link = userId ? createProfileLink({ profileId: 'me' }) : undefined

    const onClick = useCallback(() => {
        if (link) {
            navigate(link)
        }
    }, [link, navigate])

    return !isAuthenticated || !userId ? null : (
        <Box centerContent padding="sm">
            <Box
                hoverable
                cursor="pointer"
                background="level1"
                padding="sm"
                rounded="sm"
                tooltip="Profile Info"
                tooltipOptions={{ placement: 'horizontal' }}
                onClick={onClick}
            >
                <Avatar size="avatar_x4" userId={userId} />
            </Box>
        </Box>
    )
}
