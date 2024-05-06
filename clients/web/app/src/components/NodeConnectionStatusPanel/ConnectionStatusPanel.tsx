import React, { useMemo } from 'react'
import { NodeVisualization } from '@components/NodeVisualization/NodeVisualization'
import {
    DEFAULT_CONFIG,
    NodeVisualizationContext,
} from '@components/NodeVisualization/NodeVisualizationContext'
import { Panel } from '@components/Panel/Panel'
import { Box, Paragraph } from '@ui'
import { useStore } from 'store/store'
import { atoms } from 'ui/styles/atoms.css'
import { ConnectionStatusBanner } from './ConnectionStatusBanner'
import { useConnectionStatus } from './hooks/useConnectionStatus'
import { NodeData, useNodeData } from './hooks/useNodeData'
import { SVGDot } from './SVGDot'

export const NodeStatusPanel = () => {
    const darkMode = useStore((state) => state.getTheme() === 'dark')
    const { connectionStatus, nodeUrl } = useConnectionStatus()
    const config = useMemo(
        () => ({ ...DEFAULT_CONFIG, animateNodes: false, nodeUrl, darkMode }),
        [darkMode, nodeUrl],
    )

    const nodes = useNodeData(nodeUrl)

    return (
        <Panel label="Node Connection" style={{ userSelect: 'none' }}>
            <Box centerContent>
                <NodeVisualizationContext.Provider value={config}>
                    {nodes?.length ? <NodeVisualization /> : <></>}
                </NodeVisualizationContext.Provider>
            </Box>

            {nodes?.length ? (
                <Box gap>
                    {nodes.map((n) => {
                        return (
                            <NodeStatusRow
                                nodeData={n}
                                key={n.id}
                                contentBefore={
                                    n.nodeUrl === nodeUrl ? (
                                        <ConnectionStatusBanner status={connectionStatus} />
                                    ) : undefined
                                }
                            />
                        )
                    })}
                </Box>
            ) : (
                <Box>No nodes found</Box>
            )}
        </Panel>
    )
}

const NodeStatusRow = ({
    nodeData,
    contentBefore,
}: {
    nodeData: NodeData
    contentBefore?: JSX.Element
}) => {
    return (
        <Box padding gap background="level2" rounded="sm">
            {contentBefore}
            <Box gap="sm">
                <Box
                    horizontal
                    alignItems="center"
                    style={{ color: `#${nodeData.color.getHexString()}` }}
                >
                    <Box minWidth="x2">
                        <SVGDot />
                    </Box>
                    <Paragraph truncate>{nodeData.nodeUrl}</Paragraph>
                    <Box grow alignItems="end">
                        <Box
                            fontSize="sm"
                            rounded="sm"
                            padding="xs"
                            background={nodeData.status === 2 ? 'positiveSubtle' : 'negativeSubtle'}
                        >
                            {nodeData.statusText}
                        </Box>
                    </Box>
                </Box>

                <Paragraph>
                    <span className={atoms({ color: 'gray2' })}>Health: </span>
                    {nodeData.data.grpc.elapsed} gRPC &bull; {nodeData.data.http20.elapsed} HTTP/2
                </Paragraph>
            </Box>
        </Box>
    )
}
