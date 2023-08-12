import React, {
    CSSProperties,
    MutableRefObject,
    RefObject,
    useCallback,
    useDeferredValue,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react'

import { useEvent } from 'react-use-event-hook'
import isEqual from 'lodash/isEqual'
import uniq from 'lodash/uniq'
import { isUndefined } from 'lodash'
import debug from 'debug'
import { notUndefined } from 'ui/utils/utils'
import { scrollbarsClass } from 'ui/styles/globals/scrollcontainer.css'
import { useDevice } from 'hooks/useDevice'
import { VListDebugger } from './VListDebugger'
import { VListItem } from './VListItem'

const DEFAULT_ITEM_HEIGHT = 100
const DEFAULT_MARGIN_RATIO = 1
const RESET_DELAY_MS = 300

const info = debug('app:vlist')
info.color = 'gray'
info.enabled = false
const log = debug('app:vlist')
log.color = 'cyan'
log.enabled = false
const warn = debug('app:vlist')
warn.color = 'orange'

interface Props<T> {
    /**
     * the list of items to be rendered
     */
    list: T[]

    /**
     * @param item the data to be rendered
     * @param measureRef use this ref on compound elements (currently used on stickky headers)
     * @param index the index of the item in the list, for debugging
     * @returns JSX.Element no key needed
     */
    itemRenderer: (item: T, measureRef?: RefObject<HTMLDivElement>, index?: number) => JSX.Element

    align: 'top' | 'bottom'

    /**
     * returning an unique key to identify items regardless their list offset.
     **/
    getItemKey: (item: T) => string

    /**
     * if some items are invisible, return false to prevent them from being used
     * as anchor
     */
    getItemFocusable?: (item: T) => boolean

    /**
     * return an estimation of the height of the item, this will give a better
     * estimate of the scrollable height before items have been rendered
     */
    estimateHeight?: (item: T) => number | undefined

    /**
     * if specified, scrolls the item into the view
     */
    focusItem?: FocusOption

    /**
     * turns on debug mini-map
     */
    debug?: boolean

    /**
     * padding (in pixels) before first and after last item
     */
    padding?: number

    /**
     * number of screens to be rendered outside of the viewport
     */
    overscan?: number

    /**
     * list of ids starting used as boundaries for new groups
     */
    groupIds?: string[]

    /**
     * ref for the main container, used for external intersection-observer
     **/
    scrollContainerRef?: MutableRefObject<HTMLDivElement | null>
}

export function VList<T>(props: Props<T>) {
    const {
        debug,
        estimateHeight,
        overscan = DEFAULT_MARGIN_RATIO,
        padding = 0,
        align = 'top',
    } = props

    const { isTouch } = useDevice()
    const [isLazyRealign, setIsLazyRealign] = useState(0)
    const [isReadyToRealign, setIsReadyToRealign] = useState<boolean>()
    const [isIdle, setIsIdle] = useState(true)
    const isIdleRef = useUpdatedRef(isIdle)
    const [list, setList] = useState(props.list)

    // ----------------------------------------------------------- memoize props

    useEffect(() => {
        if (isIdle && props.list !== list) {
            // only pull in new content when idle, this removes a lot of friction
            log(`lazy update list`)
            setList(props.list)
        }
    }, [isIdle, list, props.list])

    const groupIds = useDeferredValue(props.groupIds)

    const getKeyRef = useUpdatedRef(props.getItemKey)
    const getKey = useCallback((item: T) => getKeyRef.current(item), [getKeyRef])

    const keyList = useMemo(() => {
        const keys = list.map(getKey)
        const uniqueKeys = uniq(keys)
        if (isEqual(keys, uniqueKeys) === false) {
            warn(`enerateKey() must return unique keys`)
        }
        return uniqueKeys
    }, [list, getKey])

    const getItemFocusableRef = useUpdatedRef(props.getItemFocusable)
    const getItemFocusable = useCallback(
        (item: T) => (!getItemFocusableRef.current ? true : getItemFocusableRef.current(item)),
        [getItemFocusableRef],
    )

    const ignoreFocusItemsRef = useRef<string[]>([])

    ignoreFocusItemsRef.current = useMemo(
        () =>
            list.reduce<string[]>((l, t) => {
                if (!getItemFocusable?.(t)) {
                    l.push(getKey(t))
                }
                return l
            }, []),
        [list, getItemFocusable, getKey],
    )

    const itemRendererRef = useUpdatedRef(props.itemRenderer)
    const itemRenderer = useCallback(
        (item: T, measureRef?: RefObject<HTMLDivElement>, index?: number) => {
            return itemRendererRef.current(item, measureRef, index)
        },
        [itemRendererRef],
    )

    const [viewport, setViewportSize] = useState<{
        width: number
        height: number
    }>({ width: 0, height: 0 })

    // imperative api to refresh debug view
    const debugRef = useRef<() => void>()

    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const scrollContentRef = useRef<HTMLDivElement>(null)
    const offsetContentRef = useRef<HTMLDivElement>(null)

    if (props.scrollContainerRef) {
        props.scrollContainerRef.current = scrollContainerRef.current
    }

    const contentHeightRef = useRef<number>(0)

    /**
     * the anchor item is used to adjust scroll position when the items in the
     * list are added, removed or resized.
     */
    const anchorRef = useRef<{ key: string; y: number }>()

    // items inside of the viewport + margins to be rendered by react
    const [renderItems, setRenderItems] = useState<string[]>([])

    const prevRenderedItemsRef = useRef<string[]>(renderItems)

    /**
     * ------------------------------------------------------------------- focus
     */

    const focusItemRef = useRef<FocusOption | null>()

    // set to true when user scrolls, cancels current focus
    const [hasUserScrolled, setHasUserScrolled] = useState(false)
    const hasUserScrolledRef = useUpdatedRef(hasUserScrolled)

    // change focus on prop change (e.g. new incoming message)
    useEffect(() => {
        if (!props.focusItem) {
            return
        }
        if (!hasUserScrolledRef.current || props.focusItem.force) {
            focusItemRef.current = props.focusItem
            setHasUserScrolled(false)
        }
    }, [hasUserScrolledRef, props.focusItem])

    /**
     * discard focus when user scrolls
     */
    useEffect(() => {
        log(`hasScrolled: ${hasUserScrolled}`)
        if (hasUserScrolled) {
            log(`setFocus: null`)
            focusItemRef.current = null
        }
    }, [hasUserScrolled])

    // ------------------------------------------------------------- convenience

    const getElements = useCallback(() => {
        const scrollContainer = scrollContainerRef.current
        const scrollContent = scrollContentRef.current
        const offsetContent = offsetContentRef.current
        if (!scrollContainer || !scrollContent || !offsetContent) {
            throw new Error('VList::getElements() - missing elements')
        }
        return { container: scrollContainer, content: scrollContent, offsetContent }
    }, [])

    // ------------------------------------------------------------- cache setup

    const isValidCache = useCallback(
        (cacheItem: ItemCache | undefined): cacheItem is ValidItemCache => {
            return !isUndefined(cacheItem) &&
                !isUndefined(cacheItem.el) &&
                typeof cacheItem.height === 'number' &&
                typeof cacheItem.y === 'number'
                ? true
                : false
        },
        [],
    )

    type ValidItemCache = ItemCache & { el: HTMLDivElement }

    const createCacheItem = useCallback(
        (values: Pick<ItemCache, 'key' | 'y' | 'height'> & { index: number }) => ({
            el: undefined,
            heightRef: { current: null },
            metadata: {
                isMeasured: false,
                index: values.index,
            },
            ...values,
        }),
        [],
    )

    const fillCacheItems = useCallback(
        (items: T[], itemCache: ItemCacheMap) => {
            items.reduce((y, item, index) => {
                const key = getKey(item)
                const height = estimateHeight?.(item) ?? DEFAULT_ITEM_HEIGHT
                if (key in itemCache === false) {
                    itemCache[key] = createCacheItem({ key, y, height, index })
                }
                const cacheItem = itemCache[key]
                return !isUndefined(cacheItem) ? y + cacheItem.height : y
            }, padding)
        },
        [createCacheItem, estimateHeight, getKey, padding],
    )

    const [itemCache] = useState(() => {
        info(`initialiseCache(${list.length})`)
        const itemCache: ItemCacheMap = {}
        fillCacheItems(list, itemCache)
        return itemCache
    })

    useLayoutEffect(() => {
        info(`checkCache(${list.length})`)
        fillCacheItems(list, itemCache)
    }, [fillCacheItems, itemCache, list])

    // ---------------------------------------------------------------- viewport

    useLayoutEffect(() => {
        const { container } = getElements()

        const observer = new ResizeObserver((e) => {
            const event = e[0]
            if (event) {
                const { width, height } = container.getBoundingClientRect()
                setViewportSize({ width, height })
            }
        })

        observer.observe(container)

        return () => {
            observer.disconnect()
        }
    }, [getElements])

    const getScrollY = useCallback(() => {
        if (!scrollContainerRef.current) {
            return 0
        }

        const focusedItem = focusItemRef.current?.key
            ? itemCache[focusItemRef.current.key]
            : undefined

        const focus = focusItemRef.current

        if (focus && focusedItem) {
            info(`getScrollTop() -  ${focus.key}`)
            const y = focus?.align === 'end' ? focusedItem.y + focusedItem.height : focusedItem.y
            return y + (focus?.align === 'end' ? padding - viewport.height : 0)
        }

        return scrollContainerRef.current.scrollTop
    }, [itemCache, padding, viewport.height])

    // ------------------------------------------------------------------- groups

    const groups = useMemo(() => {
        const groups = keyList.reduce((groups, key) => {
            if (groupIds?.includes(key)) {
                groups.push([])
            }
            if (groups.length) {
                groups[groups.length - 1].push(key)
            }
            return groups
        }, [] as string[][])

        return groups
    }, [groupIds, keyList])

    const groupHeights = useMemo(() => {
        renderItems
        return groups.reduce((groupHeights, group) => {
            // using the ID of the first item of the group (date divider) as index
            const groupId = group[0]
            // sum of all item heights = group height
            groupHeights[groupId] = group.reduce(
                (height, key) => height + (itemCache[key]?.height ?? 0),
                0,
            )
            return groupHeights
        }, {} as { [key: string]: number })
    }, [groups, itemCache, renderItems])

    const groupHeightsRef = useRef(groupHeights)
    groupHeightsRef.current = groupHeights

    /**
     * -------------------------------------------------------------- update DOM
     * =========================================================================
     */

    const anchorDiffRef = useRef(0)
    const internalScrollRef = useRef(false)

    /**
     * updates positions on screen
     */
    const updateDOM = useEvent(() => {
        const { offsetContent } = getElements()

        const referenceDiff = anchorDiffRef.current
        log(`updateDOM() - ${referenceDiff}`)

        offsetContent.style.top = `${referenceDiff}px`

        renderItems.forEach((key) => {
            const cacheItem = itemCache[key]
            if (cacheItem?.el) {
                cacheItem.el.style.top = `${cacheItem.y}px`
            }
        })
    })

    /**
     * updating scroll content height needs to be done separately (and deffered)
     * from the DOM update since it can affect the scroll position
     */
    const updateDOMHeight = useCallback(() => {
        const { content } = getElements()
        internalScrollRef.current = true
        content.style.height = `${contentHeightRef.current}px`
    }, [getElements])

    const realignImperatively = useCallback(() => {
        setIsReadyToRealign(false)
        // keep offset to scrollBy() once dom is updated
        const diff = anchorDiffRef.current
        log(`reset scroll diff:${diff}px`)

        // reset offsets and update the dom
        anchorDiffRef.current = 0

        updateDOM()
        updateDOMHeight()

        const { container } = getElements()

        // ensures scroll event doesn't trigger a realignment
        internalScrollRef.current = true

        if (focusItemRef.current) {
            // in the initialisation phase, we want to keep the scroll position
            // as steady as possible on the focused item (getScrollY will return
            // the focus item's position)
            container.scrollTo({ top: getScrollY() })
        } else {
            // otherwise offset the current position
            container.scrollBy({ top: -diff })
        }

        debugRef.current?.()
    }, [getElements, getScrollY, updateDOM, updateDOMHeight])

    // -------------------------------------------------------------async update

    useLayoutEffect(() => {
        if (isReadyToRealign === false) {
            return
        }
        realignImperatively()
    }, [isReadyToRealign, realignImperatively])

    const idleDebounceRef = useRef(false)

    useEffect(() => {
        // dependency
        isLazyRealign
        const timeout = setTimeout(() => {
            idleDebounceRef.current = false
            setIsReadyToRealign(true)
            setIsIdle(true)
        }, RESET_DELAY_MS)
        return () => {
            clearTimeout(timeout)
        }
    }, [isIdleRef, isLazyRealign])

    const debounceResetIdle = useCallback(() => {
        idleDebounceRef.current = true
        setIsLazyRealign((v) => v + 1)
    }, [])

    /**
     * --------------------------------------------------- recalculate positions
     * =========================================================================
     */

    const itemsRef = useRef<T[]>(list)

    const updatePositions = useEvent(() => {
        const anchorKey = anchorRef.current?.key

        log(`updatePositions()`)

        const prevAnchorKey = anchorKey ? itemCache[anchorKey]?.y : undefined

        const contentHeight =
            keyList.reduce(
                (y, key) => {
                    const cacheItem = itemCache[key]

                    if (!cacheItem) {
                        warn(`missing cache for ${logKey(key)}`)
                        return y
                    }

                    const itemHeight = cacheItem.height ?? 10

                    cacheItem.y = y
                    return y + itemHeight
                },
                // padding at the start
                padding,
            ) +
            // padding at the end
            padding

        contentHeightRef.current = contentHeight

        const cache = anchorKey ? itemCache[anchorKey] : undefined
        const newAnchorY = !isUndefined(cache) ? cache.y : 0

        if (notUndefined(prevAnchorKey) && notUndefined(newAnchorY)) {
            const diff = prevAnchorKey - newAnchorY
            anchorDiffRef.current += diff

            if (isTouch) {
                // debounce realignment until idle on touch
                debounceResetIdle()
            } else {
                // on desktop we are allowed to offset as we scroll
                realignImperatively()
            }
        }

        if (!hasUserScrolledRef.current) {
            realignImperatively()
        }

        log(`updatePositions() contentHeight:${~~contentHeight}`)

        updateDOM()
        debugRef.current?.()
    })

    /**
     * ------------------------------------------------------------------- scroll
     * ==========================================================================
     */

    const [isScrolling, setIsScrolling] = useState(false)
    const isScrollingRef = useUpdatedRef(isScrolling)

    useEffect(() => {
        if (isScrolling) {
            const timeout = setTimeout(() => {
                setIsScrolling(false)
            }, 1000)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [isScrolling])

    /**
     * central mechanism to detect items to render and to keep the DOM in sync
     * - on scroll, we update the items to render via refs to keep scrolling smooth
     * - when items enters or exit the viewport, update list of items to render via state
     */
    useLayoutEffect(() => {
        const container = scrollContainerRef.current

        if (!container || !viewport) {
            throw new Error('VList - Missing container or viewport')
        }

        itemsRef.current = list

        const handleScroll = (scrollY: number, isInternalScroll?: boolean) => {
            isInternalScroll = isInternalScroll || internalScrollRef.current

            info(`handleScroll() silent:${isInternalScroll}`)

            debounceResetIdle()

            if (isIdleRef.current && !isInternalScroll) {
                setIsIdle(false)
            }

            const margin = -1 * viewport.height * overscan

            const diff = anchorDiffRef.current

            const a1 = margin - diff
            const a2 = viewport.height - margin - diff

            const newItems = keyList.filter((key) => {
                const cacheItem = itemCache[key]

                if (!cacheItem) {
                    warn(`andleScroll::skip`)
                    return
                }

                const { y, height: itemHeight } = cacheItem

                // for groups we look at the sum of the heights of al included
                // items to determine if the sticky header is visible or not
                const height = groupIds?.includes(key) ? groupHeightsRef.current[key] : itemHeight

                const p1 = y - scrollY
                const p2 = p1 + height

                const isIntersecting = a2 >= p1 && p2 >= a1

                return isIntersecting
            })

            const focus = focusItemRef.current

            if (!isInternalScroll || focus) {
                const relativeEye = focus?.align !== 'start' ? viewport.height : 0
                const eyeY = scrollY + relativeEye - diff

                const key =
                    focus?.key ??
                    getScrollAnchor(keyList, itemCache, eyeY, ignoreFocusItemsRef.current)

                const anchorY = key ? itemCache[key]?.y : undefined
                const prevAnchor = anchorRef.current

                if (key && key !== prevAnchor?.key && typeof anchorY === 'number') {
                    anchorRef.current = { key, y: anchorY }
                    log(`setAnchor ${logKey(key)}`)
                }
            }

            info(`onScroll::visibleItems ${a1} - ${a2}`)

            if (newItems.join() !== prevRenderedItemsRef.current.join()) {
                prevRenderedItemsRef.current = newItems
                setRenderItems(newItems)
            }
            debugRef.current?.()
        }

        log(`useLayoutEffect() internal handleScroll invoked`)

        // positions need to computed before this
        setTimeout(() => {
            handleScroll(getScrollY(), true)
        })

        let internalScrollTimeout: NodeJS.Timeout | undefined
        let prevHeight = contentHeightRef.current

        const onScroll = () => {
            const isInternalScroll = internalScrollRef.current
            const scrollY = getScrollY()

            log(`onScroll() ${~~scrollY}px ${isInternalScroll ? `(isInternalScroll)` : ``}`)

            if (isInternalScroll) {
                handleScroll(scrollY, true)
                if (internalScrollTimeout) {
                    clearTimeout(internalScrollTimeout)
                }

                const hasHeightChanged = prevHeight !== contentHeightRef.current
                prevHeight = contentHeightRef.current

                if (!hasHeightChanged) {
                    internalScrollTimeout = undefined
                    internalScrollRef.current = false
                } else {
                    // (unharmful) scroll caused by resizing seems to be postponed
                    // one frame. this happens on startup and gets interpreted as a
                    // user-triggered scroll. action which in its turn turns off
                    // scroll focus. to prevent this, keep scroll events muted for a
                    // short period of time.
                    internalScrollTimeout = setTimeout(() => {
                        internalScrollTimeout = undefined
                        internalScrollRef.current = false
                    }, RESET_DELAY_MS)
                }

                return
            } else {
                if (!hasUserScrolledRef.current) {
                    setHasUserScrolled(true)
                }
                if (!isScrollingRef.current) {
                    setIsScrolling(true)
                }
                handleScroll(scrollY, false)
            }

            // this could be done tighter, for now just a safe check to avoid
            // scrolling past the start of the list
            const overScroll = Math.max(0, anchorDiffRef.current - scrollY)
            if (overScroll > 0 && anchorDiffRef.current > 0) {
                anchorDiffRef.current = 0
                updateDOM()
                updateDOMHeight()
                setIsReadyToRealign(true)
            }
        }

        container.addEventListener('scroll', onScroll)

        return () => {
            container.removeEventListener('scroll', onScroll)
            if (internalScrollTimeout) {
                clearTimeout(internalScrollTimeout)
            }
        }
    }, [
        debounceResetIdle,
        getKey,
        getScrollY,
        groupIds,
        hasUserScrolled,
        hasUserScrolledRef,
        isIdleRef,
        isScrollingRef,
        isTouch,
        itemCache,
        keyList,
        list,
        overscan,
        updateDOM,
        updateDOMHeight,
        viewport,
    ])

    /**
     * -------------------------------------------------------------------------- updateItems
     * ======================================================================================
     */

    const updateCacheItem = useCallback(
        (
            el: HTMLDivElement,
            heightRef: MutableRefObject<HTMLDivElement | null>,
            key: string,
            index: number,
        ) => {
            const cache = itemCache[key]
            const height = heightRef.current?.getBoundingClientRect()?.height ?? 0

            info(`updateItem ${index}:${logKey(key)}, (${~~height}px)`)

            if (!isUndefined(cache)) {
                cache.el = el
                cache.heightRef = heightRef
                cache.height = height
                cache.metadata.isMeasured = true
                cache.metadata.index = index
            } else {
                throw new Error("vlist::updateCacheItem - can't find cache item")
            }
        },
        [itemCache],
    )

    const onItemAdded = useEvent(
        (ref: RefObject<HTMLDivElement>, heightRef: RefObject<HTMLDivElement>, key: string) => {
            if (!resizeObserverRef.current || !ref.current || !heightRef.current) {
                log(`onItemAdded - missing refs`)
                return
            }
            resizeObserverRef.current.observe(heightRef.current)
            heightRef.current.setAttribute('data-lookup-key', key)

            info(`onItemAdded ${key}`)
            const index = list.findIndex((i) => getKey(i) === key)
            updateCacheItem(ref.current, heightRef, key, index)
        },
    )

    const onItemRemoved = useCallback(
        (ref: RefObject<HTMLDivElement>, heightRef: RefObject<HTMLDivElement>, key: string) => {
            if (!resizeObserverRef.current || !ref.current || !heightRef.current) {
                return
            }
            info(`onItemRemoved ${key}`)
            resizeObserverRef.current?.unobserve(heightRef.current)
        },
        [],
    )

    /**
     * a single resize observer keeping track on all items currently rendered
     */
    const resizeObserverRef = useRef<ResizeObserver>()

    useLayoutEffect(() => {
        // make sure this isn't reset often
        log(`:resizeObserverRef reset`)

        const resizeHandler = (entries: ResizeObserverEntry[]) => {
            info(`entries resized: ${entries.length})`)

            entries.forEach((entry) => {
                // TODO: not sure what the best way is, storing a element:key
                // map isn't great either? perhaps renderitems only?
                const key = entry.target.getAttribute('data-lookup-key')
                const cache = itemCache[key ?? '']
                const itemIndex = itemsRef.current.findIndex((i) => getKey(i) === cache?.key)
                if (cache?.el) {
                    updateCacheItem(cache.el, cache.heightRef, cache.key, itemIndex)
                } else {
                    // throw new Error(`resizeHandler::item not found`)
                    warn(`esizeHandler::item not founds ${key}`)
                }
            })
            updatePositions()
        }

        updatePositions()

        resizeObserverRef.current = new ResizeObserver(resizeHandler)
        return () => {
            resizeObserverRef.current?.disconnect()
        }
    }, [getKey, isValidCache, itemCache, updateCacheItem, updatePositions])

    /**
     * ------------------------------------------------------------------ render
     * =========================================================================
     */

    const [isMeasuredOnce, setIsMeasuredOnce] = useState(false)

    useEffect(() => {
        if (!isMeasuredOnce) {
            const isMeasured =
                renderItems.length > 0 &&
                !renderItems.some((c) => !itemCache[c]?.metadata.isMeasured)
            if (isMeasured) {
                setIsMeasuredOnce(true)
            }
        }
    }, [isMeasuredOnce, itemCache, renderItems])

    const computedMainStyle = useMemo(() => {
        return {
            ...mainStyle,
            justifyContent: align === 'bottom' ? 'flex-end' : 'flex-start',
        }
    }, [align])

    return (
        <div style={computedMainStyle} data-testid="vlist-main">
            <div
                className={scrollbarsClass}
                style={{ ...containerStyle, height: contentHeightRef.current }}
                ref={scrollContainerRef}
                data-testid="vlist-container"
            >
                <div
                    style={{
                        ...contentStyle,
                        opacity: isMeasuredOnce ? 1 : 0,
                    }}
                    ref={scrollContentRef}
                    data-testid="vlist-content"
                >
                    <div
                        style={{ ...offsetStyle, pointerEvents: isScrolling ? 'none' : 'auto' }}
                        ref={offsetContentRef}
                        data-testid="vlist-offset"
                    >
                        {list.map((t, index) => {
                            const key = getKey(t)
                            const screenIndex = renderItems.indexOf(key)
                            return screenIndex > -1 ? (
                                <VListItem<T>
                                    key={key}
                                    uid={key}
                                    index={index}
                                    screenIndex={screenIndex}
                                    screenTotal={renderItems.length}
                                    item={t}
                                    itemRenderer={itemRenderer}
                                    isGroup={!!groupIds?.includes(key)}
                                    groupHeight={groupHeights[key]}
                                    onAdded={onItemAdded}
                                    onRemoved={onItemRemoved}
                                />
                            ) : null
                        })}
                    </div>
                </div>
            </div>
            {debug ? (
                <VListDebugger
                    itemCache={itemCache}
                    containerRef={scrollContainerRef}
                    containerSize={viewport}
                    contentHeightRef={contentHeightRef}
                    debugRef={debugRef}
                    generateKey={getKey}
                    items={list}
                    pinnedItemRef={anchorRef}
                    renderItems={renderItems}
                    anchorDiffRef={anchorDiffRef}
                />
            ) : null}
        </div>
    )
}

/**
 * -----------------------------------------------------------------------------
 *                                                                         Utils
 * =============================================================================
 */

/**
 * find the most suitable item to be use as anchor to reposition content offset
 * when items change size
 */
const getScrollAnchor = (
    items: string[],
    itemCache: ItemCacheMap,
    // focus position relative to the viewport
    eyeY: number,
    ignoreList: string[] = [],
    focusKey?: string,
) => {
    const { key } = items.reduce<{ s: number; key?: string }>(
        (match, key) => {
            const cacheItem = itemCache[key]

            if (!cacheItem || ignoreList.includes(key)) {
                return match
            }

            const y = cacheItem.y
            const s = Math.abs(y - eyeY)

            if (focusKey ? focusKey === key : s < match.s) {
                match.s = s
                match.key = key
            }

            return match
        },
        {
            s: Number.MAX_SAFE_INTEGER,
        },
    )

    return key
}

const useUpdatedRef = <T,>(value: T) => {
    const ref = useRef(value)
    ref.current = value
    return ref
}

const logKey = (key?: string) => {
    return key ? `${key.substring(0, 4)}` : `key-undefined`
}

/**
 * -----------------------------------------------------------------------------
 *                                                                        Styles
 * =============================================================================
 */

const mainStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    flexGrow: 1,
    overflow: 'hidden',
    width: '100%',
}

const containerStyle: CSSProperties = {
    position: 'relative',
    inset: 0,
    width: '100%',
    height: '100%',
    overflowY: 'scroll',
    overflowAnchor: 'none',
    overscrollBehaviorY: `contain`,
}

const contentStyle: CSSProperties = {
    position: 'absolute',
    width: '100%',
}

const offsetStyle: CSSProperties = {
    position: 'absolute',
    width: '100%',
}
