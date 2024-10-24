import React, { useEffect } from 'react'
import { Box, BoxProps, Icon, Paragraph } from '@ui'

export const SomethingWentWrong = ({
    error,
    children,
    ...boxProps
}: { error: Error } & BoxProps) => {
    useEffect(() => {
        console.error('SomethingWentWrong', error)
    }, [error])
    return (
        <Box horizontal alignItems="center" gap="sm" color="error" {...boxProps}>
            <Icon type="alert" size="square_sm" color="error" gap="sm" />
            <Paragraph>Sorry, something went wrong</Paragraph>
            {children}
        </Box>
    )
}
