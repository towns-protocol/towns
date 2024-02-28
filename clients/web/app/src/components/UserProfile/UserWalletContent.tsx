import React from 'react'
import { Box } from '@ui'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { shortAddress } from 'workers/utils'

export const UserWalletContent = (props: { abstractAccountAddress?: string }) => {
    const { abstractAccountAddress } = props

    if (!abstractAccountAddress) {
        return null
    }
    return (
        <Box horizontal justifyContent="spaceBetween">
            <ClipboardCopy
                label={shortAddress(abstractAccountAddress)}
                clipboardContent={abstractAccountAddress}
            />
        </Box>
    )
}
