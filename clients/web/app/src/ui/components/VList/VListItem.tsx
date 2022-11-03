import useResizeObserver from '@react-hook/resize-observer'
import { clsx } from 'clsx'
import React, {
    MutableRefObject,
    RefObject,
    useCallback,
    useLayoutEffect,
    useRef,
    useState,
} from 'react'
import { atoms } from 'ui/styles/atoms.css'
import { ItemCacheMap, ItemSize } from './VList'
import * as styles from './VList.css'

interface Props {
    children: React.ReactNode
    id: string
    cache: MutableRefObject<ItemCacheMap>
    onUpdate: () => void
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
        if (height && cacheItem?.height !== height && height > 0) {
            cache.current.set(id, { ...(cacheItem ?? {}), height, isMeasured: true })
            onUpdate()
        }
    }, [id, cache, onUpdate, size])

    const cacheItem = cache.current.get(id)
    const y = cacheItem?.y ? cacheItem.y : 0

    return (
        <div
            ref={ref}
            className={clsx([
                styles.vItem,
                atoms({
                    background: props.highlight ? `level3` : undefined,
                    rounded: 'xs',
                }),
            ])}
            style={{
                top: `calc(${y}px + var(--correction,0px))`,
            }}
        >
            {props.children}
        </div>
    )
}

const useSize = (target: RefObject<HTMLDivElement>) => {
    const [size, setSize] = useState<{ width: number; height: number } | undefined>()
    useLayoutEffect(() => {
        const entry = target.current
        if (entry) {
            setSize(() => {
                const bounds = entry.getBoundingClientRect()
                const width = bounds?.width
                const height = bounds?.height
                return {
                    width,
                    height,
                }
            })
        }
    }, [target])

    useResizeObserver(target, (entry) => {
        setSize((s) => {
            const { width, height } = entry.contentRect
            return {
                width: width,
                height: height,
            }
        })
    })
    return size
}

export const useItemHeight = <T extends { id: string }>(
    itemHeight: undefined | number | ((data: T) => number),
) => {
    const getItemHeight = useCallback(
        (data: T) => {
            if (typeof itemHeight === 'number') {
                return itemHeight
            } else if (typeof itemHeight === 'function') {
                return itemHeight(data)
            } else {
                return DEFAULT_ITEM_HEIGHT
            }
        },
        [itemHeight],
    )

    const initializeCacheItem = useCallback(
        (sizesRef: MutableRefObject<Map<string, ItemSize>>, data: T) => {
            const meta = {
                y: undefined,
                height: getItemHeight(data),
                isMeasured: false,
            }
            sizesRef.current.set(data.id, meta)
            return meta
        },
        [getItemHeight],
    )
    return { initItemCache: initializeCacheItem }
}
