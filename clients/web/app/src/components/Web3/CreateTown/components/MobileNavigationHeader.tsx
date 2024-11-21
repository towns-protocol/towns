import React from 'react'
import { useNavigate } from 'react-router'
import { IconButton, Stack } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { AppBugReportButton } from '@components/AppBugReport/AppBugReportButton'

export const MobileNavigationHeader = () => {
    const navigate = useNavigate()
    const { isTouch } = useDevice()
    return (
        isTouch && (
            <Stack
                horizontal
                padding
                paddingTop={{
                    standalone: 'safeAreaInsetTop',
                    default: 'md',
                }}
                position="relative"
                alignSelf="start"
                alignItems="center"
                justifyContent="spaceBetween"
                width="100%"
                zIndex="above"
            >
                <Stack>
                    <IconButton
                        background="level2"
                        icon="back"
                        color="default"
                        onClick={() => navigate('/')}
                    />
                </Stack>
                <AppBugReportButton />
            </Stack>
        )
    )
}
