import React, { useCallback, useEffect } from 'react'
import { Panel } from '@components/Panel/Panel'
import { ErrorReportForm } from '@components/ErrorReport/ErrorReport'
import { useStore } from 'store/store'
import { usePanelActions } from './layouts/hooks/usePanelActions'

export const BugReportPanel = () => {
    const { sidePanel, setSidePanel } = useStore(({ sidePanel, setSidePanel }) => ({
        sidePanel,
        setSidePanel,
    }))
    const { closePanel } = usePanelActions()

    useEffect(() => {
        // set this on mount
        setSidePanel('bugReport')
    }, [setSidePanel])

    const onClose = useCallback(() => {
        setSidePanel(null)
        closePanel()
    }, [closePanel, setSidePanel])

    const isBugPanelOpened = sidePanel === 'bugReport'

    return isBugPanelOpened ? (
        <Panel label="Bug Report" onClosed={onClose}>
            <ErrorReportForm onHide={onClose} />
        </Panel>
    ) : null
}
