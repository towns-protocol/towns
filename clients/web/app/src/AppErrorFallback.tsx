import React, { useEffect } from 'react'
import { Box, FancyButton, Icon, Paragraph, Stack } from '@ui'
import { WelcomeLayout } from 'routes/layouts/WelcomeLayout'

type FallbackRender = {
    error: Error
}

export function AppErrorFallback({ error }: FallbackRender) {
    const isDynamicImportError = error.message
        .toLowerCase()
        .includes('failed to fetch dynamically imported module')

    useEffect(() => {
        if (isDynamicImportError) {
            console.warn('AppErrorFallback: isDynamicImportError, reloading...')
        }
    }, [isDynamicImportError])

    return (
        <WelcomeLayout>
            <Box centerContent elevateReadability border="faint" padding="lg" gap="x4" rounded="sm">
                <Icon type="alert" color="negative" size="square_lg" insetBottom="xs" />
                <Stack color="gray1" maxWidth="400">
                    <Paragraph textAlign="center">Oops! We&apos;ve hit a snag. </Paragraph>
                    <Paragraph textAlign="center" color="gray2">
                        Our team has been notified. In the meantime, please consider restarting the
                        app or give it a moment before trying again.
                    </Paragraph>
                </Stack>
                <Box width="fit-content">
                    <FancyButton compact onClick={() => window.location.reload()}>
                        Restart App
                    </FancyButton>
                </Box>
            </Box>
        </WelcomeLayout>
    )
}
