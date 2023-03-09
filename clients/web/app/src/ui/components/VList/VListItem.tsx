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
import { ItemCacheMap, ItemSize } from './types'
import * as styles from './VList.css'

interface Props<T> {
    cache: MutableRefObject<ItemCacheMap>
    groupHeight?: number
    isGroup: boolean
    id: string
    onUpdate?: (id?: string) => void
    itemRenderer: (data: T, ref?: RefObject<HTMLElement>) => JSX.Element
    itemData: T
}

const DEFAULT_ITEM_HEIGHT = 0

export const VListItem = <T,>(props: Props<T>) => {
    const { id, cache, groupHeight, isGroup, onUpdate } = props
    const ref = useRef<HTMLElement>(null)
    const height = useSize(ref)?.height
    const maxHeightRef = useRef(height ?? 0)

    maxHeightRef.current = Math.max(maxHeightRef.current, height ?? 0)
    const cacheItem = cache.current.get(id)
    const y = cacheItem?.y ? cacheItem.y : 0

    useLayoutEffect(() => {
        const cacheItem = cache.current.get(id)

        if (cacheItem?.height === height && (!cacheItem || cacheItem.isMeasured)) {
            return
        }

        if (typeof height !== 'undefined') {
            cache.current.set(id, {
                ...(cacheItem ?? {}),
                height,
                maxHeight: maxHeightRef.current,
                isMeasured: true,
            })
            onUpdate?.(id)
        }
    }, [cache, height, id, onUpdate, y])

    const style = useMemo(() => {
        const groupStyle = isGroup
            ? ({
                  minHeight: groupHeight + `px`,
                  pointerEvents: `none`,
              } as React.CSSProperties)
            : {}

        return {
            top: `${y}px`,
            ...groupStyle,
        }
    }, [groupHeight, isGroup, y])

    useEffect(() => {
        if (!ref.current) {
            throw new Error(
                `VList - ref wasn't assigned via custom component (${id}) ensure the component is a valid forwardRef`,
            )
        }
    }, [id])

    return (
        <div
            ref={!isGroup ? (ref as RefObject<HTMLDivElement>) : undefined}
            data-id={id}
            className={styles.listItem}
            style={style}
        >
            {props.itemRenderer(props.itemData, isGroup ? ref : undefined)}
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

    const createCacheItem = useCallback(
        (sizesRef: MutableRefObject<Map<string, ItemSize>>, data: T) => {
            const height = getItemHeight(data) || -1
            const meta: ItemSize = {
                y: undefined,
                height,
                maxHeight: height,
                isMeasured: false,
            }
            sizesRef.current.set(data.id, meta)
            return meta
        },
        [getItemHeight],
    )
    return { createCacheItem }
}
