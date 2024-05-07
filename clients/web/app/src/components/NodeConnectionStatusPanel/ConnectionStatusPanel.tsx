import React, { useCallback, useMemo, useRef } from 'react'
import {
    DEFAULT_CONFIG,
    NodeAnimationContext,
} from '@components/NodeAnimation/NodeAnimationContext'
import { Panel } from '@components/Panel/Panel'
import { Box } from '@ui'
import { useStore } from 'store/store'

import { NodeAnimationLoader } from '@components/NodeAnimation/NodeAnimationLoader'

import { ConnectionStatusBanner } from './ConnectionStatusBanner'
import { NodeStatusPill } from './NodeStatusPill'
import { useConnectionStatus } from './hooks/useConnectionStatus'
import { useNodeData } from './hooks/useNodeData'

export const NodeStatusPanel = () => {
    const darkMode = useStore((state) => state.getTheme() === 'dark')
    const { connectionStatus, nodeUrl } = useConnectionStatus()
    const config = useMemo(
        () => ({ ...DEFAULT_CONFIG, animateNodes: false, nodeUrl, darkMode }),
        [darkMode, nodeUrl],
    )

    const nodes = useNodeData(nodeUrl)

    const ref = useRef<HTMLDivElement>(null)

    const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop
        ref.current?.style.setProperty('--scroll-top', `${Math.max(0, scrollTop - 50) / 250}`)
    }, [])

    return (
        <Panel label="Node Connection" style={{ userSelect: 'none' }} onScroll={onScroll}>
            <Box centerContent ref={ref}>
                <Box width="300" height="300" />
                <Box
                    position="absolute"
                    style={{
                        opacity: `calc(1 - var(--scroll-top) * 1)`,
                        transform: `translateY(
                            calc(var(--scroll-top) * -32px)
                        )`,
                    }}
                >
                    <NodeAnimationContext.Provider value={config}>
                        <NodeAnimationLoader />
                    </NodeAnimationContext.Provider>
                </Box>
            </Box>
            <Box gap position="relative">
                {nodes?.length ? (
                    nodes.map((n) => (
                        <NodeStatusPill
                            nodeData={n}
                            key={n.id}
                            contentBefore={
                                n.nodeUrl === nodeUrl ? (
                                    <Box>
                                        <ConnectionStatusBanner status={connectionStatus} />
                                    </Box>
                                ) : undefined
                            }
                            boxShadow={n.nodeUrl === nodeUrl ? 'panel' : undefined}
                        />
                    ))
                ) : (
                    <></>
                )}
            </Box>
        </Panel>
    )
}
