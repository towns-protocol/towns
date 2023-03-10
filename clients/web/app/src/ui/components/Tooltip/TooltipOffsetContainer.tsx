import { motion } from 'framer-motion'
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Box, BoxProps } from '../Box/Box'
import { Placement } from './TooltipConstants'

type OffsetContainerProps = {
    layoutId: string
    placement: Placement
    render: JSX.Element
    triggerRect: DOMRect
    hitPosition: [number, number] | undefined
    distance?: BoxProps['padding']
    animatePresence?: boolean
    onMouseLeave: () => void
    disableBackgroundInteraction?: boolean
    containerRef: React.MutableRefObject<HTMLDivElement | null>

    containerBounds?: {
        top: number
        right: number
        bottom: number
        left: number
    }
}

export const TooltipOffsetContainer = (props: OffsetContainerProps) => {
    const {
        triggerRect,
        hitPosition,
        render,
        placement,
        containerRef,
        distance = 'md',
        layoutId = 'tooltip',
        disableBackgroundInteraction,
    } = props
    const [size, setSize] = useState({ width: 0, height: 0 })

    const ref = useRef<HTMLDivElement>(null)
    containerRef.current = ref.current

    const containerBounds = useMemo(() => {
        return (
            // default to window
            props.containerBounds ?? {
                top: 0,
                right: window.innerWidth,
                bottom: window.innerHeight,
                left: 0,
            }
        )
    }, [props.containerBounds])

    const style = useMemo(() => {
        if (!triggerRect) {
            return undefined
        }

        const baseStyle = {
            // pointerEvent:  "none",
            position: 'absolute',
        } as const

        const pos = {
            left: 0,
            top: 0,
        }

        if (placement === 'horizontal') {
            pos.top = triggerRect.top + triggerRect.height * 0.5 - size.height * 0.5
            pos.left = triggerRect.right
        } else if (placement === 'vertical') {
            pos.top = triggerRect.bottom
            pos.left = triggerRect.left + triggerRect.width * 0.5 - size.width * 0.5
        } else {
            // hack - need to align with cardopener
            pos.top = triggerRect.top - size.height
            pos.left = triggerRect.left + triggerRect.width * 0.5 - size.width * 0.5
        }

        pos.left = Math.max(
            containerBounds.left,
            Math.min(containerBounds.right - size.width, pos.left),
        )

        pos.top = Math.max(
            containerBounds.top,
            Math.min(containerBounds.bottom - size.height, pos.top),
        )

        if (hitPosition) {
            pos.left = hitPosition[0]
            pos.top = hitPosition[1]
        }

        return {
            ...baseStyle,
            ...pos,
        }
    }, [hitPosition, containerBounds, placement, size, triggerRect])

    useLayoutEffect(() => {
        const domRect = ref.current?.getBoundingClientRect()
        if (domRect) {
            setSize({ width: domRect.width, height: domRect.height })
        }
    }, [ref])

    const content = (
        <Box padding={distance} ref={ref} onMouseLeave={props.onMouseLeave}>
            {/* avoid overlapping exact bounds */}
            <Box insetX="xs">{render}</Box>
        </Box>
    )

    return size.width === 0 ? (
        <div style={style}>{content}</div>
    ) : (
        <Box absoluteFill pointerEvents={disableBackgroundInteraction ? 'auto' : 'none'}>
            <motion.div {...layoutAnimation} layoutId={layoutId} style={style}>
                <motion.div>{content}</motion.div>
            </motion.div>
        </Box>
    )
}

const layoutAnimation = {
    layout: 'position',
    transition: { type: 'spring', stiffness: 500, damping: 30 },
} as const
