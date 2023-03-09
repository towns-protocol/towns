import React, { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useViewport } from './hooks/useViewport'
import { ItemSize } from './types'
import * as styles from './VList.css'
import { useDebugView } from './VListDebugView'
import { VListItem, useInitCacheItem as useDefaultItemSettings } from './VListItem'

const DEBUG = false
const DEFAULT_VIEW_MARGIN = 800
const PADDING = 16

const Debug = {
    TopLevel: `color:#39f`,
    Measuring: `color:#393`,
    Layout: `color:#3ac`,
    Viewport: `color:#099`,
    Critical: `color:#f50`,
    Secondary: `color:#444`,
} as const

interface Props<T> {
    list: T[]
    highlightId?: string
    itemRenderer: (data: T, ref?: RefObject<HTMLElement>) => JSX.Element
    esimtateItemSize?: number | ((data: T) => number | undefined)
    viewMargin?: number
    groupIds?: string[]
    debug?: boolean
    padding?: number
}

export function VList<T extends { id: string }>(props: Props<T>) {
    const {
        esimtateItemSize,
        highlightId,
        groupIds,
        viewMargin = DEFAULT_VIEW_MARGIN,
        padding = PADDING,
    } = props

    // create a copy of the incoming list for safety
    const list = useMemo(() => (props.list ?? []).slice(), [props.list])

    const lastItemId = list[list.length - 1]?.id
    // caches the bounding box of rendered elements
    const cachesRef = useRef(new Map<string, ItemSize>())
    // wraps the `esimtateItemSize()` into a memoized method
    const { createCacheItem } = useDefaultItemSettings<T>(esimtateItemSize)
    // accumulates the computed height of the list as elements gets rendered
    const [listHeight, setListHeight] = useState(0)
    // set once after the first layout has settled
    const [isFullyMeasured, setFullyMeasured] = useState(false)
    // id of an item that is explictely set to be focused within the viewport
    const [scrollMagnet, setScrollMagnet] = useState<string | undefined>(highlightId)
    // update this key to burst dependency of
    const [forceRecalculateKey, setForceRecalculateKey] = useState(0)
    // probably not necessary, just in case this optimizes anything
    const paddingMemo = useMemo(() => padding, [padding])

    const groups = useMemo(() => {
        const groups = list.reduce((groups, item) => {
            if (groupIds?.includes(item.id)) {
                groups.push([])
            }
            if (groups.length) {
                groups[groups.length - 1].push(item.id)
            }
            return groups
        }, [] as string[][])

        return groups
    }, [groupIds, list])

    useEffect(() => {
        DEBUG && console.log({ groups })
    }, [groups])

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - DEBUG

    const debugCommitCount = useRef(0)

    useEffect(() => {
        if (DEBUG) {
            debugCommitCount.current = 0
            console.clear()
            console.log(`%ccycle reset - messages:${list.length} current`, Debug.TopLevel)
        }
    }, [list.length])

    useEffect(() => {
        if (DEBUG) {
            const inc = ++debugCommitCount.current
            console.log(`%ccycle start: ${inc}`, Debug.TopLevel)
        }
    })

    // ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^

    // DOM refs
    const scrollContentRef = useRef<HTMLDivElement>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    const { viewport: physicalViewport, isScrolling } = useViewport(
        scrollContainerRef.current,
        isFullyMeasured,
    )

    const isScrollingRef = useRef(isScrolling)
    isScrollingRef.current = isScrolling

    const viewport: [number, number] = useMemo(() => {
        const vh = physicalViewport[1] - physicalViewport[0]
        const firstViewportItemId = scrollMagnet || lastItemId
        const isTopAligned = highlightId === firstViewportItemId

        const c = !isFullyMeasured && cachesRef.current.get(firstViewportItemId)
        if (c && typeof c.y === 'number') {
            DEBUG && console.log(`%cfocus ${isTopAligned}`, Debug.Viewport)
            if (isTopAligned) {
                return [c.y, c.y + vh]
            } else {
                return [c.y + c.height - vh, c.y + c.height]
            }
        } else {
            return [physicalViewport[0], physicalViewport[1]]
        }
    }, [highlightId, isFullyMeasured, lastItemId, physicalViewport, scrollMagnet])

    // callback for items to force re-computing sizes / positions
    const onItemUpdate = useCallback((id?: string) => {
        DEBUG &&
            console.log(
                `%conItemUpdate ${id} ${groupHeightsRef.current?.[id ?? '']} ${
                    cachesRef.current.get(id ?? '')?.height
                }`,
                Debug.Secondary,
            )
        setForceRecalculateKey((k) => ++k)
    }, [])

    const [updateListIndex, setUpdateListIndex] = useState(0)

    useEffect(() => {
        // just need `forceRedraw` here as a dependency
        forceRecalculateKey
        DEBUG && console.log(`%ccue: forceRecalculateKey`, Debug.Critical)

        // traverse all items to calclulate positions and full height
        const newHeight =
            list.reduce((height, item) => {
                const c = cachesRef.current.get(item.id) ?? createCacheItem(cachesRef, item)
                if (c) {
                    c.y = height
                }
                return height + c.height
            }, paddingMemo) + paddingMemo

        setListHeight(newHeight)
        setUpdateListIndex((i) => ++i)

        // set physical height of the div to ensure scrollbar reflects the new height
        if (scrollContentRef.current) {
            DEBUG &&
                console.log(
                    `%ccue set physical container height ${Math.round(newHeight)}`,
                    Debug.Layout,
                )
            scrollContentRef.current.style.minHeight = `${newHeight.toFixed(1)}px`
        }

        // adjust scroll position if visual cue has been offset
        const referenceItemY = cachesRef.current.get(visualCue.current.id)?.y

        if (typeof referenceItemY !== 'undefined' && typeof visualCue.current.y === 'number') {
            const absCorrection = referenceItemY - visualCue.current.y

            visualCue.current.y = referenceItemY

            // typeof visualCue.current.relY === 'number'
            if (!absCorrection || typeof referenceItemY === 'undefined') {
                return
            }

            let correction: number | undefined = undefined

            if (!isScrollingRef.current) {
                DEBUG && console.log(`%ccue strategies...`, Debug.Measuring)
                // had the feeling keeping amount of temp refs in an array could get leaky?
                const c = document.querySelector(`[data-id="${visualCue.current.id}"]`)
                if (c) {
                    DEBUG &&
                        console.log(
                            `%ccue strategy a - real bounds ${visualCue.current.relY}`,
                            Debug.Measuring,
                        )
                    const relY = c.getBoundingClientRect().top
                    correction =
                        typeof relY === 'number' && visualCue.current.relY
                            ? relY - visualCue.current.relY
                            : 0
                    visualCue.current.relY = relY
                }
            }

            if (typeof correction === 'undefined') {
                DEBUG && console.log('%ccue strategy b - virtual list', Debug.Measuring)
                correction = absCorrection
            }

            if (correction) {
                DEBUG && console.log(`%ccue scrollBy ${correction}`, Debug.Viewport)
                scrollContainerRef.current?.scrollBy?.({ top: correction })
            }
        }
    }, [createCacheItem, forceRecalculateKey, list, paddingMemo])

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - rendering

    const [renderedItems, setRenderedItems] = useState<T[]>([])

    // reference used between renders to offset content based on previous mutations
    const visualCue = useRef<{
        id: string
        proximity: number
        y?: number
        relY?: number
    }>({
        id: '',
        proximity: -1,
    })

    // defines a safe area around the vieport so elements have room to render
    // offscreen before getting into the viewrpot
    const visibleArea = useMemo((): [number, number] => {
        return [viewport[0] - viewMargin, viewport[1] + viewMargin]
    }, [viewport, viewMargin])

    // hook: ammends the visual cue used to correct scroll position when
    // elements around it are shifted
    useEffect(() => {
        visualCue.current.proximity = Number.MAX_SAFE_INTEGER
        if (scrollMagnet) {
            const hasMatch = list.find((l) => l.id === scrollMagnet)
            if (DEBUG && !hasMatch) {
                console.table(list.map((l) => l.id))
            }
            DEBUG && console.log(`%ccue match (magnet) ${hasMatch?.id}`, Debug.Measuring)
        }
        DEBUG && console.log(`%ccue elements ${list.length}`, Debug.Measuring)
        list.forEach((l) => {
            const item = cachesRef.current.get(l.id)
            if (typeof item?.y === 'undefined') {
                return false
            }
            if (scrollMagnet) {
                if (l.id === scrollMagnet) {
                    DEBUG && console.log(`%ccue cmatch (magnet) ${~~item.y}`, Debug.Measuring)
                    visualCue.current.y = item.y
                    visualCue.current.id = l.id
                }
            } else {
                const proximity = Math.abs(item.y - viewport[1])
                if (proximity < visualCue.current.proximity) {
                    visualCue.current.proximity = proximity
                    visualCue.current.y = item.y
                    visualCue.current.id = l.id
                }
            }
        })

        const c = document.querySelector(`[data-id="${visualCue.current.id}"]`)

        if (c) {
            if (scrollMagnet) {
                DEBUG && console.log(`%ccue set magnet `, Debug.Viewport)
                visualCue.current.relY = scrollContainerRef.current?.getBoundingClientRect().bottom
            } else {
                DEBUG && console.log(`%ccue set element `, Debug.Viewport)
                visualCue.current.relY = c.getBoundingClientRect().top
            }
            DEBUG &&
                console.log(
                    `%ccue set to ${visualCue.current.id} @ ${visualCue.current.relY} `,
                    Debug.Viewport,
                )
        }
    }, [list, scrollMagnet, viewport])

    const groupHeights = useMemo(() => {
        updateListIndex
        return groups.reduce((groupHeights, group) => {
            // using the ID of the first item of the group (date divider) as index
            const groupId = group[0]
            // sum of all item heights = group height
            groupHeights[groupId] = group.reduce(
                (height, id) => height + (cachesRef?.current.get(id)?.height || 0),
                0,
            )
            return groupHeights
        }, {} as { [key: string]: number })
    }, [updateListIndex, groups])

    const groupHeightsRef = useRef(groupHeights)
    groupHeightsRef.current = groupHeights

    // filters out the items to display on screen
    useEffect(() => {
        updateListIndex

        setRenderedItems((_prevRenderItems) => {
            DEBUG && console.log(`%cbuild renderItem list`, Debug.Layout)
            const renderItems = list
                .filter((l) => {
                    const item = cachesRef.current.get(l.id)
                    if (typeof item?.y === 'undefined') {
                        return false
                    }
                    if (groupIds?.includes(l.id)) {
                        const h = groupHeightsRef.current[l.id]
                        return (
                            item.y + item.maxHeight + h >= visibleArea[0] &&
                            item.y <= visibleArea[1]
                        )
                    }

                    // using maxHeight prevents jitter if an
                    // element on the edge of the threshold shrinks (then gets
                    // removed, added back, and so on...)
                    return item.y + item.maxHeight >= visibleArea[0] && item.y <= visibleArea[1]
                })
                // resolve heights from bottom -> up since the anchor mostly at the
                // bottom of the viewport
                .reverse()

            return renderItems
        })
    }, [groupIds, list, updateListIndex, visibleArea])

    // figure if all elements on screen have been rendered, only usfull to avoid
    // glitches on first layout
    useEffect(() => {
        if (isFullyMeasured || !renderedItems.length) {
            return
        }
        const m = !renderedItems.some((t) => !cachesRef.current.get(t.id)?.isMeasured)
        if (m) {
            DEBUG && console.log(`%call items in viewport fully measured`, Debug.Measuring)
            setFullyMeasured(true)
        }

        DEBUG && console.table(renderedItems.map((t) => cachesRef.current.get(t.id)))
    }, [isFullyMeasured, renderedItems])

    // - - - - - - - - - - - - - - - - - - - - - - - - autoscroll / deep links

    const scrollMagnetRef = useRef(scrollMagnet)
    scrollMagnetRef.current = scrollMagnet

    // scroll to last message mechanism
    useEffect(() => {
        DEBUG && console.log(`%ccue lastItemId ${lastItemId}`, Debug.Measuring)
        // list.length dependency to be triggered when a new message is added
        if (!scrollMagnetRef.current && lastItemId) {
            setScrollMagnet(lastItemId)
            // TODO: if new message is well below viewport we should display an
            // affordance to scroll down instead of automaticall doing so
            // e.g. const c = cachesRef.current.get(lastEventId)?.y < viewport...
        }
    }, [lastItemId])

    useEffect(() => {
        // note: `listHeight` is required as dependency
        if (!listHeight || !scrollContainerRef.current || !scrollMagnet) {
            return
        }
        const c = cachesRef.current.get(scrollMagnet)
        if (c && c.y) {
            scrollContainerRef.current.scrollTo?.({
                top: c.y,
            })
        }
        const timeout = setTimeout(() => {
            // after a short amount of (arbitrary) time we presume all rendering and
            // automatic scrolling is done and release the magnetic event.
            setScrollMagnet(undefined)
        }, 500)

        return () => {
            clearTimeout(timeout)
        }
    }, [listHeight, updateListIndex, scrollMagnet])

    // ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^

    useEffect(() => {
        if (DEBUG && isFullyMeasured) {
            console.log(`%cisFullyMeasured:${isFullyMeasured ? 'y' : 'n'}`, Debug.Measuring)
        }
    }, [isFullyMeasured])

    useEffect(() => {
        DEBUG &&
            console.log(
                `%cviewport: top:${~~viewport[0]} bottom:${~~viewport[1]} listHeight: ${listHeight}`,
                Debug.Viewport,
            )
    }, [listHeight, viewport])

    useEffect(() => {
        DEBUG && console.log(`%creferenceItem:${visualCue.current.id}`, Debug.Layout)
    }, [visualCue.current.id])

    // svg mini map
    const debugView = useDebugView<T>({
        cache: cachesRef.current,
        enabled: props.debug,
        list,
        listHeight,
        renderedItems,
        viewMargin,
        viewport,
        visibleArea,
    })

    // ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^

    return (
        <div className={styles.main}>
            <div className={styles.scrollContainer} ref={scrollContainerRef}>
                <div
                    ref={scrollContentRef}
                    className={styles.scrollContent}
                    style={{
                        pointerEvents: isScrolling ? 'none' : 'auto',
                        opacity: isFullyMeasured ? 1 : 0,
                        transition: isFullyMeasured ? 'opacity 120ms' : 'none',
                    }}
                >
                    {renderedItems.map((item, index, arr) => (
                        <VListItem
                            key={item.id}
                            cache={cachesRef}
                            id={`${item.id}`}
                            isGroup={!!groupIds?.includes(item.id)}
                            groupHeight={groupHeights[item.id]}
                            itemRenderer={props.itemRenderer}
                            itemData={item}
                            onUpdate={onItemUpdate}
                        />
                    ))}
                </div>
            </div>
            {debugView}
        </div>
    )
}
