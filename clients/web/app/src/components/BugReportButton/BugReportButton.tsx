import React, { useCallback } from 'react'
import { useZionContext } from 'use-zion-client'
import { IconButton } from '@ui'
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
        <IconButton
            alignSelf="center"
            padding="line"
            background="level2"
            size="square_md"
            icon={sidePanel === 'bugReport' ? 'bugFill' : 'bug'}
            rounded="sm"
            tooltip="Report a bug"
            tooltipOptions={{ placement: 'horizontal' }}
            color={!streamSyncActive ? 'error' : sidePanel === 'bugReport' ? 'default' : 'gray1'}
            onClick={onBugReportClick}
        />
    )
}
