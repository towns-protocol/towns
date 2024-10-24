import React, { useCallback, useEffect, useState } from 'react'
import { IntersectionOptions, useInView } from 'react-intersection-observer'

export const LazyList = <T,>(
    props: {
        items: T[]
        mapItems: (item: T, index: number, items: T[]) => JSX.Element
        pageSize?: number
    } & Pick<IntersectionOptions, 'rootMargin' | 'delay'>,
) => {
    const { items, mapItems, pageSize = 100, delay = 100, rootMargin = '250px' } = props

    const numItems = items.length
    const [limit, setLimit] = useState(pageSize)

    const onReachedEnd = useCallback(
        (inView: boolean) => {
            if (inView) {
                setLimit((max) => Math.max(pageSize, Math.min(numItems, max + pageSize * 1)))
            }
        },
        [numItems, pageSize],
    )

    useEffect(() => {
        setLimit((max) => Math.max(pageSize, Math.min(numItems, max)))
    }, [numItems, pageSize])

    const { ref } = useInView({
        onChange: onReachedEnd,
        delay,
        rootMargin,
    })

    const renderedList = items.slice(0, limit).map(mapItems)

    if (limit < numItems) {
        renderedList.push(<div key="in-view" ref={ref} />)
    }

    return renderedList
}
