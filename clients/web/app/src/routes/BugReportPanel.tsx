import React, { useCallback } from 'react'
import { Panel } from '@components/Panel/Panel'
import { ErrorReportForm } from '@components/ErrorReport/ErrorReport'
import { useStore } from 'store/store'
import { usePanelActions } from './layouts/hooks/usePanelActions'

export const BugReportPanel = () => {
    const { setSidePanel } = useStore(({ setSidePanel }) => ({ setSidePanel }))
    const { closePanel } = usePanelActions()

    const onClose = useCallback(() => {
        setSidePanel(null)
        closePanel()
    }, [closePanel, setSidePanel])

    return (
        <Panel label="Bug Report" onClosed={onClose}>
            <ErrorReportForm onHide={onClose} />
        </Panel>
    )
}
