import React, { useMemo } from 'react'
import { NodeVisualization } from '@components/NodeVisualization/NodeVisualization'
import {
    DEFAULT_CONFIG,
    NodeVisualizationContext,
} from '@components/NodeVisualization/NodeVisualizationContext'
import { Panel } from '@components/Panel/Panel'
import { Box } from '@ui'
import { ConnectionHistory } from './ConnectionHistory'
import { ConnectionStatusBanner } from './ConnectionStatusBanner'
import { useConnectionStatus } from './hooks/useConnectionStatus'

export const NodeStatusPanel = () => {
    const { connectionStatus, nodeUrl } = useConnectionStatus()
    const config = useMemo(() => ({ ...DEFAULT_CONFIG, animateNodes: false, nodeUrl }), [nodeUrl])

    return (
        <Panel label="Node Connection" style={{ userSelect: 'none' }}>
            <ConnectionStatusBanner status={connectionStatus} />
            <Box centerContent>
                <NodeVisualizationContext.Provider value={config}>
                    <NodeVisualization />
                </NodeVisualizationContext.Provider>
            </Box>
            <ConnectionHistory />
        </Panel>
    )
}
