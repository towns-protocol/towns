import React, { useState } from 'react'
import { Box, Icon, Text, Tooltip } from '@ui'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { shortAddress } from 'workers/utils'

export function RecipientText(props: { sendingTo: string }) {
    const { sendingTo } = props
    const [container] = useState(() => document.getElementById('above-app-progress-root'))
    if (!container) {
        return null
    }

    return (
        <Box horizontal gap="sm" alignItems="center" justifyContent="spaceBetween" width="100%">
            <Box horizontal gap="sm" alignItems="center">
                <Icon shrink={false} type="linkOutWithFrame" />
                <Text>Sending to</Text>
            </Box>
            {sendingTo && (
                <Box
                    tooltipRootLayer={container}
                    tooltip={<Tooltip zIndex="tooltipsAbove">{sendingTo}</Tooltip>}
                >
                    <ClipboardCopy
                        color="default"
                        label={shortAddress(sendingTo)}
                        clipboardContent={sendingTo}
                    />
                </Box>
            )}
        </Box>
    )
}
