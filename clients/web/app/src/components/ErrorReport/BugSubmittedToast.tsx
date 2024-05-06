import React from 'react'
import headlessToast, { Toast } from 'react-hot-toast/headless'
import { Box, Icon, IconButton, Text } from '@ui'

export const BugSubmittedToast = ({ toast, message }: { toast: Toast; message: string }) => {
    return (
        <Box horizontal width="300" justifyContent="spaceBetween">
            <Box horizontal gap alignItems="center">
                <Icon color="gray2" type="tag" background="level4" padding="xs" />
                <Text size="sm">{message}</Text>
            </Box>
            <IconButton
                alignSelf="start"
                padding="none"
                size="square_sm"
                icon="close"
                border="none"
                onClick={() => headlessToast.dismiss(toast.id)}
            />
        </Box>
    )
}
