import React from 'react'
import headlessToast, { Toast } from 'react-hot-toast/headless'
import { Box, Button, Icon, Text } from '@ui'
import { useCombinedAuth } from 'privy/useCombinedAuth'

export const InvalidCookieNotification = ({
    toast,
    actionMessage,
}: {
    toast: Toast
    actionMessage: string
}) => {
    const { logout } = useCombinedAuth()
    return (
        <Box horizontal gap width="300">
            <Icon color="error" type="alert" />
            <Box gap alignItems="end">
                <Text size="sm">
                    Oops! There&apos;s an error with your credentials. To {actionMessage}, please
                    logout, then try again.
                </Text>
                <Box horizontal gap>
                    <Button size="button_sm" onClick={() => headlessToast.dismiss(toast.id)}>
                        Dismiss
                    </Button>
                    <Button size="button_sm" tone="cta1" onClick={logout}>
                        Logout
                    </Button>
                </Box>
            </Box>
        </Box>
    )
}
