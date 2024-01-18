import { Allotment } from 'allotment'
import { useOutlet } from 'react-router'
import React, { useEffect, useRef } from 'react'
import { Box, Stack } from '@ui'
import { usePersistPanes } from 'hooks/usePersistPanes'
import { useDevice } from 'hooks/useDevice'
import { SomethingWentWrong } from '@components/Errors/SomethingWentWrong'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'
import { useStore } from 'store/store'
import { BugReportPanel } from 'routes/BugReportPanel'

export const CentralPanelLayout = (props: { children: React.ReactNode }) => {
    const { sidePanel, setSidePanel } = useStore(({ sidePanel, setSidePanel }) => ({
        sidePanel,
        setSidePanel,
    }))
    const { children } = props
    const { sizes, onSizesChange } = usePersistPanes(['channel', 'right'])
    const outlet = useOutlet()
    const { isTouch } = useDevice()

    const outletRef = useRef(outlet)
    useEffect(() => {
        if (outlet && !outletRef.current && sidePanel) {
            setSidePanel(null)
        }
        outletRef.current = outlet
    }, [outlet, setSidePanel, sidePanel])

    const panel = sidePanel === 'bugReport' ? <BugReportPanel /> : null

    // precedence: panel (state) > outlet (route)
    const panelOrOutlet = panel || outlet

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
                        <Box height="100%" background="level1">
                            {children}
                        </Box>
                    </ErrorBoundary>
                </Allotment.Pane>
                {panelOrOutlet && (
                    <Allotment.Pane minSize={300} preferredSize={sizes[1] || 450}>
                        <ErrorBoundary FallbackComponent={ErrorFallbackComponent}>
                            {panelOrOutlet}
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
