import React, { useCallback } from 'react'
import { Box, IconButton } from '@ui'
import { useAppOverlayBugReport } from './AppBugReportOverlay'

export const AppBugReportButton = (props: { topRight?: true }) => {
    const showBugReport = useAppOverlayBugReport((s) => s.setVisible)
    const onShowBugReport = useCallback(() => {
        showBugReport(true)
    }, [showBugReport])

    const button = (
        <>
            <IconButton
                horizontal
                centerContent
                icon="bug"
                color="gray2"
                background="lightHover"
                width="x4"
                height="x4"
                shrink={false}
                onClick={onShowBugReport}
            />
        </>
    )

    return props.topRight ? (
        <Box position="topRight" paddingTop={{ standalone: 'safeAreaInsetTop', default: 'none' }}>
            <Box padding>{button}</Box>
        </Box>
    ) : (
        button
    )
}
