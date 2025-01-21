import React, { useMemo, useRef, useState } from 'react'
import useResizeObserver from '@react-hook/resize-observer'

import { Box } from '../Box/Box'
import { Placement } from './types'

type OffsetContainerProps = {
    placement: Placement
    render: JSX.Element
    triggerRect: DOMRect
    hitPosition: [number, number] | undefined
    animatePresence?: boolean
    containerRef: React.MutableRefObject<HTMLDivElement | null>
    setIsAbove: (isAbove: boolean) => void
}

type Position = 'top' | 'bottom' | 'left' | 'right'
const positions: Position[] = ['top', 'bottom', 'left', 'right']

const DEBUG = false

const margin = 4

export const OverlayContainer = (props: OffsetContainerProps) => {
    const { triggerRect, hitPosition, render, placement, setIsAbove } = props
    const ref = useRef<HTMLDivElement>(null)
    const isAboveCheckCount = useRef(0)
    props.containerRef.current = ref.current

    const contentSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 })
    const anchorRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const anchorStyle: { [key: string]: number | string | undefined } = useMemo(
        () => ({
            position: 'absolute',
            border: DEBUG ? `1px solid green` : undefined,
        }),
        [],
    )

    const safeArea = useMemo(
        () => ({
            left: 0,
            top: 0,
            right: window.innerWidth,
            bottom: window.innerHeight,
        }),
        [],
    )

    const containerStyle: { [key: string]: number | string | undefined } = useMemo(
        () => ({
            position: 'absolute',
            border: DEBUG ? `1px solid pink` : undefined,
            maxWidth: safeArea.right - safeArea.left - margin * 2,
            minWidth:
                placement === 'dropdown'
                    ? `${Math.min(
                          safeArea.right - safeArea.left - margin * 2,
                          triggerRect.width,
                      )}px`
                    : undefined,
        }),
        [placement, safeArea, triggerRect.width],
    )

    const computeStyles = () => {
        const size = contentSizeRef.current

        const anchorStyle: Record<Position, number | undefined> = {
            left: undefined,
            right: undefined,
            top: undefined,
            bottom: undefined,
        }

        const containerStyle: Record<Position, number | undefined> = {
            left: undefined,
            right: undefined,
            top: undefined,
            bottom: undefined,
        }

        if (!triggerRect || (size.width === 0 && size.height === 0)) {
            return {
                anchorStyle,
                containerStyle,
            }
        }

        if (placement === 'dropdown') {
            const top = triggerRect.bottom
            // Check if dropdown would overflow bottom of screen
            const wouldOverflowBottom = top + size.height > safeArea.bottom
            // If it would overflow bottom, position above the trigger instead
            anchorStyle.top = wouldOverflowBottom ? triggerRect.top - size.height : top
            anchorStyle.left = triggerRect.left

            const anchorRight = triggerRect.right
            const fitsRight = anchorRight - size.width > safeArea.left

            const anchorLeft = triggerRect.left
            const fitsLeft = anchorLeft + size.width < safeArea.right

            // this is a hack so this doesn't re-render a ton of times on edge cases and cause crazy flip flops
            // need more time to investigate and i don't have time right now
            if (isAboveCheckCount.current < 3) {
                isAboveCheckCount.current += 1
                setIsAbove(anchorStyle.top < triggerRect.top)
            }

            // ideally align horizontally on the right
            if (fitsRight || !fitsLeft) {
                anchorStyle.left = anchorRight
                containerStyle.right = 0
            } else {
                anchorStyle.left = anchorLeft
                containerStyle.left = 0
            }
        }

        if (placement === 'vertical') {
            anchorStyle.top = triggerRect.top
            const topDiff = Math.max(0, (size.height ?? 0) - anchorStyle.top)
            containerStyle.bottom = -topDiff

            anchorStyle.left = triggerRect.right
            const leftDiff = Math.max(0, (size.width ?? 0) - anchorStyle.left)
            containerStyle.right = leftDiff
        }

        if (placement === 'horizontal') {
            anchorStyle.top = triggerRect.top - margin

            const diff = Math.max(0, anchorStyle.top + size.height - safeArea.bottom + margin)

            // readjust vertically so the bottom doesn't go outside the screen
            containerStyle.top = 0 - diff

            const anchorRight = triggerRect.right + margin
            const fitsRight = anchorRight + size.width < safeArea.right

            const anchorLeft = triggerRect.left - margin
            const fitsLeft = anchorLeft - size.width > safeArea.left

            // ideally align horizontally on the right
            if (fitsRight || !fitsLeft) {
                anchorStyle.left = anchorRight
                containerStyle.left = 0
            } else {
                anchorStyle.left = anchorLeft
                containerStyle.right = 0
            }
        }

        if (placement === 'pointer' && hitPosition) {
            anchorStyle.left = hitPosition[0]
            anchorStyle.top = hitPosition[1]
        }

        return {
            anchorStyle,
            containerStyle,
        }
    }

    const updateStyles = () => {
        const styles = computeStyles()
        Object.values([
            [anchorRef.current, styles.anchorStyle] as const,
            [containerRef.current, styles.containerStyle] as const,
        ]).forEach(([element, style]) => {
            if (element) {
                Object.values(positions).forEach((position) => {
                    element.style[position] =
                        typeof style[position] === 'number' ? `${style[position]}px` : ''
                })
            }
        })
    }

    const [isSizeInitialized, setIsSizeInitialized] = useState(false)

    useResizeObserver(ref, (targetSize) => {
        const bounds = ref.current?.getBoundingClientRect()
        if (bounds) {
            contentSizeRef.current.width = bounds.width
            contentSizeRef.current.height = bounds.height

            updateStyles()
            setIsSizeInitialized(true)
        }
    })

    const initializedAnchorStyle = useMemo(
        () => ({ ...anchorStyle, opacity: isSizeInitialized ? 1 : 0 }),
        [anchorStyle, isSizeInitialized],
    )

    return (
        <Box absoluteFill pointerEvents="auto" zIndex="tooltips">
            {render && (
                <div ref={anchorRef} style={initializedAnchorStyle}>
                    <div ref={containerRef} style={containerStyle}>
                        <Box ref={ref} position="relative">
                            {render}
                        </Box>
                    </div>
                </div>
            )}
        </Box>
    )
}
