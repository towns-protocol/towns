import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { useCallback } from 'react'
import { create } from 'zustand'
import { Box, IconButton, Stack, Text, ZLayerProvider } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { ErrorReportForm } from '../ErrorReport/ErrorReport'

export const useAppOverlayBugReport = create<{
    visible: boolean
    setVisible: (visible: boolean) => void
}>((set) => ({
    visible: false as boolean,
    setVisible: (visible: boolean) => set({ visible }),
}))

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
    const { isTouch } = useDevice()
    const [isVisible, setVisible] = useAppOverlayBugReport((s) => [s.visible, s.setVisible])

    const onHideBugReport = useCallback(() => {
        setVisible(false)
    }, [setVisible])

    return (
        <ZLayerProvider>
            {isVisible && (
                <QueryClientProvider client={queryClient}>
                    <ModalContainer asSheet padding="none" onHide={onHideBugReport}>
                        <Box position="relative">
                            {!isTouch && (
                                <Box top="md" right="md" position="relative">
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
                            <ErrorReportForm asSheet onHide={onHideBugReport} />
                        </Box>
                    </ModalContainer>
                </QueryClientProvider>
            )}
        </ZLayerProvider>
    )
}
