import React from 'react'
import headlessToast, { Toast } from 'react-hot-toast/headless'
import { matchPath, useLocation, useNavigate } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import { Box, Button, Icon, Text } from '@ui'
import { PATHS } from 'routes'

export const FailedUploadAfterSpaceCreation = ({
    toast,
    spaceId,
    message,
}: {
    toast: Toast
    spaceId: string
    message: string
}) => {
    const navigate = useNavigate()
    const { pathname } = useLocation()

    const onTokenClick = useEvent(() => {
        const currentSpacePathWithoutInfo = matchPath(
            `${PATHS.SPACES}/:spaceSlug/:current`,
            pathname,
        )

        let path

        if (currentSpacePathWithoutInfo) {
            path = `/${PATHS.SPACES}/${spaceId}/${currentSpacePathWithoutInfo?.params.current}/info`
        }

        if (path) {
            navigate(path)
        }
    })
    return (
        <Box horizontal gap width="300">
            <Icon color="error" type="alert" />
            <Box gap alignItems="end">
                <Text size="sm">{message}</Text>
                <Box horizontal gap>
                    <Button size="button_sm" onClick={() => headlessToast.dismiss(toast.id)}>
                        Dismiss
                    </Button>
                    <Button size="button_sm" tone="cta1" onClick={onTokenClick}>
                        Try again
                    </Button>
                </Box>
            </Box>
        </Box>
    )
}
