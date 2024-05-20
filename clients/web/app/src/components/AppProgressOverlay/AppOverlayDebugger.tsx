import React, { useEffect, useState } from 'react'
import { Box, Paragraph } from '@ui'

export const AppOverlayDebugger = (props: { debugText?: string }) => {
    const { debugText } = props

    const [statusLog, setStatusLog] = useState<
        {
            text: string
            timestamp: number
            key: string
        }[]
    >([])
    useEffect(() => {
        if (debugText) {
            setStatusLog((log) => [
                ...log,
                { key: `k${log.length}`, text: debugText, timestamp: Date.now() },
            ])
        }
    }, [debugText])

    return (
        <Box
            padding
            position="bottomLeft"
            key={debugText}
            overflow="hidden"
            gap="paragraph"
            style={{
                opacity: 0.5,
                transformOrigin: `bottom left`,
                transform: `scale(0.75)`,
            }}
        >
            {statusLog.map((h, i, arr) => (
                <Paragraph
                    color={i === statusLog.length - 1 ? 'gray1' : 'gray2'}
                    size="xs"
                    textTransform="uppercase"
                    key={h.key}
                >
                    {h.text}:
                    {i >= statusLog.length - 1
                        ? ' (in progress)'
                        : ` ${statusLog[i + 1].timestamp - h.timestamp}ms`}
                </Paragraph>
            ))}
        </Box>
    )
}
