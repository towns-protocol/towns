import React from 'react'
import { userOpsStore } from '@towns/userops'
import { Box, Icon, Text } from '@ui'
export function GasTooLowMessage() {
    const retryDetails = userOpsStore((s) => s.retryDetails)
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
