import React from 'react'
import { TickerAttachment } from '@river-build/sdk'
import { Box, Stack, Text } from '@ui'

export const TickerAttachmentContainer = (props: { attachment: TickerAttachment }) => {
    return (
        <Box padding width="400" background="level2">
            <Stack gap>
                <Text>{props.attachment.address}</Text>
                <Text>Chain ID: {props.attachment.chainId}</Text>
            </Stack>
        </Box>
    )
}
