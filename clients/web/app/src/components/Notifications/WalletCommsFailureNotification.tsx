import React, { useCallback } from 'react'
import headlessToast, { Toast } from 'react-hot-toast/headless'
import { Box, Button, Text } from '@ui'

export function WalletCommsFailureNotification({
    onConfirm,
    toast,
}: {
    toast: Toast
    onConfirm: () => void
}) {
    const onClick = useCallback(() => {
        headlessToast.dismiss(toast.id)
        onConfirm()
    }, [onConfirm, toast.id])
    return (
        <>
            <Box
                position="fixed"
                top="none"
                right="none"
                bottom="none"
                left="none"
                background="transparentDark"
            />
            <Box position="relative">
                <Box horizontal gap width="300">
                    <Box gap alignItems="end">
                        <Text size="sm">
                            {`We're having trouble communicating with your wallet. Would you like to cancel the signature request and start over?`}
                        </Text>
                        <Box horizontal gap>
                            <Button size="button_xs" tone="error" onClick={onClick}>
                                Cancel
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </Box>
        </>
    )
}
