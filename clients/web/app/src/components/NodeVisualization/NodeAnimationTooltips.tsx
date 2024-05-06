import { AnimatePresence } from 'framer-motion'
import React, { forwardRef, useEffect, useRef } from 'react'
import { Box, Paragraph } from '@ui'
import { FadeInBox } from '@components/Transitions'
import { NodeData } from '@components/NodeConnectionStatusPanel/hooks/useNodeData'

type Props = {
    hoveredNode: NodeData | null
    containerRef: React.RefObject<HTMLElement>
}

export const NodeAnimationTooltips = (props: Props) => {
    const { hoveredNode, containerRef } = props
    const tooltipPositionRef = useRef<HTMLDivElement>(null)
    const tooltipRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const container = containerRef.current
        if (!container || !hoveredNode) {
            return
        }

        const onPointerMove = (e: PointerEvent) => {
            const containerBounds = container.getBoundingClientRect()
            const maxX = window.innerWidth

            if (tooltipPositionRef.current && tooltipRef.current) {
                const tooltipWidth = tooltipRef.current.offsetWidth
                const x = e.clientX - Math.max(0, e.clientX + tooltipWidth - maxX)

                const y = e.clientY + 16 - containerBounds.top
                tooltipPositionRef.current.style.top = `${y}px`
                tooltipPositionRef.current.style.left = `${x - containerBounds.left - 30}px`
            }
        }

        container.addEventListener('pointermove', onPointerMove)
        return () => {
            container.removeEventListener('pointermove', onPointerMove)
        }
    }, [containerRef, hoveredNode])

    return (
        <AnimatePresence>
            {hoveredNode && (
                <FadeInBox fast position="topLeft" ref={tooltipPositionRef} pointerEvents="none">
                    <NodeTooltip node={hoveredNode} ref={tooltipRef} />
                </FadeInBox>
            )}
        </AnimatePresence>
    )
}

const NodeTooltip = forwardRef<HTMLDivElement, { node: NodeData }>(({ node }, ref) => {
    return (
        <Box
            padding="sm"
            background="level1"
            rounded="xs"
            boxShadow="medium"
            gap="sm"
            minWidth="100"
            ref={ref}
        >
            <Paragraph
                size="sm"
                whiteSpace="nowrap"
                style={{ color: `#${node.color.getHexString()}` }}
            >
                {node.id}
            </Paragraph>
        </Box>
    )
})
