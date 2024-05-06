import React from 'react'
import formatDistance from 'date-fns/formatDistance'
import { Box, Paragraph } from '@ui'
import { ConnectionEventData, useConnectionHistory } from './hooks/useConnectionHistory'
import { SVGDot } from './SVGDot'
import { useNodeData } from './hooks/useNodeData'

export const ConnectionHistory = () => {
    const { statusEvents } = useConnectionHistory()
    return (
        <Box gap="sm">
            {statusEvents.map((e) => (
                <StatusEvent statusEvent={e} key={e.timestamp} />
            ))}
        </Box>
    )
}

const StatusEvent = ({ statusEvent }: { statusEvent: ConnectionEventData }) => {
    const nodeUrl = statusEvent.nodeUrl
    const nodes = useNodeData(nodeUrl)

    const nodeConnection = nodes.find((n) => n.id === nodeUrl)

    return (
        <Box
            padding
            background="level2"
            rounded="sm"
            gap="paragraph"
            color="gray2"
            pointerEvents="all"
        >
            <Paragraph>{formatDistance(statusEvent.timestamp, Date.now())}</Paragraph>
            <Box
                horizontal
                gap="sm"
                style={{ color: nodeConnection?.color.getHexString() }}
                alignItems="center"
            >
                {nodeUrl && (
                    <>
                        <SVGDot />
                        <Paragraph>
                            <span>{nodeUrl.replace('https://', '')}</span>
                        </Paragraph>
                    </>
                )}
            </Box>
        </Box>
    )
}
