import React, { useCallback } from 'react'
import { Box, IconButton } from '@ui'
import { useAppOverlayBugReport } from './useAppOverlayBugReport'

export const AppBugReportButton = (props: { topRight?: true; onClick?: () => void }) => {
    const { onClick } = props
    const showBugReport = useAppOverlayBugReport((s) => s.setVisible)
    const onShowBugReport = useCallback(() => {
        showBugReport(true)
        onClick?.()
    }, [showBugReport, onClick])

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
                data-testid="report-bug-button"
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
