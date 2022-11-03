import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useScrollIntoView, useViewport as useViewport } from './hooks/hooks'
import * as styles from './VList.css'
import { useDebugView } from './VListDebugView'
import { VListItem, useItemHeight } from './VListItem'

const DEBUG_VLIST = false
const DEFAULT_VIEW_MARGIN = 800
const PADDING = 16

interface Props<T> {
    list: T[]
    renderItem: (data: T) => JSX.Element
    itemHeight?: number | ((data: T) => number)
    viewMargin?: number
    debug?: boolean
    bottomAligned?: boolean
}

// todo: store keyId:{}
export type ItemSize = {
    isMeasured: boolean
    height: number
    y?: number
}

export type ItemCacheMap = Map<string, ItemSize>

export function VList<T extends { id: string }>(props: Props<T>) {
    const { itemHeight, viewMargin = DEFAULT_VIEW_MARGIN, bottomAligned = true } = props

    // create a copy of the incoming list for safety
    const list = useMemo(() => {
        return props.list.slice()
    }, [props.list])

    // accumulates the computed height of the list as elements gets rendered
    const [listHeight, setListHeight] = useState(0)

    const scrollContainerRef = useRef<HTMLDivElement>(null)

    const { hasScrolledIntoView } = useScrollIntoView(scrollContainerRef.current, listHeight)
    const { viewport, isScrolling } = useViewport(scrollContainerRef.current, hasScrolledIntoView)

    // caches the bounding box of rendered elements
    const cachesRef = useRef(new Map<string, ItemSize>())

    /**
     * callback for items to force re-computing sizes / positions
     */
    const [forceRedrawKey, setForceRedrawKey] = useState(0)
    const debounceRef = useRef<NodeJS.Timeout>()
    const onItemUpdate = useCallback(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }
        if (listHeight < viewport[1] - viewport[0]) {
            // use more undebounced renders to avoid flicker for small
            // (bottom aligned) lists
            setForceRedrawKey(Date.now())
        }
        debounceRef.current = setTimeout(() => {
            setForceRedrawKey(Date.now())
            debounceRef.current = undefined
        })
    }, [listHeight, viewport])

    /**
     * accumulated  correction of the scroll position, the value is
     * temporary and should be reset after each batch of updates
     */
    const [correction] = useState(0)

    const { initItemCache } = useItemHeight<T>(itemHeight)

    useLayoutEffect(() => {
        DEBUG_VLIST && console.log(`%c::scan list`, `color:#9c9;`)
        // just need `forceRedraw` here as a dependency
        forceRedrawKey

        if (!cachesRef.current) {
            return
        }

        let updatedReferenceItem: number | undefined = undefined

        const newListHeight = list.reduce((height, listItem) => {
            const { id } = listItem
            const cache = cachesRef.current.get(id) ?? initItemCache(cachesRef, listItem)
            return cache ? height + cache.height : height
        }, PADDING * 2)

        const fitsWithingViewport = newListHeight < viewport[1] - viewport[0]

        list.reduce((y, listItem) => {
            const c = cachesRef.current.get(listItem.id) ?? initItemCache(cachesRef, listItem)
            if (c) {
                c.y = y
                y += c.height
            }
            return y
        }, PADDING)

        const f = cachesRef.current.get(referenceItem.current.id)
        if (f) {
            updatedReferenceItem = f.y
        }

        // visual correction between current previous reference
        let newCorrection = correction
        if (
            typeof updatedReferenceItem !== 'undefined' &&
            typeof referenceItem.current.y === 'number'
        ) {
            newCorrection = Math.floor(updatedReferenceItem - referenceItem.current.y)

            referenceItem.current.y = updatedReferenceItem

            if (!fitsWithingViewport) {
                // setCorrection((c) => Math.round(c - newCorrection))
                scrollContainerRef.current?.scrollBy(0, newCorrection)
            }

            if (DEBUG_VLIST && newCorrection) {
                console.log(
                    `%c::scan done correction:${newCorrection} listHeight:${listHeight}`,
                    `color:#f69;`,
                )
            }
        }
        DEBUG_VLIST &&
            console.log(
                `%c::scan list result height: ${newListHeight} (correction: ${newCorrection})`,
                `color:#9c9;`,
            )
        setListHeight(newListHeight + newCorrection)
    }, [bottomAligned, correction, forceRedrawKey, initItemCache, list, listHeight, viewport])

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - rendering

    const [renderedItems, setRenderedItems] = useState<T[]>([])

    // reference used between renders to offset content based on previous mutations
    const referenceItem = useRef<{ id: string; proximity: number; y?: number; isFirst?: boolean }>({
        id: '',
        proximity: -1,
    })

    const visibleArea = useMemo((): [number, number] => {
        return [viewport[0] - correction - viewMargin, viewport[1] - correction + viewMargin]
    }, [viewport, correction, viewMargin])

    /**
     * Defines items to display on screen
     */
    useLayoutEffect(() => {
        DEBUG_VLIST && console.log(`%c::virtual layout`, `color:#9c9;`)
        const intersection = viewport[1] - (viewport[1] - viewport[0]) * 0.5
        referenceItem.current.proximity = Number.MAX_SAFE_INTEGER

        const rendered = list.filter((l, index, arr) => {
            const item = cachesRef.current.get(l.id)

            if (typeof item?.y === 'undefined') {
                return false
            }

            const y = item.y
            const proximity = Math.abs(y - intersection)

            if (
                correction === 0 &&
                proximity < referenceItem.current.proximity &&
                item.isMeasured
            ) {
                referenceItem.current.proximity = proximity
                referenceItem.current.y = item.y

                referenceItem.current.id = l.id
                referenceItem.current.isFirst = index === 0
            }

            if (hasScrolledIntoView) {
                return y + item.height - correction > visibleArea[0] && y < visibleArea[1]
            } else {
                return index > arr.length - 1
            }
        })

        setRenderedItems(rendered)
    }, [correction, hasScrolledIntoView, list, listHeight, viewMargin, viewport, visibleArea])

    const [hasSettled, setHasSettled] = useState(false)

    /**
     * Resets accumulated correction
     * TODO: this may not be needed for desktop but keeping it for touch-scrolling
     
    useEffect(() => {
        viewport
        if (!correction || !hasScrolledIntoView) {
            return
        }
        const timeout = setTimeout(
            () => {
                DEBUG_VLIST && console.log(`%c::correction ${correction}`, `color:#F09;`)
                const container = scrollContainerRef.current
                if (container) {
                    container.scrollBy(0, -correction)
                    setCorrection(0)
                }
            },
            hasSettled ? 100 : 0,
        )

        return () => {
            clearTimeout(timeout)
        }
    }, [correction, hasScrolledIntoView, hasSettled, viewport])
    */

    /**
     * FIXME: wish I could get rid of this but there's a glitch
     **/
    useEffect(() => {
        if (!hasSettled && hasScrolledIntoView && listHeight) {
            const timeout = setTimeout(() => {
                setHasSettled(true)
                scrollContainerRef.current?.scrollBy(0, Number.MAX_SAFE_INTEGER)
            }, 250)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [hasScrolledIntoView, hasSettled, listHeight])

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - debug

    useEffect(() => {
        DEBUG_VLIST && console.log(`%creferenceItem:${referenceItem.current.id}`, `color: #09f`)
    }, [referenceItem.current.id])

    useEffect(() => {
        DEBUG_VLIST &&
            console.log(
                `%cviewport:${~~viewport[0]} (${~~viewport[1]}) listHeight: ${~~listHeight}`,
                `color: #999`,
            )
    }, [listHeight, referenceItem.current.id, viewport])

    const debugView = useDebugView<T>({
        enabled: props.debug,
        listHeight,
        visibleArea,
        viewport,
        cache: cachesRef.current,
        list,
        viewMargin,
        renderedItems,
    })

    return (
        <div className={styles.listStyle}>
            <div className={styles.scrollContainerStyle} ref={scrollContainerRef}>
                <div
                    className={styles.containerStyle}
                    style={
                        {
                            pointerEvents: isScrolling ? 'none' : 'auto',
                            opacity: hasSettled ? 1 : 0,
                            height: listHeight + correction,
                            ['--correction']: `${correction}px`,
                        } as React.CSSProperties
                    }
                >
                    {renderedItems.map((item) => (
                        <VListItem
                            cache={cachesRef}
                            id={`${item.id}`}
                            key={item.id}
                            onUpdate={onItemUpdate}
                        >
                            {props.renderItem(item)}
                        </VListItem>
                    ))}
                </div>
            </div>
            {debugView}
        </div>
    )
}
