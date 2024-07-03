import React, { useCallback } from 'react'
import { Box, Icon } from '@ui'
import { useAppOverlayBugReport } from './AppBugReportOverlay'

export const AppBugReportButton = (props: { topRight?: true }) => {
    const showBugReport = useAppOverlayBugReport((s) => s.setVisible)
    const onShowBugReport = useCallback(() => {
        showBugReport(true)
    }, [showBugReport])

    const button = (
        <Box
            horizontal
            hoverable
            gap="paragraph"
            padding="sm"
            cursor="pointer"
            tooltip="Report a bug"
            tooltipOptions={{ placement: 'horizontal' }}
            background="lightHover"
            rounded="sm"
            alignContent="center"
            alignItems="center"
            onClick={onShowBugReport}
        >
            <Icon size="square_sm" type="bug" color="default" />
        </Box>
    )

    return props.topRight ? (
        <Box padding position="topRight" paddingTop={{ touch: 'safeAreaInsetTop', default: 'md' }}>
            {button}
        </Box>
    ) : (
        button
    )
}
