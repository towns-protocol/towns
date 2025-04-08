import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { isEqual } from 'lodash'
import { Box, BoxProps, MotionBox, Text } from '@ui'
import { notUndefined } from 'ui/utils/utils'

export type OffscreenMarker = {
    targetId: string
    label?: string
    priority: number
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

    const [intersectionEntries, setIntersectionEntries] = useState<Set<string>>(new Set())

    useEffect(() => {
        const container = scrollRef.current
        if (!container) {
            return
        }

        const onChangeObserved: IntersectionObserverCallback = (entries) => {
            startTransition(() => {
                setIntersectionEntries((prev) => {
                    const newSet = new Set(prev)
                    entries.forEach((e) => {
                        const targetId = e.target.getAttribute('data-offscreen-id')
                        const dataId = markers.find(
                            (m) => getMarkerDomId(m.targetId) === targetId,
                        )?.targetId
                        if (!dataId) {
                            return
                        }
                        if (e.isIntersecting) {
                            newSet.delete(dataId)
                        } else {
                            newSet.add(dataId)
                        }
                    })
                    return newSet
                })
            })
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
        return () => {
            intersectionObserver.disconnect()
        }
    }, [containerMarginTop, markers, scrollRef])

    useEffect(() => {
        const container = scrollRef.current
        if (!container) {
            return
        }

        const containerBounds = container.getBoundingClientRect()

        const outsideItems = markers
            .filter((m) => intersectionEntries.has(m.targetId))
            .map((m) => {
                const dom = container.querySelector(
                    `[data-offscreen-id="${getMarkerDomId(m.targetId)}"]`,
                )
                if (!dom) {
                    return undefined
                }
                const bounds = dom.getBoundingClientRect()
                const alignment: Alignment =
                    bounds.y < containerBounds.top + containerBounds.height / 2 ? 'top' : 'bottom'

                return {
                    marker: m,
                    alignment,
                    offset: 0,
                }
            })
            .filter(notUndefined)

        const closest = outsideItems.reduce(
            (closest, { marker, alignment, offset }) => {
                const isCloser = !closest || Math.abs(offset) < Math.abs(closest.offset)
                const isPriority =
                    (!marker.priority && !closest?.marker?.priority) ||
                    (marker.priority &&
                        (closest?.marker?.priority === undefined ||
                            marker.priority <= closest.marker.priority))

                if (
                    // while being closer than the previous one
                    !closest ||
                    (isCloser && isPriority)
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
            if (closest?.marker && !closest.marker.label) {
                closest.marker.label = defaultLabel
            }
            setActiveMarker(closest)
        }
    }, [defaultLabel, intersectionEntries, markers, scrollRef])

    const onPillClick = useCallback(() => {
        if (activeMarker) {
            const container = scrollRef.current

            if (!container) {
                return
            }

            const containerBounds = container?.getBoundingClientRect()

            const allElements = markers
                .map((m) => {
                    const el = container?.querySelector(
                        `[data-offscreen-id="${getMarkerDomId(m.targetId)}"]`,
                    )
                    const bounds = el?.getBoundingClientRect()
                    return bounds
                        ? {
                              targetId: m.targetId,
                              bounds,
                              el,
                          }
                        : undefined
                })
                .filter(notUndefined)

            const current = allElements.find((e) => e.targetId === activeMarker.marker.targetId)

            if (!current) {
                return
            }

            const direction =
                current.bounds.y < containerBounds.top + containerBounds.height / 2 ? 'up' : 'down'

            const furthest = allElements.reduce((keep, current) => {
                let distance: number
                if (direction === 'up') {
                    if (current.bounds.y > containerBounds.top) {
                        return keep
                    }
                    distance = Math.abs(current.bounds.y - containerBounds.top)
                } else {
                    if (current.bounds.y < containerBounds.bottom) {
                        return keep
                    }
                    distance = Math.abs(
                        containerBounds.top + containerBounds.height - current.bounds.y,
                    )
                }
                if (!keep || distance > keep.distance) {
                    return { furthest: current, distance }
                }
                return keep
            }, undefined as { furthest: (typeof allElements)[0]; distance: number } | undefined)?.furthest

            if (!furthest) {
                return
            }

            const dom = container.querySelector(
                `[data-offscreen-id="${getMarkerDomId(furthest.targetId)}"]`,
            )

            dom?.scrollIntoView({
                behavior: 'smooth',
                block: direction === 'up' ? 'start' : 'end',
            })
        }
    }, [activeMarker, markers, scrollRef])

    return (
        <AnimatePresence>
            {activeMarker?.marker && (
                <Pill
                    alignment={activeMarker.alignment}
                    key={`pill-${activeMarker?.alignment}`}
                    onClick={onPillClick}
                >
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
    scrollMarginTop = 0,
    scrollMarginBottom = 0,
    ...boxProps
}: BoxProps & { id: string; scrollMarginTop: number; scrollMarginBottom: number }) => {
    return (
        <Box
            position="absolute"
            data-offscreen-id={getMarkerDomId(id)}
            style={{
                scrollMarginTop,
                scrollMarginBottom,
            }}
        >
            <Box height="x6" {...boxProps} />
        </Box>
    )
}
