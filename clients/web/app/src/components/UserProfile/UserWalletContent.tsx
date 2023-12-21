import React from 'react'
import { getAccountAddress } from 'use-zion-client'
import { Box } from '@ui'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { shortAddress } from 'workers/utils'

export const UserWalletContent = (props: { userId?: string }) => {
    const { userId } = props
    const userAddress = userId ? getAccountAddress(userId) : undefined

    if (!userId || !userAddress) {
        return null
    }
    return (
        <Box horizontal justifyContent="spaceBetween">
            <ClipboardCopy label={shortAddress(userAddress)} clipboardContent={userAddress} />
        </Box>
    )
}
