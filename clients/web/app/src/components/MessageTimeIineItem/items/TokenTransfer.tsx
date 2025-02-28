import React from 'react'
import { TokenTransferEvent } from '@river-build/sdk'
import { Box } from '@ui'

type Props = {
    event: TokenTransferEvent
}
export const TokenTransfer = (props: Props) => {
    const { event } = props
    return (
        <Box paddingY="sm" color={event.transfer.isBuy ? 'greenBlue' : 'error'}>
            {event.transfer.amount}
        </Box>
    )
}
