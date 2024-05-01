import React from 'react'
import formatDistance from 'date-fns/formatDistance'
import { Box, Paragraph } from '@ui'
import { useStaticNodeData } from '@components/NodeConnectionStatusPanel/hooks/useStaticNodeData'
import { ConnectionEventData, useConnectionHistory } from './hooks/useConnectionHistory'

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
    const nodes = useStaticNodeData()

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
            <Box horizontal gap="sm" style={{ color: nodeConnection?.color }} alignItems="center">
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

const SVGDot = () => (
    <svg width={8} height={8} viewBox="-1 -1 10 10">
        <g>
            <rect
                x="0"
                y="0"
                width="8"
                height="8"
                rx="2"
                transform="rotate(-45 4 4)"
                fill="currentColor"
            />
        </g>
    </svg>
)
