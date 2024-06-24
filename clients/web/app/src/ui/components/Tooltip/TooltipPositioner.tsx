import { clsx } from 'clsx'
import React, { RefObject, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { atoms } from 'ui/styles/atoms.css'
import {
    tooltipBottom,
    tooltipHorizontal,
    tooltipLeft,
    tooltipRight,
    tooltipTop,
    tooltipVertical,
} from './Tooltip.css'
import { useTooltipBoundaryContext } from './TooltipBoundary'

type TooltipPositionerProps = {
    placement: 'vertical' | 'horizontal'
    align?: 'start' | 'center' | 'end'
    render: React.ReactNode
    triggerRef: RefObject<HTMLElement>
    onMouseLeave: React.MouseEventHandler<HTMLElement>
    containerRef: React.MutableRefObject<HTMLElement | null>
}
const DEBUG = false

export const TooltipPositioner = (props: TooltipPositionerProps) => {
    const { align = 'center', containerRef, placement = 'horizontal', render, triggerRef } = props
    const boundaryRef = useTooltipBoundaryContext()
    const rootElement = document.body

    const boundaryPadding = boundaryRef?.tooltipPadding ?? 4
    const rootBoundsRef = useRef<HTMLElement>()
    rootBoundsRef.current = boundaryRef?.ref?.current ?? rootElement

    const ref = useRef<HTMLDivElement>(null)
    containerRef.current = ref.current

    const refs = useMemo(() => {
        return [ref, rootBoundsRef, triggerRef]
    }, [ref, triggerRef])

    const [containerRect, fullBoundsRect, triggerRect] = useRefreshWhenActive(refs)

    const boundsRect = useBounds(fullBoundsRect, boundaryPadding)

    const isContainerEmpty = !containerRect?.height

    const measure = () => {
        const margin = 8

        const containerStyle: { [key: string]: number | string | undefined } = {
            position: 'absolute',
            opacity: isContainerEmpty ? 0 : 1,
            border: DEBUG ? `1px solid pink` : undefined,
            ['--bounds-width']: `${boundsRect.width}`,
            ['--bounds-height']: `${boundsRect.height}`,
        }

        if (!triggerRect || !containerRect?.width || !containerRect?.height) {
            return {
                containerStyle,
            }
        }

        let arrow: 'top' | 'bottom' | 'left' | 'right' =
            placement === 'vertical' ? 'bottom' : 'right'

        const AXIS =
            placement === 'vertical'
                ? ({ size: 'height', before: 'top', after: 'bottom' } as const)
                : ({ size: 'width', before: 'left', after: 'right' } as const)

        const ALIGN =
            placement === 'vertical'
                ? ({ size: 'width', start: 'left', end: 'right' } as const)
                : ({ size: 'height', start: 'top', end: 'bottom' } as const)

        // should this be a setting?
        const prefersBefore = placement === 'vertical' ? true : false

        const fitsBefore =
            triggerRect[AXIS.before] - margin * 2 - containerRect[AXIS.size] >
            boundsRect[AXIS.before]

        const fitsAfter =
            triggerRect[AXIS.after] + margin * 2 + containerRect[AXIS.size] < boundsRect[AXIS.after]

        const spaceBefore = triggerRect[AXIS.before] - boundsRect[AXIS.before]
        const spaceAfter = boundsRect[AXIS.after] - triggerRect[AXIS.after]

        const fitsNowhere = !fitsBefore && !fitsAfter

        const isBefore = fitsNowhere
            ? spaceBefore > spaceAfter
            : // this is what we want
              (prefersBefore && fitsBefore) ||
              // we wanted to keep it after but it doesn't fit
              (!prefersBefore && !fitsAfter)

        if (isBefore) {
            arrow = placement === 'vertical' ? 'top' : 'left'
            containerStyle[AXIS.before] =
                triggerRect[AXIS.before] - margin - containerRect[AXIS.size]
        } else {
            containerStyle[AXIS.before] = triggerRect[AXIS.after] + margin
        }

        if (align === 'start') {
            containerStyle[ALIGN.start] = triggerRect[ALIGN.start]
        }

        if (align === 'center') {
            containerStyle[ALIGN.start] =
                triggerRect[ALIGN.start] +
                triggerRect[ALIGN.size] / 2 -
                containerRect[ALIGN.size] / 2
        }

        if (align === 'end') {
            containerStyle[ALIGN.start] = triggerRect[ALIGN.end] - containerRect[ALIGN.size]
        }

        const start = Math.min(
            Math.max(0, boundsRect[ALIGN.end] - containerRect[ALIGN.size]),
            Math.max(boundsRect[ALIGN.start], Number(containerStyle[ALIGN.start])),
        )

        containerStyle[ALIGN.start] = start

        // center arrow on tooltip rather than trigger if the former is smaller than the latter
        const arrowPosition =
            containerRect[ALIGN.size] < triggerRect[ALIGN.size]
                ? containerRect[ALIGN.size] / 2
                : Math.min(
                      containerRect[ALIGN.size] - 12,
                      Math.max(
                          12,
                          triggerRect[ALIGN.size] / 2 + (triggerRect[ALIGN.start] - start),
                      ),
                  )

        containerStyle[`--tooltip-arrow-position`] = `calc(${arrowPosition} * 1px)`

        return {
            arrow,
            arrowPosition,
            containerStyle,
        }
    }

    // use memo here
    const { containerStyle, arrow, arrowPosition } = measure()

    const visible = useMemo(
        () =>
            triggerRect &&
            boundsRect &&
            triggerRect.bottom > 0 &&
            triggerRect.top < boundsRect.bottom,
        [boundsRect, triggerRect],
    )

    let originX = 0.5,
        originY = 0.5,
        x = 0,
        y = 0

    if (arrowPosition) {
        const mv = 4
        if (placement === 'vertical') {
            originX = arrowPosition / (containerRect?.width ?? 1)
            originY = arrow === 'bottom' ? 0 : 1
            y = arrow === 'bottom' ? -mv : mv
        } else {
            originX = arrow === 'right' ? 0 : 1
            originY = arrowPosition / (containerRect?.height ?? 1)
            x = arrow === 'right' ? -mv : mv
        }
    }

    const className = clsx(
        {
            [tooltipVertical]: placement === 'vertical',
            [tooltipHorizontal]: placement === 'horizontal',
            [tooltipTop]: arrow === 'top',
            [tooltipBottom]: arrow === 'bottom',
            [tooltipLeft]: arrow === 'left',
            [tooltipRight]: arrow === 'right',
        },
        atoms(placement === 'vertical' ? { paddingY: 'xs' } : { paddingX: 'none' }),
    )

    return !containerRect?.height ? (
        // allows measurements before the animate presence animation triggers
        <div className={className} ref={ref} style={containerStyle}>
            {render}
        </div>
    ) : (
        <motion.div className={className} ref={ref} style={containerStyle}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, originX, originY, x, y }}
                animate={{ opacity: visible ? 1 : 0, scale: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, x, y }}
                transition={{
                    opacity: { duration: 0.1 },
                    duration: 0.15,
                }}
            >
                {render}
            </motion.div>
        </motion.div>
    )
}

const useBounds = (bounds: DOMRect | undefined, boundaryPadding: number) => {
    const rootBounds = {
        top: 0,
        left: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
    }

    const top = Math.max(rootBounds.top, bounds?.top ?? 0) + boundaryPadding
    const bottom = Math.min(rootBounds.bottom, bounds?.bottom ?? Number.MAX_VALUE) - boundaryPadding
    const left = Math.max(rootBounds.left, bounds?.left ?? 0) + boundaryPadding
    const right = Math.min(rootBounds.right, bounds?.right ?? Number.MAX_VALUE) - boundaryPadding
    const width = Math.max(0, right - left)
    const height = Math.max(0, bottom - top)

    return {
        top,
        bottom,
        left,
        right,
        width,
        height,
    }
}

function compareRects(a?: DOMRect, b?: DOMRect) {
    return (
        a?.top === b?.top &&
        a?.bottom === b?.bottom &&
        a?.left === b?.left &&
        a?.right === b?.right &&
        a?.width === b?.width &&
        a?.height === b?.height
    )
}

/**
 * checks if the position of the container or trigger has changed while the tooltip is open
 */
const useRefreshWhenActive = (
    elements: (RefObject<HTMLElement | undefined | null> | undefined)[],
) => {
    const [bounds, setBounds] = useState<(DOMRect | undefined)[]>([])

    useEffect(() => {
        const rects: (DOMRect | undefined)[] = []
        const prevRects: (DOMRect | undefined)[] = []

        const check = () => {
            raf = requestAnimationFrame(check)
            elements.forEach((e, i) => (rects[i] = e?.current?.getBoundingClientRect()))
            if (rects.some((e, i) => !compareRects(rects[i], prevRects[i]))) {
                setBounds([...rects])
            }
            rects.forEach((e, i) => {
                prevRects[i] = e
            })
        }
        // checking this on animation frame may seem a bit excessive, but it's
        // the safest way to ensure that the tooltip is always in the correct
        // position. This should only be called when the tooltip is open which
        // makes it acceptable.
        let raf = requestAnimationFrame(check)

        return () => {
            if (raf) {
                cancelAnimationFrame(raf)
            }
        }
    }, [elements])

    return bounds
}
