import React, { useCallback } from 'react'
import { Panel } from '@components/Panel/Panel'
import { ErrorReportForm } from '@components/ErrorReport/ErrorReport'
import { useStore } from 'store/store'

export const BugReportPanel = () => {
    const { setSidePanel } = useStore(({ setSidePanel }) => ({ setSidePanel }))
    const onClose = useCallback(() => {
        setSidePanel(null)
    }, [setSidePanel])
    return (
        <Panel label="Bug Report" onClose={onClose}>
            <ErrorReportForm />
        </Panel>
    )
}
