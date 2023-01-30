import React from 'react'
import { Box } from '../Box/Box'
import { ItemCacheMap } from './types'

type P<T> = {
    enabled?: boolean
    listHeight: number
    visibleArea: [number, number]
    viewport: [number, number]
    cache: ItemCacheMap
    list: { id: string }[]
    renderedItems: T[]
    viewMargin: number
}

export function useDebugView<T extends { id: string }>({
    cache,
    enabled,
    list,
    listHeight,
    viewMargin,
    viewport,
    visibleArea,
    renderedItems,
}: P<T>) {
    if (!enabled) {
        return null
    }

    const WIDTH = 100

    const vw = window.innerWidth,
        vh = window.innerHeight

    const sw = WIDTH
    const sh = vh - 0
    const r = WIDTH / vw

    const scrollTop = viewport[0]
    return (
        <Box padding position="topRight" pointerEvents="none">
            <svg height={`${sh}`} width={`${sw}`} viewBox={`0 0 ${sw} ${sh}`}>
                <g transform={`translate(0,${5000 * r})`}>
                    <g transform={`translate(0,${-scrollTop * r})`}>
                        <g fill="none" stroke="#9F9" strokeWidth={1}>
                            <rect y={0} width={WIDTH} height={listHeight * r} />
                        </g>
                        {list.map(({ id }) => {
                            const c = cache.get(id)
                            const inView = renderedItems.some((r) => r.id === id)
                            return (
                                c?.y &&
                                c?.height && (
                                    <g
                                        key={id}
                                        fill={inView ? `#0f96` : c.isMeasured ? `#09f6` : `#f006`}
                                        stroke="#fff2"
                                        strokeWidth={1}
                                    >
                                        <rect
                                            y={c.y * r + 0.5}
                                            width={WIDTH}
                                            height={c.height * r - 1}
                                        />
                                    </g>
                                )
                            )
                        })}
                    </g>
                    <g fill="none" stroke="#09fc">
                        <rect
                            x={0}
                            y={-viewMargin * r}
                            width={WIDTH}
                            height={(visibleArea[1] - visibleArea[0]) * r}
                        />
                    </g>
                    <g fill="none" stroke="#0f9c" strokeWidth={2}>
                        <rect x={0} y={0} width={WIDTH} height={(viewport[1] - viewport[0]) * r} />
                    </g>
                </g>
            </svg>
        </Box>
    )
}
