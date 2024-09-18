import React from 'react'
import { Box } from '@ui'
import { ErrorReportForm } from '@components/ErrorReport/ErrorReport'

export const PublicSupportPage = () => {
    return (
        <Box centerContent padding="lg">
            <Box width={{ touch: '100%', default: '600' }} position="relative">
                <ErrorReportForm excludeDebugInfo />
            </Box>
        </Box>
    )
}
