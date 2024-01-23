import React, { useCallback } from 'react'
import { useZionContext } from 'use-zion-client'
import { Box, Icon } from '@ui'
import { useStore } from 'store/store'

export const BugReportButton = () => {
    const { streamSyncActive } = useZionContext()

    const { sidePanel, setSidePanel } = useStore(({ sidePanel, setSidePanel }) => ({
        sidePanel,
        setSidePanel,
    }))

    const onBugReportClick = useCallback(() => {
        setSidePanel(sidePanel === 'bugReport' ? null : 'bugReport')
    }, [setSidePanel, sidePanel])

    return (
        <>
            <Box
                hoverable
                centerContent
                cursor="pointer"
                tooltip={sidePanel === 'bugReport' ? undefined : 'Report a bug'}
                tooltipOptions={{ placement: 'horizontal' }}
                padding="line"
                background="level2"
                alignSelf="center"
                rounded="sm"
                width="x4"
                height="x4"
                onClick={onBugReportClick}
            >
                <Icon
                    size="square_sm"
                    type={sidePanel === 'bugReport' ? 'bugFill' : 'bug'}
                    color={
                        !streamSyncActive
                            ? 'error'
                            : sidePanel === 'bugReport'
                            ? 'default'
                            : 'gray1'
                    }
                />
            </Box>
        </>
    )
}
