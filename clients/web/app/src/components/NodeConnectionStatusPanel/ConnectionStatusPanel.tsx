import React from 'react'

import { Panel } from '@components/Panel/Panel'
import { Box } from '@ui'
import { ConnectionHistory } from './ConnectionHistory'
import { ConnectionStatusBanner } from './ConnectionStatusBanner'
import { useConnectionStatus } from './hooks/useConnectionStatus'

export const NodeStatusPanel = () => {
    const { connectionStatus } = useConnectionStatus()

    return (
        <Panel label="Node Connection" style={{ userSelect: 'none' }}>
            <ConnectionStatusBanner status={connectionStatus} />
            <Box centerContent>
                <Box border centerContent width="100%" maxWidth="300" aspectRatio="1/1">
                    placeholder
                </Box>
            </Box>
            <ConnectionHistory />
        </Panel>
    )
}
