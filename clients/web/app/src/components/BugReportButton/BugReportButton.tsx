import React, { useCallback } from 'react'
import { Box, Icon } from '@ui'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { Analytics } from 'hooks/useAnalytics'

export const BugReportButton = () => {
    const { closePanel, openPanel, isPanelOpen } = usePanelActions()
    const isActive = isPanelOpen('bug-report')

    const onBugReportClick = useCallback(() => {
        if (isPanelOpen('bug-report')) {
            closePanel()
        } else {
            Analytics.getInstance().track('clicked bug report')
            openPanel('bug-report')
        }
    }, [closePanel, isPanelOpen, openPanel])

    return (
        <>
            <Box
                hoverable
                centerContent
                cursor="pointer"
                tooltip={isActive ? undefined : 'Report a bug'}
                tooltipOptions={{ placement: 'horizontal' }}
                padding="line"
                background="level2"
                alignSelf="center"
                rounded="sm"
                width="x4"
                height="x4"
                data-testid="report-bug-button"
                onClick={onBugReportClick}
            >
                <Icon
                    size="square_sm"
                    type={isActive ? 'bugFill' : 'bug'}
                    color={isActive ? 'default' : 'gray1'}
                />
            </Box>
        </>
    )
}
