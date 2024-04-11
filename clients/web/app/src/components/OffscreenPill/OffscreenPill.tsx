import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { isEqual } from 'lodash'
import { Box, BoxProps, MotionBox, Text } from '@ui'

export type OffscreenMarker = {
    targetId: string
    label?: string
}

type Alignment = 'top' | 'bottom'

/**
 * @usage
 * const markers = [{targetId:'item-1', label: 'red item is out of screen!'},{targetId:'item-2'}]
 * return (
 *  <>
 *      <div ref={scrollRef} scroll>
 *          <OffscreenMarker id="item-1" />
 *          <MenuItem>red item</MenuItem>
 *          ...
 *          <OffscreenMarker id="item 2" />
 *          <MenuItem>green item</MenuItem>
 *            ...
 *          <OffscreenMarker id="item 3" />
 *          <MenuItem>blue item</MenuItem>
 *      </div>
 *      <OffscreenPill markers={markers} scrollRef={scrollRef} defaultLabel="an item is out of screen" />
 *  </>
 *  )
 */
export const OffscreenPill = (props: {
    defaultLabel?: string
    markers: OffscreenMarker[]
    scrollRef: React.RefObject<HTMLDivElement>
    // marginTop is custom for the sidebar header
    containerMarginTop: number
}) => {
    const { scrollRef, markers, defaultLabel, containerMarginTop } = props

    const [activeMarker, setActiveMarker] = useState<
        { marker: OffscreenMarker; alignment: Alignment } | undefined
    >(undefined)

    const activeMarkerRef = useRef(activeMarker)
    activeMarkerRef.current = activeMarker

    useEffect(() => {
        const container = scrollRef.current

        if (!container) {
            return
        }

        const onChangeObserved: IntersectionObserverCallback = () => {
            const containerBounds = container.getBoundingClientRect()
            // we need to check the intersection of all items, not just the ones
            // that just intersected
            const allItems = markers
                .map((marker) => ({
                    marker,
                    target: container.querySelector(
                        `[data-offscreen-id="${getMarkerDomId(marker.targetId)}"]`,
                    ),
                }))
                .reverse()

            // retrieve the closest element outside the view
            const closest = allItems.reduce(
                (closest, item) => {
                    if (!item.target) {
                        return closest
                    }
                    const marker = item.marker
                    const bounds = item.target.getBoundingClientRect()
                    const pos = bounds.y
                    // this needs to match the current intersection provided by
                    // the observer otherwise the UI will get out of sync.
                    // for this reason we're allowing 1/2 height of the element
                    // in extra margin (intersection triggered at 0.5 height)
                    const isIntersecting =
                        bounds.top + bounds.height * 0 < containerBounds.bottom &&
                        bounds.top + bounds.height * 1 > containerBounds.top + containerMarginTop

                    const alignment: Alignment =
                        bounds.y < containerBounds.top + containerBounds.height / 2
                            ? 'top'
                            : 'bottom'

                    const offset = alignment === 'top' ? pos : pos - containerBounds.bottom

                    if (
                        marker &&
                        // outside the viewport
                        !isIntersecting &&
                        // while being closer than the previous one
                        (!closest || Math.abs(offset) > Math.abs(closest.offset))
                    ) {
                        return { offset, marker, alignment }
                    }
                    return closest
                },
                undefined as
                    | {
                          offset: number
                          marker: OffscreenMarker
                          alignment: Alignment
                      }
                    | undefined,
            )

            if (!isEqual(closest, activeMarkerRef.current)) {
                // update pill
                if (closest?.marker && !closest.marker.label) {
                    closest.marker.label = defaultLabel
                }
                setActiveMarker(closest)
            }
        }

        const intersectionObserver = new IntersectionObserver(onChangeObserved, {
            root: container,
            rootMargin: `${-containerMarginTop}px 0px 0px 0px`,
            threshold: 0.5,
        })

        markers.forEach((marker) => {
            const dom = container.querySelector(
                `[data-offscreen-id="${getMarkerDomId(marker.targetId)}"]`,
            )
            if (dom) {
                intersectionObserver.observe(dom)
            }
        })

        // refresh items on init
        onChangeObserved([], intersectionObserver)

        return () => {
            intersectionObserver.disconnect()
        }
    }, [containerMarginTop, defaultLabel, markers, scrollRef])

    const onPillClick = useCallback(() => {
        const container = scrollRef.current
        const furthest = activeMarker?.alignment === 'top' ? markers[0] : markers.at(-1)
        if (furthest) {
            const dom = container?.querySelector(
                `[data-offscreen-id="${getMarkerDomId(furthest?.targetId)}"]`,
            )
            dom?.scrollIntoView({
                behavior: 'smooth',
                block: activeMarker?.alignment === 'top' ? 'start' : 'end',
            })
        }
    }, [activeMarker?.alignment, markers, scrollRef])

    return (
        <AnimatePresence>
            {activeMarker?.marker && (
                <Pill alignment={activeMarker.alignment} key="pill" onClick={onPillClick}>
                    <Text fontWeight="medium">{activeMarker.alignment === 'top' ? '↑' : '↓'} </Text>
                    <Text fontWeight="medium">{activeMarker.marker.label}</Text>
                </Pill>
            )}
        </AnimatePresence>
    )
}

const Pill = ({
    alignment,
    children,
    onClick,
    marginTop = 0,
}: {
    alignment: Alignment
    children: React.ReactNode
    onClick: () => void
    marginTop?: number
}) => {
    const animationProps = useMemo(() => {
        return alignment === 'top'
            ? {
                  initial: { y: `calc(-${marginTop}px - 100%)`, opacity: 0 },
                  animate: { y: `0`, opacity: 1 },
                  exit: { y: `calc(-${marginTop}px - 100%)`, opacity: 0 },
                  transition: { type: 'spring', damping: 30, stiffness: 300 },
              }
            : {
                  initial: { y: `200%` },
                  animate: { y: `0` },
                  exit: { y: `200%` },
                  transition: { type: 'spring', damping: 30, stiffness: 300 },
              }
    }, [alignment, marginTop])

    return (
        <Box
            alignItems="center"
            position="fixed"
            left="none"
            right="none"
            overflow="hidden"
            zIndex="above"
            height="x16"
            pointerEvents="none"
            {...(alignment === 'top' ? { top: 'sm' } : { bottom: 'sm' })}
        >
            <Box height="x8" />
            <MotionBox
                horizontal
                shrink
                layoutRoot
                centerContent
                cursor="pointer"
                paddingX="md"
                grow={false}
                height="x5"
                background="accent"
                rounded="lg"
                width="fit-content"
                boxShadow="pill"
                pointerEvents="auto"
                onClick={onClick}
                {...animationProps}
            >
                <Box horizontal gap="sm">
                    {children}
                </Box>
            </MotionBox>
        </Box>
    )
}

const getMarkerDomId = (id: string) => `channel-marker-${id}`

export const OffscreenMarker = ({
    id,
    containerMarginTop = 0,
    ...boxProps
}: BoxProps & { id: string; containerMarginTop: number }) => {
    return (
        <Box
            position="absolute"
            data-offscreen-id={getMarkerDomId(id)}
            style={{ scrollMarginTop: containerMarginTop }}
        >
            <Box height="x6" {...boxProps} />
        </Box>
    )
}
