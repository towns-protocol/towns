import React, {
    MutableRefObject,
    RefObject,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
} from 'react'
import { useSize } from 'ui/hooks/useSize'
import { ItemCacheMap, ItemSize } from './VList'
import * as styles from './VList.css'

interface Props<T> {
    cache: MutableRefObject<ItemCacheMap>
    groupHeight?: number
    id: string
    onUpdate?: (id?: string) => void
    itemRenderer: (data: T, ref?: RefObject<HTMLElement>) => JSX.Element
    itemData: T
}

const DEFAULT_ITEM_HEIGHT = 0

export const VListItem = <T,>(props: Props<T>) => {
    const { id, cache, groupHeight, onUpdate } = props
    const ref = useRef<HTMLElement>(null)
    const size = useSize(ref)?.height
    const isGroupHeader = !!groupHeight

    useLayoutEffect(() => {
        const cacheItem = cache.current.get(id)
        const height = isGroupHeader ? size : size
        if (cacheItem?.height === height && (!cacheItem || cacheItem.isMeasured)) {
            return
        }

        if (typeof height !== 'undefined') {
            cache.current.set(id, { ...(cacheItem ?? {}), height, isMeasured: true })
            onUpdate?.(id)
        }
    }, [id, cache, onUpdate, size, isGroupHeader])

    const cacheItem = cache.current.get(id)
    const y = cacheItem?.y ? cacheItem.y : 0

    const style = useMemo(() => {
        const groupStyle = isGroupHeader
            ? ({
                  minHeight: groupHeight + `px`,
                  pointerEvents: `none`,
              } as React.CSSProperties)
            : {}

        return {
            top: `${y}px`,
            ...groupStyle,
        }
    }, [isGroupHeader, groupHeight, y])

    useEffect(() => {
        if (!ref.current) {
            throw new Error(
                `VList - ref wasn't assigned via custom component (${id}) ensure the component is a valid forwardRef`,
            )
        }
    }, [id])

    return (
        <div
            ref={!isGroupHeader ? (ref as RefObject<HTMLDivElement>) : undefined}
            data-id={id}
            className={styles.listItem}
            style={style}
        >
            {props.itemRenderer(props.itemData, isGroupHeader ? ref : undefined)}
        </div>
    )
}

export const useInitCacheItem = <T extends { id: string }>(
    itemHeight: undefined | number | ((data: T) => number | undefined),
    _skipEstimate = false,
) => {
    const getItemHeight = useCallback(
        (data: T) => {
            if (typeof itemHeight === 'number') {
                return itemHeight
            } else if (typeof itemHeight === 'function') {
                const h = itemHeight(data)
                return typeof h !== 'undefined' ? h : DEFAULT_ITEM_HEIGHT
            } else {
                return DEFAULT_ITEM_HEIGHT
            }
        },
        [itemHeight],
    )

    const initItemCache = useCallback(
        (sizesRef: MutableRefObject<Map<string, ItemSize>>, data: T) => {
            const meta = {
                y: undefined,
                height: getItemHeight(data) || -1,
                isMeasured: false,
            }
            sizesRef.current.set(data.id, meta)
            return meta
        },
        [getItemHeight],
    )
    return { createCacheItem: initItemCache }
}
