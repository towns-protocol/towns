import React from 'react'
import headlessToast, { Toast } from 'react-hot-toast/headless'
import { Box, Icon, IconButton, Text } from '@ui'

export const ErrorNotification = ({
    toast,
    errorMessage,
    contextMessage,
}: {
    toast: Toast
    errorMessage: string
    contextMessage?: string
}) => {
    return (
        <Box gap width="300" justifyContent="spaceBetween">
            <Box horizontal gap justifyContent="spaceBetween">
                <Box horizontal gap alignItems="center">
                    <Icon color="error" type="alert" />
                    <Text as="span" display="inline" color="error">
                        {errorMessage}
                    </Text>
                </Box>
                <IconButton
                    size="square_xs"
                    icon="close"
                    border="level4"
                    rounded="full"
                    onClick={() => headlessToast.dismiss(toast.id)}
                />
            </Box>
            <Box gap>
                <Text size="sm">{contextMessage}</Text>
            </Box>
        </Box>
    )
}
