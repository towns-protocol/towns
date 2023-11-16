import { Allotment } from 'allotment'
import { useOutlet } from 'react-router'
import React from 'react'
import { Box, Stack } from '@ui'
import { usePersistPanes } from 'hooks/usePersistPanes'
import { useDevice } from 'hooks/useDevice'
import { SomethingWentWrong } from '@components/Errors/SomethingWentWrong'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'

export const CentralPanelLayout = (props: { children: React.ReactNode }) => {
    const { children } = props
    const { sizes, onSizesChange } = usePersistPanes(['channel', 'right'])
    const outlet = useOutlet()
    const { isTouch } = useDevice()

    return isTouch ? (
        <>
            <Stack absoluteFill minHeight="100%" background="level1">
                {props.children}
            </Stack>
            {outlet}
        </>
    ) : (
        <Stack minHeight="100%">
            <Allotment onChange={onSizesChange}>
                <Allotment.Pane minSize={550}>
                    <ErrorBoundary FallbackComponent={ErrorFallbackComponent}>
                        <Box absoluteFill background="level1">
                            {children}
                        </Box>
                    </ErrorBoundary>
                </Allotment.Pane>
                {outlet && (
                    <Allotment.Pane minSize={300} preferredSize={sizes[1] || 450}>
                        <ErrorBoundary FallbackComponent={ErrorFallbackComponent}>
                            {outlet}
                        </ErrorBoundary>
                    </Allotment.Pane>
                )}
            </Allotment>
        </Stack>
    )
}

const ErrorFallbackComponent = (props: { error: Error }) => {
    return (
        <Box centerContent absoluteFill>
            <SomethingWentWrong error={props.error} />
        </Box>
    )
}
