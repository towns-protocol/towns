import React, {
    RefObject,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { useViewport } from './hooks/useViewport'
import * as styles from './VList.css'
import { useDebugView } from './VListDebugView'
import { VListItem, useInitCacheItem as useDefaultItemSettings } from './VListItem'

const DEBUG = false
const DEFAULT_VIEW_MARGIN = 400
const PADDING = 16

interface Props<T> {
    list: T[]
    highlightId?: string
    itemRenderer: (data: T, ref?: RefObject<HTMLElement>) => JSX.Element
    esimtateItemSize?: number | ((data: T) => number | undefined)
    viewMargin?: number
    groupIds?: string[]
    debug?: boolean
}

export type ItemSize = {
    isMeasured: boolean
    height: number
    y?: number
}

export type ItemCacheMap = Map<string, ItemSize>

const Debug = {
    TopLevel: `color:#39f`,
    Measuring: `color:#393`,
    Layout: `color:#3ac`,
    Viewport: `color:#099`,
    Critical: `color:#f50`,
    Secondary: `color:#444`,
} as const

export function VList<T extends { id: string }>(props: Props<T>) {
    const { esimtateItemSize, highlightId, groupIds, viewMargin = DEFAULT_VIEW_MARGIN } = props

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

    // useEffect(() => {
    //     console.log({ groups, groupHeights })
    // }, [groupHeights, groups])

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
        DEBUG && console.log(`%conItemUpdate ${id}`, Debug.Secondary)
        setForceRecalculateKey((k) => ++k)
    }, [])

    useLayoutEffect(() => {
        // just need `forceRedraw` here as a dependency
        forceRecalculateKey

        // traverse all items to calclulate positions and full height
        const newHeight =
            list.reduce((height, item) => {
                const c = cachesRef.current.get(item.id) ?? createCacheItem(cachesRef, item)
                if (c) {
                    c.y = height
                }
                return height + c.height
            }, PADDING) + PADDING

        setListHeight(newHeight)

        // set physical height of the div to ensure scrollbar reflects the new height
        if (scrollContentRef.current) {
            DEBUG && console.log(`%cset container height ${Math.round(newHeight)}`, Debug.Layout)
            scrollContentRef.current.style.minHeight = `${Math.round(newHeight)}px`
        }

        // adjust scroll position if visual cue has been offset
        const referenceItemY = cachesRef.current.get(visualCue.current.id)?.y
        if (typeof referenceItemY !== 'undefined' && typeof visualCue.current.y === 'number') {
            const correction = referenceItemY - visualCue.current.y
            visualCue.current.y = referenceItemY
            if (correction) {
                scrollContainerRef.current?.scrollBy({ top: correction })
                DEBUG && console.log(`%capply scroll correction ${correction}`, Debug.Viewport)
            }
        }
    }, [forceRecalculateKey, createCacheItem, list, listHeight, viewport])

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - rendering

    const [renderedItems, setRenderedItems] = useState<T[]>([])

    // reference used between renders to offset content based on previous mutations
    const visualCue = useRef<{ id: string; proximity: number; y?: number }>({
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
    useLayoutEffect(() => {
        visualCue.current.proximity = Number.MAX_SAFE_INTEGER
        list.forEach((l) => {
            const item = cachesRef.current.get(l.id)
            if (typeof item?.y === 'undefined') {
                return false
            }
            if (scrollMagnet) {
                if (l.id === scrollMagnet) {
                    DEBUG && console.log(`%cmatch visual cue (magnet) ${~~item.y}`, Debug.Measuring)
                    visualCue.current.y = item.y
                    visualCue.current.id = l.id
                }
            } else {
                const proximity = Math.abs(item.y - viewport[1])
                if (proximity < visualCue.current.proximity && item.isMeasured) {
                    visualCue.current.proximity = proximity
                    visualCue.current.y = item.y
                    visualCue.current.id = l.id
                }
            }
        })
    }, [list, listHeight, viewport, scrollMagnet, visibleArea])

    const groupHeights = groups.reduce((groupHeights, group) => {
        groupHeights[group[0]] = group.reduce((height, id) => {
            return height + (cachesRef?.current.get(id)?.height || 0)
        }, 0)
        return groupHeights
    }, {} as { [key: string]: number })

    const groupHeightsRef = useRef(groupHeights)
    groupHeightsRef.current = groupHeights
    // filters out the items to display on screen
    useLayoutEffect(() => {
        DEBUG && console.log(`%cbuild renderItem list`, Debug.Layout)
        const renderItems = list
            .filter((l) => {
                const item = cachesRef.current.get(l.id)
                if (typeof item?.y === 'undefined') {
                    return false
                }
                if (groupIds?.includes(l.id)) {
                    // needs to be a ref
                    const h = groupHeightsRef.current[l.id]
                    return item.y + item.height + h > visibleArea[0] && item.y < visibleArea[1]
                }
                return item.y + item.height > visibleArea[0] && item.y < visibleArea[1]
            })
            // resolve heights from bottom -> up since the anchor mostly at the
            // bottom of the viewport
            .reverse()

        DEBUG && console.table(renderItems)
        setRenderedItems(renderItems)
    }, [groupIds, list, listHeight, visibleArea])

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
        } else if (DEBUG) {
            const missing = renderedItems.reduce((missing, t) => {
                if (!cachesRef.current.get(t.id)?.isMeasured) {
                    missing.push(t)
                }
                return missing
            }, [] as T[])
            console.log(`%cmissing measurements for some items`, Debug.Measuring)
            console.table(missing)
        }

        DEBUG && console.table(renderedItems.map((t) => cachesRef.current.get(t.id)))
    }, [isFullyMeasured, listHeight, renderedItems])

    // - - - - - - - - - - - - - - - - - - - - - - - - autoscroll / deep links

    const scrollMagnetRef = useRef(scrollMagnet)
    scrollMagnetRef.current = scrollMagnet

    // scroll to last message mechanism
    useEffect(() => {
        // list.length dependency to be triggered when a new message is added
        if (!scrollMagnetRef.current && lastItemId) {
            setScrollMagnet(lastItemId)
            // TODO: if new message is well below viewport we should display an
            // affordance to scroll down instead of automaticall doing so
            // e.g. const c = cachesRef.current.get(lastEventId)?.y < viewport...
        }
    }, [lastItemId])

    //
    useLayoutEffect(() => {
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
    }, [lastItemId, list, listHeight, scrollMagnet])

    // ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^

    useEffect(() => {
        if (DEBUG && isFullyMeasured) {
            console.log(`%cisFullyMeasured:${isFullyMeasured ? 'y' : 'n'}`, Debug.Measuring)
        }
    }, [isFullyMeasured])

    useEffect(() => {
        DEBUG &&
            console.log(
                `%cviewport:${~~viewport[0]} (${~~viewport[1]}) listHeight: ${~~listHeight}`,
                Debug.Viewport,
            )
    }, [listHeight, visualCue.current.id, viewport])

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
                        visibility: isFullyMeasured ? 'visible' : 'hidden',
                    }}
                >
                    {renderedItems.map((item, index, arr) => (
                        <VListItem
                            cache={cachesRef}
                            id={`${item.id}`}
                            key={item.id}
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
