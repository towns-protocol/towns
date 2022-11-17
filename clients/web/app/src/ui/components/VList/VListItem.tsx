import React, { MutableRefObject, useCallback, useLayoutEffect, useRef } from 'react'
import { useSize } from 'ui/hooks/useSize'
import { ItemCacheMap, ItemSize } from './VList'
import * as styles from './VList.css'

interface Props {
    children: React.ReactNode
    id: string
    cache: MutableRefObject<ItemCacheMap>
    onUpdate?: (id?: string) => void
    highlight?: boolean
}

const DEFAULT_ITEM_HEIGHT = 50

export const VListItem = (props: Props) => {
    const { id, cache, onUpdate } = props
    const ref = useRef<HTMLDivElement>(null)
    const size = useSize(ref)

    useLayoutEffect(() => {
        const cacheItem = cache.current.get(id)
        const height = size?.height
        if (cacheItem?.height === height) {
            return
        }
        if (typeof height !== 'undefined' && height >= 0) {
            cache.current.set(id, { ...(cacheItem ?? {}), height, isMeasured: true })
            onUpdate?.(id)
        }
    }, [id, cache, onUpdate, size])

    const cacheItem = cache.current.get(id)
    const y = cacheItem?.y ? cacheItem.y : 0

    return (
        <div
            ref={ref}
            data-id={id}
            className={styles.listItem}
            style={{
                top: `${y}px`,
            }}
        >
            {props.children}
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
