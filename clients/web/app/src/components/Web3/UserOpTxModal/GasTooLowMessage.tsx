import React from 'react'
import { selectUserOpsByAddress, userOpsStore } from '@towns/userops'
import { Box, Icon, Text } from '@ui'
import { useMyAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'

export function GasTooLowMessage() {
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data
    const retryDetails = userOpsStore(
        (s) => selectUserOpsByAddress(myAbstractAccountAddress, s)?.retryDetails,
    )
    if (retryDetails?.type !== 'gasTooLow') {
        return null
    }
    return (
        <Box horizontal padding gap centerContent rounded="sm" background="level2" width="100%">
            <Icon type="alert" color="error" shrink={false} />
            <Text color="error">
                Estimated gas was too low{' '}
                {typeof retryDetails?.data === 'string' ? `for ${retryDetails.data}` : ''}. Would
                you like to try this transaction again?
            </Text>
        </Box>
    )
}
