import React from 'react'
import { selectUserOpsByAddress, userOpsStore } from '@towns/userops'
import { Box, Icon, Text } from '@ui'
import { useMyAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { useRejectionMessage } from './hooks/useRejectionMessage'

export function RejectedSponsorshipMessage() {
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data
    const rejectedSponsorshipReason = userOpsStore(
        (s) => selectUserOpsByAddress(myAbstractAccountAddress, s)?.rejectedSponsorshipReason,
    )
    const rejectionMessage = useRejectionMessage()

    if (!rejectedSponsorshipReason) {
        return null
    }
    return (
        <Box padding horizontal gap background="level3" rounded="sm">
            <Icon type="info" color="gray1" shrink={false} />
            <Text>Gas sponsorship is not available for this transaction. {rejectionMessage}</Text>
        </Box>
    )
}
