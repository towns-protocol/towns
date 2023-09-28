import React from 'react'
import headlessToast, { Toast } from 'react-hot-toast/headless'
import { Box, Button, Icon, Text } from '@ui'

export const ImageUploadFailedToast = ({ toast }: { toast: Toast }) => {
    return (
        <Box horizontal gap width="300">
            <Icon color="error" type="alert" />
            <Box gap alignItems="end">
                <Text size="sm">Oops! We had trouble uploading your image.</Text>
                <Box horizontal gap>
                    <Button size="button_sm" onClick={() => headlessToast.dismiss(toast.id)}>
                        Dismiss
                    </Button>
                </Box>
            </Box>
        </Box>
    )
}
