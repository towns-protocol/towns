import React from 'react'
import headlessToast, { Toast } from 'react-hot-toast/headless'
import { Box, Button, Icon, Text } from '@ui'

export const BugSubmittedToast = ({ toast, message }: { toast: Toast; message: string }) => {
    return (
        <Box horizontal gap width="300">
            <Icon color="gray2" type="tag" />
            <Box gap alignItems="end">
                <Text size="sm">{message}</Text>
                <Box horizontal gap>
                    <Button size="button_sm" onClick={() => headlessToast.dismiss(toast.id)}>
                        Dismiss
                    </Button>
                </Box>
            </Box>
        </Box>
    )
}
