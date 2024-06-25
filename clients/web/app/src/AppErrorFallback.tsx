import React, { useCallback, useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Box, FancyButton, Icon, IconButton, Paragraph, Stack, Text, ZLayerProvider } from '@ui'
import { WelcomeLayout } from 'routes/layouts/WelcomeLayout'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { useDevice } from 'hooks/useDevice'
import { ErrorReportForm } from '@components/ErrorReport/ErrorReport'
import { Notifications } from '@components/Notifications/Notifications'

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

    const [isShowingBugReport, setIsShowingBugReport] = useState(false)
    const onShowBugReport = useCallback(() => {
        setIsShowingBugReport(true)
    }, [setIsShowingBugReport])

    const onHideBugReport = useCallback(() => {
        setIsShowingBugReport(false)
    }, [setIsShowingBugReport])
    const { isTouch } = useDevice()

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
                        <Box
                            hoverable
                            centerContent
                            position="absolute"
                            top="lg"
                            right="lg"
                            cursor="pointer"
                            tooltip="Report a bug"
                            tooltipOptions={{ placement: 'horizontal' }}
                            padding="line"
                            background="lightHover"
                            rounded="sm"
                            height="x4"
                            width="x4"
                            onClick={onShowBugReport}
                        >
                            <Icon size="square_sm" type="bug" color="default" />
                        </Box>
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

                    {isShowingBugReport && (
                        <ModalContainer asSheet onHide={onHideBugReport}>
                            {!isTouch && (
                                <Box position="relative">
                                    <IconButton
                                        position="topRight"
                                        icon="close"
                                        onClick={onHideBugReport}
                                    />
                                </Box>
                            )}
                            <Stack gap alignItems="center" paddingY="lg">
                                <Text size="lg" fontWeight="strong" color="default">
                                    Bug Report
                                </Text>
                            </Stack>
                            <ErrorReportForm asSheet excludeDebugInfo onHide={onHideBugReport} />
                        </ModalContainer>
                    )}
                    <Notifications />
                </WelcomeLayout>
            </ZLayerProvider>
        </QueryClientProvider>
    )
}
