import React, { useMemo, useRef } from 'react'
import useDebounce from 'hooks/useDebounce'
import { useSize } from 'ui/hooks/useSize'

import { Box } from '../Box/Box'
import { Placement } from './types'

type OffsetContainerProps = {
    placement: Placement
    render: JSX.Element
    triggerRect: DOMRect
    hitPosition: [number, number] | undefined
    animatePresence?: boolean
    containerRef: React.MutableRefObject<HTMLDivElement | null>
}

const DEBUG = false

export const OverlayContainer = (props: OffsetContainerProps) => {
    const { triggerRect, hitPosition, render, placement, containerRef } = props
    const ref = useRef<HTMLDivElement>(null)
    containerRef.current = ref.current

    const targetSize = useSize(ref)
    const undeferredSize = useMemo(() => {
        return targetSize ?? { width: 0, height: 0 }
    }, [targetSize])

    // use debounced value to avoid flickering
    const size = useDebounce(undeferredSize, 100)

    const safeArea = useMemo(
        () => ({
            left: 0,
            top: 0,
            right: window.innerWidth,
            bottom: window.innerHeight,
        }),
        [],
    )

    const isContainerEmpty = size.height === 0

    const styles = useMemo(() => {
        const margin = 16

        const anchorStyle: { [key: string]: number | string | undefined } = {
            position: 'absolute',
            border: DEBUG ? `1px solid green` : undefined,
        }

        const containerStyle: { [key: string]: number | string | undefined } = {
            position: 'absolute',
            opacity: isContainerEmpty ? 0 : 1,
            border: DEBUG ? `1px solid pink` : undefined,
        }

        if (!triggerRect || (size.width === 0 && size.height === 0)) {
            return {
                anchorStyle,
                containerStyle,
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
            anchorStyle.top = triggerRect.top

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
    }, [hitPosition, isContainerEmpty, placement, safeArea, size, triggerRect])

    return (
        <>
            {/* background covering pointerevents*/}
            <Box absoluteFill pointerEvents="auto">
                {/* anchor */}
                <div style={styles?.anchorStyle}>
                    {/* container */}
                    <div style={styles?.containerStyle}>
                        <Box ref={ref} position="relative">
                            {render}
                        </Box>
                    </div>
                </div>
            </Box>
        </>
    )
}
