import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { useCallback } from 'react'
import { TownsContextProvider } from 'use-towns-client'
import { Box, IconButton, Stack, Text, ZLayerProvider } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { ErrorReportForm } from '../ErrorReport/ErrorReport'
import { useAppOverlayBugReport } from './useAppOverlayBugReport'
import { useEnvironment } from '../../hooks/useEnvironmnet'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
})

/**
 * this bug report button and modal is meant to be used outside of the app
 * context within overlays.
 */
export const AppBugReportOverlay = () => {
    const environment = useEnvironment()
    const { isTouch } = useDevice()
    const [isVisible, setVisible] = useAppOverlayBugReport((s) => [s.visible, s.setVisible])

    const onHideBugReport = useCallback(() => {
        setVisible(false)
    }, [setVisible])

    return (
        <ZLayerProvider>
            {isVisible && (
                <TownsContextProvider
                    environmentId={environment.id}
                    baseChain={environment.baseChain}
                    baseConfig={environment.baseChainConfig}
                    riverChain={environment.riverChain}
                    riverConfig={environment.riverChainConfig}
                >
                    <QueryClientProvider client={queryClient}>
                        <ModalContainer
                            padding="none"
                            touchTitle="Bug Report"
                            onHide={onHideBugReport}
                        >
                            {!isTouch && (
                                <Stack
                                    gap
                                    grow
                                    horizontal
                                    alignItems="center"
                                    padding="md"
                                    height="x6"
                                    background="level2"
                                >
                                    <Box width="x4" />
                                    <Box grow centerContent>
                                        <Text
                                            size="lg"
                                            fontWeight="strong"
                                            color="default"
                                            data-testid="bug-report-header"
                                        >
                                            Bug Report
                                        </Text>
                                    </Box>
                                    <Box width="x4" alignItems="end">
                                        <IconButton icon="close" onClick={onHideBugReport} />
                                    </Box>
                                </Stack>
                            )}
                            <Box grow scroll position="relative">
                                <Box padding shrink overflow="auto" maxHeight="100%">
                                    <ErrorReportForm onHide={onHideBugReport} />
                                </Box>
                            </Box>
                        </ModalContainer>
                    </QueryClientProvider>
                </TownsContextProvider>
            )}
        </ZLayerProvider>
    )
}
