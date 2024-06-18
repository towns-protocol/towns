import React from 'react'
import { Toast, toast as headlessToast } from 'react-hot-toast/headless'
import { Box, Button, Icon, IconButton, Text } from '@ui'

export const UpdateEnsDisplayNameFailed = ({
    toast,
    onClick,
}: {
    toast: Toast
    onClick: () => void
}) => {
    return (
        <Box horizontal gap width="350">
            <Icon color="negative" type="alert" />
            <Box gap>
                <Box gap horizontal>
                    <Text size="sm">
                        There was an error while updating your ENS as your display name.
                    </Text>
                    <IconButton
                        alignSelf="start"
                        size="square_xs"
                        icon="close"
                        onClick={() => headlessToast.dismiss(toast.id)}
                    />
                </Box>
                <Box horizontal gap>
                    <Button
                        size="button_xs"
                        tone="negativeSubtle"
                        onClick={() => {
                            onClick()
                            headlessToast.dismiss(toast.id)
                        }}
                    >
                        Try again
                    </Button>
                </Box>
            </Box>
        </Box>
    )
}
