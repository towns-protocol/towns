import React, { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Box, FancyButton, Icon, Paragraph, Stack, ZLayerProvider } from '@ui'
import { WelcomeLayout } from 'routes/layouts/WelcomeLayout'
import { Notifications } from '@components/Notifications/Notifications'
import { AppBugReportButton } from '@components/AppBugReport/AppBugReportButton'

type FallbackRender = {
    error: Error
}
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
})

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
        <QueryClientProvider client={queryClient}>
            <ZLayerProvider>
                <WelcomeLayout>
                    <Box
                        centerContent
                        elevateReadability
                        border="faint"
                        padding="lg"
                        gap="x4"
                        rounded="sm"
                    >
                        <AppBugReportButton topRight />
                        <Icon type="alert" color="negative" size="square_lg" insetBottom="xs" />
                        <Stack color="gray1" maxWidth="400">
                            <Paragraph textAlign="center">Oops! We&apos;ve hit a snag. </Paragraph>
                            <Paragraph textAlign="center" color="gray2">
                                Our team has been notified. In the meantime, please consider
                                restarting the app or give it a moment before trying again.
                            </Paragraph>
                        </Stack>
                        <Box width="fit-content">
                            <FancyButton compact onClick={() => window.location.reload()}>
                                Restart App
                            </FancyButton>
                        </Box>
                    </Box>

                    <Notifications />
                </WelcomeLayout>
            </ZLayerProvider>
        </QueryClientProvider>
    )
}
