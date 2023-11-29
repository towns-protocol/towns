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
import { debug as debugLog } from 'debug'
import isEqual from 'lodash/isEqual'
import uniq from 'lodash/uniq'
import { isUndefined } from 'lodash'
import { useInView } from 'react-intersection-observer'
import { notUndefined } from 'ui/utils/utils'
import { scrollbarsClass } from 'ui/styles/globals/scrollcontainer.css'
import { useDevice } from 'hooks/useDevice'
import { VListDebugger } from './VListDebugger'
import { VListItem } from './VListItem'

const DEFAULT_ITEM_HEIGHT = 100
const DEFAULT_MARGIN_RATIO = 1
const RESET_DELAY_MS = 250

const info = debugLog('app:vlist')
info.color = 'gray'
const log = debugLog('app:vlist')
log.color = 'cyan'
const warn = debugLog('app:vlist')
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

    offscreenMarker?: JSX.Element

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
    containerRef?: MutableRefObject<HTMLDivElement | null>

    pointerEvents?: 'none' | 'auto'
}

export function VList<T>(props: Props<T>) {
    const {
        debug = debugLog.enabled('app:vlist'),
        estimateHeight,
        overscan = DEFAULT_MARGIN_RATIO,
        padding = 0,
        align = 'top',
        pointerEvents = 'auto',
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

    const getKeyRef = useRef(props.getItemKey)
    getKeyRef.current = props.getItemKey

    const keyList = useMemo(() => {
        const getKey = getValidRef(getKeyRef)
        const keys = list.map(getKey)
        const uniqueKeys = uniq(keys)
        if (isEqual(keys, uniqueKeys) === false) {
            warn(`generateKey() must return unique keys`)
        }
        return uniqueKeys
    }, [list])

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
                    l.push(getKeyRef.current(t))
                }
                return l
            }, []),
        [list, getItemFocusable, getKeyRef],
    )

    const itemRendererRef = useUpdatedRef(props.itemRenderer)
    const itemRenderer = useCallback(
        (item: T, measureRef?: RefObject<HTMLDivElement>, index?: number) => {
            return itemRendererRef.current(item, measureRef, index)
        },
        [itemRendererRef],
    )

    // imperative api to refresh debug view
    const debugRef = useRef<() => void>()

    const mainRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const offsetRef = useRef<HTMLDivElement>(null)

    if (props.containerRef) {
        props.containerRef.current = containerRef.current
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

    // ------------------------------------------------------------- cache setup

    const fillCacheItems = useCallback(
        (items: T[], itemCache: ItemCacheMap) => {
            items.reduce((y, item, index) => {
                const key = getKeyRef.current(item)
                const height = estimateHeight?.(item) ?? DEFAULT_ITEM_HEIGHT
                if (key in itemCache === false) {
                    itemCache[key] = createCacheItem({ key, y, height, index })
                }
                const cacheItem = itemCache[key]
                return !isUndefined(cacheItem) ? y + cacheItem.height : y
            }, padding)
        },
        [estimateHeight, padding],
    )

    const itemCache = useRef<ItemCacheMap>({})

    useLayoutEffect(() => {
        info(`checkCache(${list.length})`)
        fillCacheItems(list, itemCache.current)
    }, [fillCacheItems, list])

    // ---------------------------------------------------------------- viewport

    const viewportHeightRef = useRef(0)

    const getScrollY = useEvent(() => {
        if (!containerRef.current) {
            return 0
        }

        const vh = viewportHeightRef.current

        const focusedItem = focusItemRef.current?.key
            ? itemCache.current[focusItemRef.current.key]
            : undefined

        const focus = focusItemRef.current

        if (focus && focusedItem) {
            const y = focus?.align === 'end' ? focusedItem.y + focusedItem.height : focusedItem.y
            return y + (focus?.align === 'end' ? padding - vh : 0)
        }

        return containerRef.current.scrollTop
    })

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
                (height, key) => height + (itemCache.current[key]?.height ?? 0),
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
        const offsetContent = getValidRef(offsetRef)

        const anchorDiff = anchorDiffRef.current

        anchorDiff && log(`updateDOM() - ${anchorDiff}`)

        offsetContent.style.top = `${anchorDiff}px`

        renderItems.forEach((key) => {
            const cacheItem = itemCache.current[key]
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
        const container = getValidRef(containerRef)
        const content = getValidRef(contentRef)

        internalScrollRef.current = true

        const currentHeight = Number(content.style.height.replace(/px$/, ''))

        if (contentHeightRef.current - currentHeight !== 0) {
            log(`updateDOMHeight from ${content.style.height} to ${contentHeightRef.current}`)
        }

        content.style.height = `${contentHeightRef.current}px`

        // container won't grow more than max-height defined by parent
        container.style.height = `${contentHeightRef.current}px`

        if (!viewportHeightRef.current) {
            const height = container.getBoundingClientRect().height
            log(`updateDOMHeight: container height ${height} was (${viewportHeightRef.current})`)
            viewportHeightRef.current = height
        }
    }, [])

    const [isAligned, setIsAligned] = useState(false)

    const realignImperatively = useCallback(() => {
        if (isTouchDownRef.current) {
            return
        }

        // keep offset to scrollBy() once dom is updated
        const diff = anchorDiffRef.current
        log(`realignImperatively reset scroll diff:${diff}px vh:${viewportHeightRef.current}`)

        if (isTouch) {
            setIsReadyToRealign(false)
        }

        // reset offsets and update the dom
        anchorDiffRef.current = 0

        updateDOM()
        updateDOMHeight()

        const container = getValidRef(containerRef)

        // ensures scroll event doesn't trigger a realignment
        internalScrollRef.current = true

        const safeTouchScrollTo = (s: { top: number }) => {
            // hack for mobile devices: when inertia is still active, browser
            // prevents us from detecting touch events.
            // how to get here: give a long swipe that will scroll enough to
            // trigger realignment, while intertia is still active, touch the
            // screen and keep finger down. Realignment will occur and scroll lost)
            container.style.overflow = 'hidden'
            container.scrollTo(s)
            container.style.overflow = 'scroll'
        }

        if (focusItemRef.current) {
            const top = getScrollY()
            log(`realignImperatively() - a ${top}`)
            // in the initialisation phase, we want to keep the scroll position
            // as steady as possible on the focused item (getScrollY will return
            // the focus item's position)
            if (isTouch) {
                safeTouchScrollTo({ top })
            } else {
                container.scrollTo({ top })
            }
        } else {
            log(`realignImperatively() - b`)
            if (isTouch) {
                safeTouchScrollTo({ top: container.scrollTop - diff })
            } else {
                container.scrollBy({ top: -diff })
            }
        }

        setIsAligned(true)

        debugRef.current?.()
    }, [getScrollY, isTouch, updateDOM, updateDOMHeight])

    // -------------------------------------------------------------async update

    const isTouchDownRef = useRef(false)
    const isReadyToRealignRef = useRef(false)
    useEffect(() => {
        isReadyToRealignRef.current = !!isReadyToRealign
    }, [isReadyToRealign])

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

    useEffect(() => {
        const container = getValidRef(containerRef)

        if (isTouch && container) {
            const onTouchStart = () => {
                isTouchDownRef.current = true
            }
            const onTouchEnd = () => {
                isTouchDownRef.current = false
                setIsReadyToRealign(false)
                debounceResetIdle()
            }
            container.addEventListener('touchstart', onTouchStart, { passive: false })
            container.addEventListener('touchend', onTouchEnd)
            container.addEventListener('touchcancel', onTouchEnd)

            return () => {
                container.removeEventListener('touchstart', onTouchStart)
                container.removeEventListener('touchend', onTouchEnd)
                container.removeEventListener('touchcancel', onTouchEnd)
            }
        }
    }, [debounceResetIdle, isTouch])

    /**
     * ------------------------------------------------------------------- focus
     */

    const focusItemRef = useRef<FocusOption | null>()

    // set to true when user scrolls, cancels current focus
    const [hasUserScrolled, setHasUserScrolled] = useState(false)

    const hasUserScrolledRef = useRef(hasUserScrolled)
    hasUserScrolledRef.current = hasUserScrolled

    const [offscreenFocusMarker, setOffscreenFocusMarker] = useState<string>()

    // change focus on prop change (e.g. new incoming message)
    useEffect(() => {
        if (!props.focusItem) {
            setOffscreenFocusMarker(undefined)
            return
        }

        let shouldFocus = props.focusItem.force

        if (!shouldFocus && props.focusItem.align === 'end') {
            const cy = itemCache.current[props.focusItem.key]?.y
            if (typeof cy === 'undefined') {
                return
            }
            const top = getScrollY() + viewportHeightRef.current
            const diff = Math.abs(cy - top)
            if (diff < viewportHeightRef.current * 0.5) {
                shouldFocus = true
                setOffscreenFocusMarker(undefined)
            } else {
                setOffscreenFocusMarker(props.focusItem.key)
            }
        }

        if (shouldFocus) {
            focusItemRef.current = props.focusItem
            setHasUserScrolled(false)
            realignImperatively()
        }
    }, [getScrollY, hasUserScrolledRef, props.focusItem, realignImperatively])

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

    /**
     * --------------------------------------------------- recalculate positions
     * =========================================================================
     */

    const itemsRef = useRef<T[]>(list)
    itemsRef.current = list

    const updatePositions = useEvent(() => {
        const anchorKey = anchorRef.current?.key

        log(`updatePositions() anchor: ${logKey(anchorKey)}`)

        const prevAnchorY = anchorKey ? itemCache.current[anchorKey]?.y : undefined

        const contentHeight =
            keyList.reduce(
                (y, key) => {
                    const cacheItem = itemCache.current[key]

                    if (!cacheItem) {
                        warn(`missing cache for ${logKey(key)}`)
                        return y
                    }

                    const itemHeight = cacheItem.height ?? 10

                    cacheItem.y = y
                    return Math.round(y + itemHeight)
                },
                // padding at the start
                padding,
            ) +
            // padding at the end
            padding

        if (isTouch) {
            setIsAligned(contentHeightRef.current === contentHeight)
        }

        contentHeightRef.current = contentHeight

        const cache = anchorKey ? itemCache.current[anchorKey] : undefined
        const newAnchorY = !isUndefined(cache) ? cache.y : 0
        log(`updatePositions() newAnchorY: ${newAnchorY}`)

        if (notUndefined(prevAnchorY) && notUndefined(newAnchorY)) {
            const diff = prevAnchorY - newAnchorY
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

        log(`updatePositions() contentHeight:${contentHeight}`)

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

    const prevViewportHeightRef = useRef(0)

    const updateVisibleItems = useEvent((isInternalScroll?: boolean) => {
        const vh = viewportHeightRef.current
        const scrollY = getScrollY()
        isInternalScroll = isInternalScroll || internalScrollRef.current

        info(`handleScroll() isInternalScroll:${isInternalScroll}`)

        debounceResetIdle()

        if (isIdleRef.current && !isInternalScroll) {
            setIsIdle(false)
        }

        const focus = focusItemRef.current

        const margin = -1 * vh * overscan

        const diff = anchorDiffRef.current + (vh - prevViewportHeightRef.current)
        prevViewportHeightRef.current = vh

        const a1 = margin - diff
        const a2 = vh - margin - diff

        const relativeEye =
            vh * (!focus?.align ? 1 : focus.align === 'start' ? 0 : 1) +
            (!focus?.align ? 0 : focus.align === 'start' ? margin : -margin)

        const eyeY = scrollY + relativeEye - diff

        const newItems = keyList.filter((key) => {
            const cacheItem = itemCache.current[key]

            if (!cacheItem) {
                warn(`handleScroll::skip`)
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

        if (!isInternalScroll) {
            log('not internal scroll ?')
        }

        if (!isInternalScroll || focus) {
            const key =
                focus?.key ??
                getScrollAnchor(keyList, itemCache.current, eyeY, ignoreFocusItemsRef.current)

            const anchorY = key ? itemCache.current[key]?.y : undefined
            const prevAnchor = anchorRef.current

            if (key && key !== prevAnchor?.key && typeof anchorY === 'number') {
                anchorRef.current = { key, y: anchorY }
                log(
                    `setAnchor ${
                        focus?.key ? logKey(focus.key) + focus.align : ``
                    } -- ${~~eyeY}:${~~anchorY} ${logKey(key)} (was ${prevAnchor?.key})`,
                )
            }
        }

        info(`onScroll::visibleItems ${a1} - ${a2}`)

        if (newItems.join() !== prevRenderedItemsRef.current.join()) {
            prevRenderedItemsRef.current = newItems
            setRenderItems(newItems)
        }

        debugRef.current?.()
    })

    /**
     * central mechanism to detect items to render and to keep the DOM in sync
     * - on scroll, we update the items to render via refs to keep scrolling smooth
     * - when items enters or exit the viewport, update list of items to render via state
     */
    useLayoutEffect(() => {
        const container = getValidRef(containerRef)

        log(`useLayoutEffect() internal handleScroll invoked`)

        // positions need to computed before this
        setTimeout(() => {
            updateVisibleItems(true)
        })

        let internalScrollTimeout: NodeJS.Timeout | undefined
        let prevHeight = contentHeightRef.current

        const onScroll = () => {
            const isInternalScroll = internalScrollRef.current
            const scrollY = getScrollY()

            log(`onScroll() ${~~scrollY}px ${isInternalScroll ? `(isInternalScroll)` : ``}`)

            if (isInternalScroll) {
                updateVisibleItems(true)
                if (internalScrollTimeout) {
                    clearTimeout(internalScrollTimeout)
                }

                const hasHeightChanged = prevHeight !== contentHeightRef.current
                prevHeight = contentHeightRef.current

                if (!hasHeightChanged) {
                    internalScrollTimeout = undefined
                    internalScrollRef.current = false
                }

                return
            } else {
                if (!hasUserScrolledRef.current) {
                    setHasUserScrolled(true)
                    hasUserScrolledRef.current = true
                }
                if (!isScrollingRef.current) {
                    setIsScrolling(true)
                }
                updateVisibleItems(false)
            }

            // this could be done tighter, for now just a safe check to avoid
            // scrolling past the start of the list
            const overScroll = Math.max(0, anchorDiffRef.current - scrollY)
            if (overScroll > 0 && anchorDiffRef.current > 0) {
                anchorDiffRef.current = 0
                realignImperatively()
            }
        }

        container.addEventListener('scroll', onScroll)

        return () => {
            container.removeEventListener('scroll', onScroll)
            if (internalScrollTimeout) {
                clearTimeout(internalScrollTimeout)
            }
        }
    }, [getScrollY, updateVisibleItems, realignImperatively, isScrollingRef])

    useLayoutEffect(() => {
        if (keyList) {
            updateVisibleItems(true)
        }
    }, [keyList, updateVisibleItems])

    useLayoutEffect(() => {
        if (!mainRef.current) {
            return
        }
        const resizeObserver = new ResizeObserver(() => {
            const vh = viewportHeightRef.current
            const height = mainRef.current?.getBoundingClientRect().height

            if (typeof height !== 'undefined' && vh !== height) {
                log(`resizeObserver() ${vh} -> ${height}`)
                viewportHeightRef.current = height
                anchorDiffRef.current += height - vh
                realignImperatively()
            }
        })
        resizeObserver.observe(mainRef.current)
        return () => {
            resizeObserver.disconnect()
        }
    }, [realignImperatively, updateDOMHeight, updatePositions, updateVisibleItems])

    /**
     * -------------------------------------------------------------------------- updateItems
     * ======================================================================================
     */

    const updateCacheItem = useEvent(
        (
            el: HTMLDivElement,
            heightRef: MutableRefObject<HTMLDivElement | null>,
            key: string,
            index: number,
        ) => {
            const cache = itemCache.current[key]
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
            const index = list.findIndex((i) => getKeyRef.current(i) === key)
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
        log(`resizeObserverRef reset`)

        const resizeHandler = (entries: ResizeObserverEntry[]) => {
            info(`entries resized: ${entries.length})`)

            entries.forEach((entry) => {
                // TODO: not sure what the best way is, storing a element:key
                // map isn't great either? perhaps renderitems only?
                const key = entry.target.getAttribute('data-lookup-key')
                const cache = itemCache.current[key ?? '']
                const itemIndex = itemsRef.current.findIndex(
                    (i) => getKeyRef.current(i) === cache?.key,
                )
                if (cache?.el) {
                    updateCacheItem(cache.el, cache.heightRef, cache.key, itemIndex)
                } else {
                    // throw new Error(`resizeHandler::item not found`)
                    warn(`esizeHandler::item not founds ${key}`)
                }
            })

            if (offsetRef.current) {
                updatePositions()
            }
        }

        updatePositions()

        resizeObserverRef.current = new ResizeObserver(resizeHandler)
        return () => {
            resizeObserverRef.current?.disconnect()
        }
    }, [updateCacheItem, updatePositions])

    /**
     * ------------------------------------------------------------------ render
     * =========================================================================
     */

    const [isMeasuredOnce, setIsMeasuredOnce] = useState(false)

    useEffect(() => {
        if (!isMeasuredOnce) {
            const isMeasured =
                renderItems.length > 0 &&
                !renderItems.some((c) => !itemCache.current[c]?.metadata.isMeasured)
            if (isMeasured) {
                setIsMeasuredOnce(true)
            }
        }
    }, [isMeasuredOnce, renderItems])

    const computedMainStyle = useMemo(() => {
        return {
            ...mainStyle,
            justifyContent: align === 'bottom' ? 'flex-end' : 'flex-start',
        }
    }, [align])

    const computedContainerStyle = useMemo(() => {
        return {
            ...containerStyle,
            // no elastic scrolling while alignmenet is off (mobile)
            overscrollBehaviorY: isAligned ? 'contain' : 'none',
        } as const
    }, [isAligned])

    const computedOffsetStyle = useMemo(() => {
        return {
            ...offsetStyle,
            pointerEvents: isScrolling ? 'none' : pointerEvents,
        }
    }, [isScrolling, pointerEvents])

    const offscreenY = offscreenFocusMarker ? itemCache.current[offscreenFocusMarker]?.y ?? -1 : -1
    const onOffscreenMarkerClick = useCallback(() => {
        if (props.focusItem) {
            internalScrollRef.current = true
            focusItemRef.current = { ...props.focusItem, force: true }
            realignImperatively()
            setOffscreenFocusMarker(undefined)
        }
    }, [props.focusItem, realignImperatively])

    const onOffscreenMarkerCancel = useCallback(() => setOffscreenFocusMarker(undefined), [])

    const offscreen = props.offscreenMarker && offscreenY > -1 && (
        <OffscreenMarker
            offscreenY={offscreenY}
            offscreenMarker={props.offscreenMarker}
            onClick={onOffscreenMarkerClick}
            onCancel={onOffscreenMarkerCancel}
        />
    )

    return (
        <div style={computedMainStyle} data-testid="vlist-main" ref={mainRef}>
            <div
                className={scrollbarsClass}
                style={computedContainerStyle}
                ref={containerRef}
                data-testid="vlist-container"
            >
                <div
                    style={{
                        ...contentStyle,
                        opacity: isMeasuredOnce ? 1 : 0,
                    }}
                    ref={contentRef}
                    data-testid="vlist-content"
                >
                    <div style={computedOffsetStyle} ref={offsetRef} data-testid="vlist-offset">
                        {list.map((t, index) => {
                            const key = keyList[index]
                            const screenIndex = renderItems.indexOf(key)
                            return screenIndex > -1 ? (
                                <VListItem<T>
                                    key={key}
                                    uid={key}
                                    index={index}
                                    item={t}
                                    itemRenderer={itemRenderer}
                                    isGroup={!!groupIds?.includes(key)}
                                    groupHeight={groupHeights[key]}
                                    onAdded={onItemAdded}
                                    onRemoved={onItemRemoved}
                                />
                            ) : null
                        })}
                        {offscreen}
                    </div>
                </div>
            </div>
            {debug ? (
                <VListDebugger
                    itemCache={itemCache.current}
                    containerRef={containerRef}
                    contentHeightRef={contentHeightRef}
                    debugRef={debugRef}
                    generateKey={getKeyRef.current}
                    items={list}
                    pinnedItemRef={anchorRef}
                    renderItems={renderItems}
                    anchorDiffRef={anchorDiffRef}
                />
            ) : null}
        </div>
    )
}

const OffscreenMarker = (props: {
    offscreenY: number
    offscreenMarker: JSX.Element
    onClick: () => void
    onCancel: () => void
}) => {
    const { offscreenY, offscreenMarker, onClick, onCancel } = props
    const { ref, inView } = useInView()
    useEffect(() => {
        if (inView) {
            onCancel()
        }
    }, [inView, onCancel])
    return (
        <div
            style={{
                ...offscreenMarkerContainerStyle,
                height: offscreenY,
            }}
        >
            <div style={offscreenMarkerStyle} onClick={onClick}>
                {offscreenMarker}
            </div>
            <div ref={ref} />
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
) => {
    const { key } = items.reduce<{ s: number; key?: string }>(
        (match, key) => {
            const cacheItem = itemCache[key]

            if (!cacheItem || ignoreList.includes(key)) {
                return match
            }

            const y = cacheItem.y
            const s = Math.abs(y - eyeY)

            if (s < match.s) {
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
    position: 'absolute',
    height: '100%',
    display: 'flex',
    contain: 'paint',
    flexDirection: 'column',
    flexGrow: 1,
    overflow: 'hidden',
    width: '100%',
}

const containerStyle: CSSProperties = {
    position: 'relative',
    contain: 'paint',
    inset: 0,
    width: '100%',
    height: '100%',
    overflowY: 'scroll',
    overflowAnchor: 'none',
    overscrollBehaviorY: `contain`,
}

const contentStyle: CSSProperties = {
    position: 'absolute',
    contain: 'paint',
    width: '100%',
}

const offsetStyle: CSSProperties = {
    position: 'absolute',
    width: '100%',
}

const offscreenMarkerContainerStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    width: `100%`,
    display: 'flex',
    pointerEvents: 'none',
    alignItems: 'flex-end',
    justifyContent: 'center',
}

const offscreenMarkerStyle: CSSProperties = {
    position: 'sticky',
    bottom: 0,
    top: 0,
    pointerEvents: 'auto',
}

const createCacheItem = (values: Pick<ItemCache, 'key' | 'y' | 'height'> & { index: number }) => ({
    el: undefined,
    heightRef: { current: null },
    metadata: {
        isMeasured: false,
        index: values.index,
    },
    ...values,
})

const getValidRef = <T,>(v: MutableRefObject<T | null>): T => {
    if (v.current !== null) {
        return v.current
    } else {
        throw new Error(`VList::getValidRef - missing ref`)
    }
}
